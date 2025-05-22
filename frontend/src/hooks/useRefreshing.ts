import { useEffect } from 'react';
import { PriceServiceConnection } from '@pythnetwork/price-service-client';
import { useAppDispatch } from '@/states/hooks';
import { RefreshSlide } from '@/states/refresh/reducer';

const PYTH_PRICE_SERVICE_URL = 'https://hermes-beta.pyth.network';

export const useRefreshing = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const refresh = async () => {
      dispatch(RefreshSlide.actions.increaseRefresh());
    };

    // Initial fetch
    refresh();

    // Set up polling every 10 seconds
    const intervalId = setInterval(refresh, 5_000);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [dispatch]);
};


export const useRefreshTimeStamp = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const refresh = async () => {
      const timestamp = Date.now();
      dispatch(RefreshSlide.actions.setTimeStamp(timestamp));
    };

    // Initial fetch
    refresh();

    // Set up polling every 10 seconds
    const intervalId = setInterval(refresh, 1_000);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [dispatch]);
};