#[test_only]
module prediction_system::prediction_system_tests;

use prediction_system::prediction::{Self, AdminCap, get_round};
use std::debug;
use sui::clock;
use sui::coin;
use sui::sui::SUI;
use sui::test_scenario;

const ROUND_INTERVAL: u64 = 300 * 1000; // 5 minutes in seconds
const BUFFER_SECONDS: u64 = 30 * 1000; // 30 seconds buffer for oracle updates

const TIME_NOW: u64 = 1747218497;

#[test]
fun test_init() {
    let creater: address = @0xCa;

    let mut scenario = test_scenario::begin(creater);
    {
        let otw = prediction::new_otw(scenario.ctx());
        prediction::new_prediction_system(otw, scenario.ctx());
        prediction::issue_admin_cap(scenario.ctx())
    };

    scenario.end();
}

#[test]
fun test_genesis() {
    let admin: address = @0xCa;

    let trader1: address = @0xBb;
    let trader2: address = @0xCc;
    let mut scenario = test_scenario::begin(admin);
    {
        let otw = prediction::new_otw(scenario.ctx());
        prediction::new_prediction_system(otw, scenario.ctx());
        prediction::issue_admin_cap(scenario.ctx())
    };

    // start genesis
    scenario.next_tx(admin);
    {
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        clock::set_for_testing(&mut test_clock, TIME_NOW);

        let admin_cap = scenario.take_from_sender<AdminCap>();
        let mut prediction_system = scenario.take_shared<prediction::PredictionSystem>();

        prediction::start_genesis(&mut prediction_system, &admin_cap, &test_clock, scenario.ctx());

        let round = prediction::get_round(&mut prediction_system, 1);

        debug::print(&b"---get round start time---".to_string()); //10000
        debug::print(&round.get_round_start_time());

        debug::print(&b"---get round lock time---".to_string()); // 310000
        debug::print(&round.get_round_lock_time());

        debug::print(&b"---get round close time---".to_string()); // 310000
        debug::print(&round.get_round_close_time());

        test_scenario::return_shared(prediction_system);
        test_clock.destroy_for_testing();
        scenario.return_to_sender(admin_cap);
    };

    // bet up 1 sui
    scenario.next_tx(trader1);
    {
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        clock::set_for_testing(&mut test_clock, TIME_NOW+1);
        // print current time
        let mut prediction_system = scenario.take_shared<prediction::PredictionSystem>();

        let bet_coin = coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx());
        prediction::bet_up(&mut prediction_system, 1, bet_coin, &test_clock, scenario.ctx());

        test_scenario::return_shared(prediction_system);
        test_clock.destroy_for_testing();
    };

    // bet down 1 sui
    scenario.next_tx(trader2);
    {
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        clock::set_for_testing(&mut test_clock, TIME_NOW+2);
        // print current time
        let mut prediction_system = scenario.take_shared<prediction::PredictionSystem>();

        let bet_coin = coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx());
        prediction::bet_down(&mut prediction_system, 1, bet_coin, &test_clock, scenario.ctx());

        test_scenario::return_shared(prediction_system);
        test_clock.destroy_for_testing();
    };

    // lock genesis
    scenario.next_tx(admin);
    {
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        clock::set_for_testing(&mut test_clock, TIME_NOW+ROUND_INTERVAL);

        let admin_cap = scenario.take_from_sender<AdminCap>();
        let mut prediction_system = scenario.take_shared<prediction::PredictionSystem>();

        debug::print(&b"---current round before lock---".to_string());
        debug::print(&prediction_system.get_current_round_id());

        prediction::lock_genesis(&mut prediction_system, &admin_cap, &test_clock, scenario.ctx());

        test_scenario::return_shared(prediction_system);
        test_clock.destroy_for_testing();
        scenario.return_to_sender(admin_cap);
    };

    scenario.next_tx(admin);
    {
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        clock::set_for_testing(&mut test_clock, TIME_NOW+(2*ROUND_INTERVAL));

        let admin_cap = scenario.take_from_sender<AdminCap>();
        let mut prediction_system = scenario.take_shared<prediction::PredictionSystem>();

        prediction::execute_round(&mut prediction_system, &admin_cap, &test_clock, scenario.ctx());

        test_scenario::return_shared(prediction_system);
        test_clock.destroy_for_testing();
        scenario.return_to_sender(admin_cap);
    };

    scenario.next_tx(trader1);
    {
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        clock::set_for_testing(&mut test_clock, TIME_NOW+(2*ROUND_INTERVAL)+20);

        let mut prediction_system = scenario.take_shared<prediction::PredictionSystem>();

        let round1 = prediction::get_round(&mut prediction_system, 1);

        debug::print(&b"---round1 lock price---".to_string());
        debug::print(&round1.get_round_lock_price());

        debug::print(&b"---round1 lock price---".to_string());
        debug::print(&round1.get_round_close_price());

        let is_win = prediction::claimable(&mut prediction_system, 1, trader1);

        if (is_win) {
            let coin = prediction::claim(&mut prediction_system, 1, scenario.ctx());

            debug::print(&b"---trader1 claim coin---".to_string());
            debug::print(&coin.value());

            scenario.return_to_sender(coin);
        };
        test_scenario::return_shared(prediction_system);
        test_clock.destroy_for_testing();
    };

    scenario.next_tx(trader2);
    {
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        clock::set_for_testing(&mut test_clock, TIME_NOW+(2*ROUND_INTERVAL)+20);

        let mut prediction_system = scenario.take_shared<prediction::PredictionSystem>();

        let is_win = prediction::claimable(&mut prediction_system, 1, trader1);

        if (is_win) {
            let coin = prediction::claim(&mut prediction_system, 1, scenario.ctx());

            debug::print(&b"---trader2 claim coin---".to_string());
            debug::print(&coin.value());

            scenario.return_to_sender(coin);
        };
        test_scenario::return_shared(prediction_system);
        test_clock.destroy_for_testing();
    };
    scenario.end();
}
