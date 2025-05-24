module prediction_system::bet;

public struct Bet has copy, drop, store {
    amount: u64,
    direction: bool, // true for up, false for down
    claimed: bool,
}

// === Constructor ===
public(package) fun new(amount: u64, direction: bool): Bet {
    Bet {
        amount,
        direction,
        claimed: false,
    }
}

// === Getters ===
public fun amount(self: &Bet): u64 { self.amount }

public fun is_up(self: &Bet): bool { self.direction }

public fun is_down(self: &Bet): bool { !self.direction }

public fun is_claimed(self: &Bet): bool { self.claimed }

// === Setters ===
public(package) fun set_claimed(self: &mut Bet, claimed: bool) {
    self.claimed = claimed;
}
