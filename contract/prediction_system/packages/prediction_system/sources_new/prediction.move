/// Module: self
module prediction_system::prediction;

use prediction_system::bet::{Self, Bet};
use prediction_system::round::{Self, Round};
use pyth::i64::{Self, I64};
use pyth::price;
use pyth::price_identifier;
use pyth::price_info::{Self, PriceInfoObject};
use pyth::pyth;
use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID};
use sui::sui::SUI;
use sui::table::{Self, Table};
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use sui::types;
use sui::vec_map::{Self, VecMap};

// ===== Constants =====
const MIN_BET_AMOUNT: u64 = 1_000_000; // 0.001 SUI
const MAX_BET_AMOUNT: u64 = 100_000_000_000; // 100 SUI
const ROUND_INTERVAL: u64 = 60 * 1000; // 1 minute in seconds
const BUFFER_SECONDS: u64 = 30 * 1000; // 30 seconds buffer for oracle updates

// ===== Errors =====
const EInvalidOTW: u64 = 0;
const EInvalidGenesisState: u64 = 1;
const ELockRoundBeforeLockTime: u64 = 2;
const ELockRoundBeforeStart: u64 = 3;
const ELockRoundAfterBuffer: u64 = 4;
const EExecuteBeforeGenesis: u64 = 5;
const EEndRoundBeforeLock: u64 = 6;
const EEndRoundBeforeClose: u64 = 7;
const EEndRoundAfterBuffer: u64 = 8;
const ECalculateReward: u64 = 9;
const EClaimTreasury: u64 = 10;
const EBetTooEarlyLate: u64 = 11; // Bet is too early/late
const EBettable: u64 = 12; // Round not bettable
const EMinBetAmount: u64 = 13; // Bet amount must be greater than minBetAmount
const EMaxBetAmount: u64 = 14; // Bet amount must be less than than maxBetAmount
const EAlreadyBet: u64 = 15; // Can only bet once per round
const EReentrancy: u64 = 16; // Reentrancy detected
const EPaused: u64 = 17; // Contract is paused
const EInvalidRewardCalculation: u64 = 18; // Invalid reward calculation
const EClaimAleady: u64 = 19; // user claim reward already
const EClaimNotBet: u64 = 20; // user claim not bet
const ENotClaimable: u64 = 21; // user claim cannot claim
const ERoundAlreadyExists: u64 = 22; // round already exists
const EUserNotBet: u64 = 23; // user not bet
const EInvalidID: u64 = 24; // invalid id
const EClaimBeforeEnd: u64 = 25; // claim before start
const ENotRefundable: u64 = 26;

// ===== Structs =====
public struct Prediction has key {
    id: UID,
    rounds: Table<u64, Round>,
    current_round_id: u64,
    treasury_balance: Balance<SUI>,
    genesis_start: bool,
    genesis_lock: bool,
    oracle_round_id: u64,
    treasury_amount: u64,
    locked: bool, // Reentrancy guard
    paused: bool, // Emergency pause flag
    user_round: Table<address, vector<u64>>,
}

// ===== Events =====
public struct PREDICTION has drop {}

public struct AdminCap has key {
    id: UID,
}

public struct RoundStarted has copy, drop {
    round_id: u64,
    start_time: u64,
    lock_time: u64,
    close_time: u64,
}

public struct RoundLocked has copy, drop {
    round_id: u64,
    lock_price: I64,
    lock_oracle_round_id: u64,
}

public struct RoundEnded has copy, drop {
    round_id: u64,
    close_price: I64,
    close_oracle_round_id: u64,
    total_amount: u64,
    up_amount: u64,
    down_amount: u64,
    treasury_fee_amount: u64,
    reward_amount: u64,
}

public struct BetPlaced has copy, drop {
    round_id: u64,
    user: address,
    amount: u64,
    direction: bool,
}

public struct TreasuryClaimed has copy, drop {
    amount: u64,
    claimer: address,
}

public struct ContractPaused has copy, drop {
    paused_by: address,
}

public struct ContractUnpaused has copy, drop {
    unpaused_by: address,
}

public struct RewardClaimed has copy, drop {
    round_id: u64,
    amount: u64,
    claimer: address,
}

// ===== Functions =====
fun init(otw: PREDICTION, ctx: &mut TxContext) {
    let otw = otw;
    new_prediction(otw, ctx);

    transfer::transfer(
        AdminCap { id: object::new(ctx) },
        ctx.sender(),
    );
}

fun new_prediction(_otw: PREDICTION, ctx: &mut TxContext) {
    assert!(types::is_one_time_witness(&_otw), EInvalidOTW);
    let self = Prediction {
        id: object::new(ctx),
        rounds: table::new(ctx),
        current_round_id: 0,
        genesis_start: false,
        genesis_lock: false,
        oracle_round_id: 0,
        treasury_amount: 0,
        treasury_balance: balance::zero<SUI>(),
        locked: false,
        paused: false,
        user_round: table::new(ctx),
    };

    transfer::share_object(self);
}

public fun claim_treasury(self: &mut Prediction, _: &AdminCap, ctx: &mut TxContext) {
    check_not_paused(self);
    assert!(self.treasury_amount > 0, EClaimTreasury);
    let treasury_amount = self.treasury_amount;
    self.treasury_amount = 0;

    let treasury_coin = coin::from_balance(
        balance::split(&mut self.treasury_balance, treasury_amount),
        ctx,
    );

    let sender = tx_context::sender(ctx);
    transfer::public_transfer(treasury_coin, sender);

    event::emit(TreasuryClaimed {
        amount: treasury_amount,
        claimer: sender,
    });
}

public fun bet_up(
    self: &mut Prediction,
    round_id: u64,
    bet_amount: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    check_not_paused(self);
    assert!(!self.locked, EReentrancy);
    self.locked = true;

    let amount = coin::value(&bet_amount);
    assert!(self.current_round_id == round_id, EBetTooEarlyLate);
    assert!(self.get_bettable(clock, round_id), EBettable);
    assert!(amount >= MIN_BET_AMOUNT, EMinBetAmount);
    assert!(amount <= MAX_BET_AMOUNT, EMaxBetAmount);

    let sender = tx_context::sender(ctx);
    let round = self.get_round_mut(round_id);
    assert!(!round::has_bet(round, sender), EAlreadyBet);

    let new_bet = bet::new(amount, true);
    round::add_bet(round, sender, new_bet);

    let treasury_balance = coin::into_balance(bet_amount);
    balance::join(&mut self.treasury_balance, treasury_balance);

    event::emit(BetPlaced {
        round_id,
        user: sender,
        amount,
        direction: true,
    });

    self.locked = false;
    add_user_round(self, sender, round_id);
}

public fun bet_down(
    self: &mut Prediction,
    round_id: u64,
    bet_amount: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    check_not_paused(self);
    assert!(!self.locked, EReentrancy);
    self.locked = true;

    let amount = coin::value(&bet_amount);
    assert!(self.current_round_id == round_id, EBetTooEarlyLate);
    assert!(self.get_bettable(clock, round_id), EBettable);
    assert!(amount >= MIN_BET_AMOUNT, EMinBetAmount);
    assert!(amount <= MAX_BET_AMOUNT, EMaxBetAmount);

    let sender = tx_context::sender(ctx);
    let round = self.get_round_mut(round_id);
    assert!(!round::has_bet(round, sender), EAlreadyBet);

    let new_bet = bet::new(amount, false);
    round::add_bet(round, sender, new_bet);

    let treasury_balance = coin::into_balance(bet_amount);
    balance::join(&mut self.treasury_balance, treasury_balance);

    event::emit(BetPlaced {
        round_id,
        user: sender,
        amount,
        direction: false,
    });

    self.locked = false;
    add_user_round(self, sender, round_id);
}

public fun claim(self: &mut Prediction, round_id: u64, clock: &Clock, ctx: &mut TxContext) {
    check_not_paused(self);
    assert!(!self.locked, EReentrancy);
    self.locked = true;

    let sender = tx_context::sender(ctx);
    let round = self.get_round_mut(round_id);

    assert!(clock::timestamp_ms(clock) >= round::close_time(round), EClaimBeforeEnd);
    assert!(round::has_bet(round, sender), EUserNotBet);

    let claimable = round::is_bet_claimable(round, sender);
    let refundable = round::is_bet_refundable(round, sender);
    let oracle_called = round::oracle_called(round);

    // Get all the reward calculation data before mutable borrow
    let reward_amount_total = round::reward_amount(round);
    let reward_base_amount_total = round::reward_base_amount(round);

    let user_bet = round::get_bet_mut(round, sender);
    assert!(!bet::is_claimed(user_bet), EClaimAleady);
    let bet_amount = bet::amount(user_bet);

    let reward_amount = if (oracle_called) {
        assert!(claimable, ENotClaimable);
        (bet_amount * reward_amount_total) / reward_base_amount_total
    } else {
        assert!(refundable, ENotRefundable);
        bet_amount
    };

    bet::set_claimed(user_bet, true);

    let reward_coin = coin::from_balance(
        balance::split(&mut self.treasury_balance, reward_amount),
        ctx,
    );

    self.locked = false;
    transfer::public_transfer(reward_coin, sender);

    event::emit(RewardClaimed {
        round_id,
        amount: reward_amount,
        claimer: sender,
    });
}

public fun start_genesis(
    self: &mut Prediction,
    _admin: &AdminCap,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    check_not_paused(self);
    assert!(self.genesis_start == false, EInvalidGenesisState);
    let round_id = self.current_round_id;
    self.current_round_id = round_id + 1;

    self.start_round(_admin, clock, round_id + 1, ctx);
    self.genesis_start = true;
}

public fun lock_genesis(
    self: &mut Prediction,
    _admin: &AdminCap,
    price_info_object: &PriceInfoObject,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    check_not_paused(self);
    assert!(self.genesis_start == true, EInvalidGenesisState);
    assert!(self.genesis_lock == false, EInvalidGenesisState);

    let (price, oracle_round_id) = get_price_from_oracle(_admin, clock, price_info_object);

    let oracle_lastest_round_id = (oracle_round_id);

    let round_id = self.current_round_id;

    self.lock_round(
        _admin,
        clock,
        round_id,
        price,
        oracle_lastest_round_id,
        ctx,
    );

    self.current_round_id = round_id + 1;
    self.start_round(_admin, clock, round_id + 1, ctx);
    self.genesis_lock = true;
}

public fun execute_round(
    self: &mut Prediction,
    _admin: &AdminCap,
    price_info_object: &PriceInfoObject,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(self.genesis_start == true && self.genesis_lock == true, EExecuteBeforeGenesis);

    let (price, oracle_round_id) = get_price_from_oracle(_admin, clock, price_info_object);

    let oracle_lastest_round_id = (oracle_round_id);

    let round_id = self.current_round_id;

    // current round refer to to previous round (n-1)
    self.lock_round(
        _admin,
        clock,
        round_id,
        price,
        oracle_lastest_round_id,
        ctx,
    );
    self.end_round(
        _admin,
        clock,
        round_id - 1,
        oracle_lastest_round_id,
        price,
    );
    self.calculate_reward(round_id - 1);

    self.current_round_id = round_id + 1;
    self.start_round(_admin, clock, round_id + 1, ctx);
}

fun start_round(
    self: &mut Prediction,
    _: &AdminCap,
    clock: &Clock,
    round_id: u64,
    ctx: &mut TxContext,
) {
    let current_time = clock::timestamp_ms(clock);
    let round = round::new(
        round_id,
        current_time,
        current_time + ROUND_INTERVAL,
        current_time + (2*ROUND_INTERVAL),
        ctx,
    );

    table::add(&mut self.rounds, round_id, round);

    event::emit(RoundStarted {
        round_id,
        start_time: current_time,
        lock_time: current_time + ROUND_INTERVAL,
        close_time: current_time + (2*ROUND_INTERVAL),
    });
}

fun lock_round(
    self: &mut Prediction,
    _: &AdminCap,
    clock: &Clock,
    round_id: u64,
    price: I64,
    oracle_round_id: u64,
    _ctx: &mut TxContext,
) {
    let round = self.get_round_mut(round_id);

    assert!(round::start_time(round) != 0, ELockRoundBeforeStart);
    assert!(clock::timestamp_ms(clock) >= round::lock_time(round), ELockRoundBeforeLockTime);
    assert!(
        clock::timestamp_ms(clock) <= round::lock_time(round) + BUFFER_SECONDS,
        ELockRoundAfterBuffer,
    );

    round::set_close_time(round, clock::timestamp_ms(clock) + ROUND_INTERVAL);
    round::set_lock_price(round, price);
    round::set_lock_oracle_round_id(round, oracle_round_id);

    event::emit(RoundLocked {
        round_id,
        lock_price: price,
        lock_oracle_round_id: oracle_round_id,
    });
}

fun end_round(
    self: &mut Prediction,
    _: &AdminCap,
    clock: &Clock,
    round_id: u64,
    oracle_round_id: u64,
    price: I64,
) {
    let round = self.get_round_mut(round_id);

    assert!(round::lock_time(round) != 0, EEndRoundBeforeLock);
    assert!(clock::timestamp_ms(clock) >= round::close_time(round), EEndRoundBeforeClose);
    assert!(
        clock::timestamp_ms(clock) <= round::close_time(round) + BUFFER_SECONDS,
        EEndRoundAfterBuffer,
    );

    round::set_close_price(round, price);
    round::set_close_oracle_round_id(round, oracle_round_id);
    round::set_oracle_called(round, true);

    event::emit(RoundEnded {
        round_id,
        close_price: price,
        close_oracle_round_id: oracle_round_id,
        total_amount: round::total_amount(round),
        up_amount: round::up_amount(round),
        down_amount: round::down_amount(round),
        treasury_fee_amount: round::treasury_fee_amount(round),
        reward_amount: round::reward_amount(round),
    });
}

fun calculate_reward(self: &mut Prediction, round_id: u64) {
    let round = self.get_round_mut(round_id);
    assert!(
        round::reward_amount(round) == 0 && round::reward_base_amount(round) == 0,
        ECalculateReward,
    );

    let (reward_amount, treasury_amt) = round::calculate_rewards(round);
    self.treasury_amount = self.treasury_amount + treasury_amt;
}

fun add_user_round(self: &mut Prediction, sender: address, round_id: u64) {
    if (table::contains(&self.user_round, sender)) {
        let user_rounds = table::borrow_mut(&mut self.user_round, sender);
        vector::push_back(user_rounds, round_id);
    } else {
        let mut user_rounds = vector::empty<u64>();
        vector::push_back(&mut user_rounds, round_id);
        table::add(&mut self.user_round, sender, user_rounds);
    }
}

public fun get_price_from_oracle(
    _admin: &AdminCap,
    clock: &Clock,
    price_info_object: &PriceInfoObject,
): (I64, u64) {
    let max_age = 60;
    // Make sure the price is not older than max_age seconds
    let price_struct = pyth::get_price_no_older_than(price_info_object, clock, max_age);

    // Check the price feed ID
    let price_info = price_info::get_price_info_from_price_info_object(price_info_object);
    let price_id = price_identifier::get_bytes(&price_info::get_price_identifier(&price_info));

    // assert!(
    //     price_id!=x"50c67b3fd225db8912a424dd4baed60ffdde625ed2feaaf283724f9608fea266",
    //     EInvalidID,
    // );

    let price = (price::get_price(&price_struct));
    let timestamp_sec = price::get_timestamp(&price_struct);

    (price, timestamp_sec)
}

// Emergency pause/unpause functions
public fun pause(self: &mut Prediction, _: &AdminCap, ctx: &mut TxContext) {
    self.paused = true;
    event::emit(ContractPaused {
        paused_by: tx_context::sender(ctx),
    });
}

public fun unpause(self: &mut Prediction, _: &AdminCap, ctx: &mut TxContext) {
    self.paused = false;
    event::emit(ContractUnpaused {
        unpaused_by: tx_context::sender(ctx),
    });
}

// Helper function to check if contract is paused
fun check_not_paused(self: &Prediction) {
    assert!(!self.paused, EPaused);
}

// === Vew Functions ===
public fun claimable(self: &mut Prediction, round_id: u64, user: address): bool {
    let round = self.get_round_mut(round_id);
    round::is_bet_claimable(round, user)
}

public fun refundable(self: &mut Prediction, round_id: u64, user: address): bool {
    let round = self.get_round_mut(round_id);
    round::is_bet_refundable(round, user)
}

public fun get_bettable(self: &mut Prediction, clock: &Clock, round_id: u64): bool {
    let round = self.get_round_mut(round_id);
    let timestamp = clock::timestamp_ms(clock);
    round::start_time(round) != 0 && 
    round::lock_time(round) != 0 && 
    timestamp >= round::start_time(round) && 
    timestamp < round::lock_time(round)
}

fun get_round_mut(self: &mut Prediction, round_id: u64): &mut Round {
    assert!(table::contains(&self.rounds, round_id), EExecuteBeforeGenesis);
    table::borrow_mut(&mut self.rounds, round_id)
}

public fun get_round_by_id(self: &mut Prediction, round_id: u64): &Round {
    assert!(table::contains(&self.rounds, round_id), EExecuteBeforeGenesis);
    table::borrow(&self.rounds, round_id)
}

public fun get_bet_by_round_id(self: &mut Prediction, round_id: u64, user: address): &Bet {
    let round = self.get_round_by_id(round_id);
    round::get_bet(round, user)
}

public fun get_current_round_id(self: &mut Prediction): u64 {
    self.current_round_id
}

// === Test Functions ===
#[test_only]
public fun new_otw(_ctx: &mut TxContext): PREDICTION {
    PREDICTION {}
}

#[test_only]
public fun issue_admin_cap(ctx: &mut TxContext) {
    transfer::transfer(
        AdminCap { id: object::new(ctx) },
        ctx.sender(),
    );
}
