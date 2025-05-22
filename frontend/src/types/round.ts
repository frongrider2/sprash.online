export interface RoundInterface {
  id: Id;
  name: string;
  value: Value;
}

interface Value {
  type: string;
  fields: Fields3;
}

interface Fields3 {
  bets: Bets;
  close_oracle_round_id: string;
  close_price: Closeprice;
  close_time: string;
  down_amount: string;
  id: Id;
  lock_oracle_round_id: string;
  lock_price: Closeprice;
  lock_time: string;
  oracle_called: boolean;
  reward_amount: string;
  reward_base_amount: string;
  round_id: string;
  start_time: string;
  total_amount: string;
  treasury_fee: string;
  treasury_fee_amount: string;
  up_amount: string;
}

interface Closeprice {
  type: string;
  fields: Fields2;
}

interface Fields2 {
  magnitude: string;
  negative: boolean;
}

interface Bets {
  type: string;
  fields: Fields;
}

interface Fields {
  contents: any[];
}

interface Id {
  id: string;
}

export interface RoundPassInterface {
  roundId: string;
  type: string;
  close_oracle_round_id: string;
  close_price: string;
  close_time: string;
  down_amount: string;
  lock_oracle_round_id: string;
  lock_price: string;
  lock_time: string;
  oracle_called: boolean;
  reward_amount: string;
  reward_base_amount: string;
  round_id: string;
  start_time: string;
  total_amount: string;
  treasury_fee: string;
  treasury_fee_amount: string;
  up_amount: string;
  objectId: string;
}
