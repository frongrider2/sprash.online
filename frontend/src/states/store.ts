import { PredictionSlide } from '@/states/prediction/reducer';
import { PriceSlide } from '@/states/price/reducer';
import { RefreshSlide } from '@/states/refresh/reducer';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    refresh: RefreshSlide.reducer,
    price: PriceSlide.reducer,
    prediction: PredictionSlide.reducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
