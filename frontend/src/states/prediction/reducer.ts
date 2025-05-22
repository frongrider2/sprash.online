import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useAppSelector } from '@/states/hooks';
import { revertAllRedux } from '@/states/action';
interface PredictionState {
  current_round_id: string;
  genesis_lock: boolean;
  genesis_start: boolean;
  locked: boolean;
  oracle_round_id: string;
  paused: boolean;
  treasury_amount: string;
  treasury_balance: string;
  round_table_id: string;
}

const initialState: PredictionState = {
  current_round_id: '',
  genesis_lock: false,
  genesis_start: false,
  locked: false,
  oracle_round_id: '',
  paused: false,
  treasury_amount: '0',
  treasury_balance: '0',
  round_table_id: '',
};

export const PredictionSlide = createSlice({
  name: 'Prediction',
  initialState,
  extraReducers: (builder) =>
    builder.addCase(revertAllRedux, () => initialState),
  reducers: {
    setPrediction: (state, action: PayloadAction<PredictionState>) => {
      state.current_round_id = action.payload.current_round_id;
      state.genesis_lock = action.payload.genesis_lock;
      state.genesis_start = action.payload.genesis_start;
      state.locked = action.payload.locked;
      state.oracle_round_id = action.payload.oracle_round_id;
      state.paused = action.payload.paused;
      state.treasury_amount = action.payload.treasury_amount;
      state.treasury_balance = action.payload.treasury_balance;
      state.round_table_id = action.payload.round_table_id;
    },
  },
});

export const { setPrediction } = PredictionSlide.actions;
export default PredictionSlide.reducer;

export const usePredictionState = () =>
  useAppSelector((state) => state.prediction);
