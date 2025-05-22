import { useEffect } from 'react';
import { PriceServiceConnection } from '@pythnetwork/price-service-client';
import { PriceSlide } from '@/states/price/reducer';
import { useAppDispatch } from '@/states/hooks';
import { RefreshSlide } from '@/states/refresh/reducer';

const PYTH_PRICE_SERVICE_URL = 'https://hermes-beta.pyth.network';

export const usePriceFetch = (price_id: string) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const connection = new PriceServiceConnection(PYTH_PRICE_SERVICE_URL);

    const fetchPrice = async () => {
      try {
        const priceFeeds = await connection.getLatestPriceFeeds([price_id]);
        // console.log({ priceFeeds });
        if (priceFeeds && priceFeeds.length > 0) {
          const price = priceFeeds[0].getPriceNoOlderThan(60); // Get price no older than 60 seconds

          const expo = price?.expo || -8;

          if (price) {
            const priceValue = Number(price.price) || 0;
            dispatch(
              PriceSlide.actions.setSuiUsdt({ price: priceValue, expo: expo })
            );
          }
        }
      } catch (error) {
        console.error('Error fetching SUI/USDT price:', error);
      }
    };

    // Initial fetch
    fetchPrice();

    // Set up polling every 10 seconds
    const intervalId = setInterval(fetchPrice, 10_000);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      connection.closeWebSocket();
    };
  }, [dispatch]);
};
