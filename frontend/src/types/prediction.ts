export interface PredictionObjectRaw {
  current_round_id: string;
  genesis_lock: boolean;
  genesis_start: boolean;
  id: Id;
  locked: boolean;
  oracle_round_id: string;
  paused: boolean;
  rounds: Rounds;
  treasury_amount: string;
  treasury_balance: string;
  user_round: Rounds;
  round_table_id: string;
}

interface Rounds {
  type: string;
  fields: Fields;
}

interface Fields {
  id: Id;
  size: string;
}

interface Id {
  id: string;
}