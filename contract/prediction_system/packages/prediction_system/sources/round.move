module prediction_system::round;

use prediction_system::bet::{Self, Bet};
use pyth::i64::{Self, I64};
use sui::table::{Self, Table};

public struct Round has key,store {
    id: UID,
    round_id: u64,
    start_time: u64,
    lock_time: u64,
    lock_oracle_round_id: u64,
    close_time: u64,
    close_oracle_round_id: u64,
    lock_price: I64,
    close_price: I64,
    total_amount: u64,
    up_amount: u64,
    down_amount: u64,
    treasury_fee: u64, // 3% = 300 fee
    treasury_fee_amount: u64,
    reward_amount: u64,
    reward_base_amount: u64,
    bets: Table<address, Bet>,
    oracle_called: bool,
}

// === Constructor ===
public(package) fun new(
    round_id: u64,
    start_time: u64,
    lock_time: u64,
    close_time: u64,
    ctx: &mut sui::tx_context::TxContext,
): Round {
    Round {
        id: object::new(ctx),
        round_id,
        start_time,
        lock_time,
        close_time,
        lock_price: i64::new(0, false),
        close_price: i64::new(0, false),
        total_amount: 0,
        lock_oracle_round_id: 0,
        close_oracle_round_id: 0,
        up_amount: 0,
        down_amount: 0,
        treasury_fee: 300, // 3% fee
        treasury_fee_amount: 0,
        reward_amount: 0,
        reward_base_amount: 0,
        bets: table::new(ctx),
        oracle_called: false,
    }
}

// === Getters ===
public fun start_time(self: &Round): u64 { self.start_time }

public fun lock_time(self: &Round): u64 { self.lock_time }

public fun close_time(self: &Round): u64 { self.close_time }

public fun lock_oracle_round_id(self: &Round): u64 { self.lock_oracle_round_id }

public fun close_oracle_round_id(self: &Round): u64 { self.close_oracle_round_id }

public fun lock_price(self: &Round): u64 { self.lock_price.get_magnitude_if_positive() }

public fun close_price(self: &Round): u64 { self.close_price.get_magnitude_if_positive() }

public fun total_amount(self: &Round): u64 { self.total_amount }

public fun up_amount(self: &Round): u64 { self.up_amount }

public fun down_amount(self: &Round): u64 { self.down_amount }

public fun treasury_fee(self: &Round): u64 { self.treasury_fee }

public fun treasury_fee_amount(self: &Round): u64 { self.treasury_fee_amount }

public fun reward_amount(self: &Round): u64 { self.reward_amount }

public fun reward_base_amount(self: &Round): u64 { self.reward_base_amount }

public fun oracle_called(self: &Round): bool { self.oracle_called }

public fun round_id(self: &Round): u64 { self.round_id }

// === Setters and Mutators ===
public(package) fun set_lock_price(self: &mut Round, price: I64) {
    self.lock_price = price;
}

public(package) fun set_close_price(self: &mut Round, price: I64) {
    self.close_price = price;
}

public(package) fun set_lock_oracle_round_id(self: &mut Round, oracle_round_id: u64) {
    self.lock_oracle_round_id = oracle_round_id;
}

public(package) fun set_close_oracle_round_id(self: &mut Round, oracle_round_id: u64) {
    self.close_oracle_round_id = oracle_round_id;
}

public(package) fun set_close_time(self: &mut Round, close_time: u64) {
    self.close_time = close_time;
}

public(package) fun set_oracle_called(self: &mut Round, called: bool) {
    self.oracle_called = called;
}

public(package) fun add_bet(self: &mut Round, user: address, bet: Bet) {
    let bet_amount = bet::amount(&bet);

    table::add(&mut self.bets, user, bet);

    if (bet::is_up(&bet)) {
        self.up_amount = self.up_amount + bet_amount;
    } else {
        self.down_amount = self.down_amount + bet_amount;
    };

    self.total_amount = self.total_amount + bet_amount;
}

public fun has_bet(self: &Round, user: address): bool {
    table::contains(&self.bets, user)
}

public fun get_bet(self: &Round, user: address): &Bet {
    table::borrow(&self.bets, user)
}

public(package) fun get_bet_mut(self: &mut Round, user: address): &mut Bet {
    table::borrow_mut(&mut self.bets, user)
}

// New function to check if a bet is claimable
public fun is_bet_claimable(self: &Round, user: address): bool {
    if (!table::contains(&self.bets, user)) {
        return false;
    };

    let bet = table::borrow(&self.bets, user);

    if (bet::is_claimed(bet)) {
        return false
    };

    if (
        self.lock_price.get_magnitude_if_positive() == self.close_price.get_magnitude_if_positive()
    ) {
        return false
    };

    self.oracle_called && 
        bet::amount(bet) != 0 &&
        !bet::is_claimed(bet) &&
        ((self.close_price.get_magnitude_if_positive() > self.lock_price.get_magnitude_if_positive() && bet::is_up(bet)) || 
         (self.close_price.get_magnitude_if_positive() < self.lock_price.get_magnitude_if_positive() && bet::is_down(bet)))
}

// New function to check if a bet is refundable
public fun is_bet_refundable(self: &Round, user: address): bool {
    if (!table::contains(&self.bets, user)) {
        return false
    };

    let bet = table::borrow(&self.bets, user);

    !self.oracle_called &&
        !bet::is_claimed(bet) &&
        bet::amount(bet) != 0
}

public(package) fun calculate_rewards(self: &mut Round): (u64, u64) {
    let reward_base_cal_amount: u64;
    let treasury_amt: u64;
    let reward_amount: u64;

    if (
        self.close_price.get_magnitude_if_positive() > self.lock_price.get_magnitude_if_positive()
    ) {
        // Bull wins
        reward_base_cal_amount = self.up_amount;
        treasury_amt = (self.total_amount * self.treasury_fee) / 10000;
        reward_amount = self.total_amount - treasury_amt;
    } else if (
        self.close_price.get_magnitude_if_positive() < self.lock_price.get_magnitude_if_positive()
    ) {
        // Bear wins
        reward_base_cal_amount = self.down_amount;
        treasury_amt = (self.total_amount * self.treasury_fee) / 10000;
        reward_amount = self.total_amount - treasury_amt;
    } else {
        // House wins
        reward_base_cal_amount = 0;
        reward_amount = 0;
        treasury_amt = self.total_amount;
    };

    self.reward_base_amount = reward_base_cal_amount;
    self.reward_amount = reward_amount;
    self.treasury_fee_amount = treasury_amt;

    (reward_amount, treasury_amt)
}
