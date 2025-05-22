import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useAppSelector } from '@/states/hooks';
import { revertAllRedux } from '@/states/action';
interface PriceState {
  suiUsdt: {
    previous: number;
    current: number;
    expo: number;
  };
}

const initialState: PriceState = {
  suiUsdt: {
    previous: 0,
    current: 0,
    expo: -8,
  },
};

export const PriceSlide = createSlice({
  name: 'price',
  initialState,
  extraReducers: (builder) =>
    builder.addCase(revertAllRedux, () => initialState),
  reducers: {
    setSuiUsdt: (
      state,
      action: PayloadAction<{ price: number; expo: number }>
    ) => {
      if (state.suiUsdt.previous === 0 && state.suiUsdt.current === 0) {
        state.suiUsdt.previous = action.payload.price;
        state.suiUsdt.current = action.payload.price;
      } else {
        state.suiUsdt.previous = state.suiUsdt.current;
        state.suiUsdt.current = action.payload.price;
      }

      state.suiUsdt.expo = action.payload.expo;
    },
  },
});

export default PriceSlide.reducer;

export const usePriceState = () => useAppSelector((state) => state.price);


