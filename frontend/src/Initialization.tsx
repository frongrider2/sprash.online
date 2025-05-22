import { SUI_USDT_PRICE_ID } from '@/config/index';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { useRefreshing, useRefreshTimeStamp } from '@/hooks/useRefreshing';

function Initialization() {
  usePriceFetch(SUI_USDT_PRICE_ID);
  useRefreshing();
  useRefreshTimeStamp();

  return null;
}

export default Initialization;
