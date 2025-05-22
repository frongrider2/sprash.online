import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useAppSelector } from '@/states/hooks';
import { revertAllRedux } from '@/states/action';
interface RefreshState {
  counter: number;
  timeStamp: number;
}

const initialState: RefreshState = {
  counter: 0,
  timeStamp: 0,
};

export const RefreshSlide = createSlice({
  name: 'refresh',
  initialState,
  extraReducers: (builder) =>
    builder.addCase(revertAllRedux, () => initialState),
  reducers: {
    increaseRefresh: (state) => {
      state.counter++;
    },
    setTimeStamp: (state, action: PayloadAction<number>) => {
      state.timeStamp = action.payload;
    },
  },
});

export const { increaseRefresh } = RefreshSlide.actions;
export default RefreshSlide.reducer;

export const useRefreshState = () =>
  useAppSelector((state) => state.refresh.counter);

export const useTimeStampState = () => {
  return useAppSelector((state) => state.refresh.timeStamp);
};
