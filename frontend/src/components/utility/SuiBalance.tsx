import { useRefreshState } from '@/states/refresh/reducer';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';

function SuiBalance() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const [balance, setBalance] = useState<string | null>(null);
  const refresh = useRefreshState();

  useEffect(() => {
    const fetchBalance = async () => {
      if (!account?.address) return;

      const result = await suiClient.getBalance({
        owner: account.address,
      });

      setBalance(result.totalBalance); // string in MIST (1 SUI = 10^9 MIST)
    };

    fetchBalance();
  }, [account, suiClient, refresh]);

  return (
    <div>
      <p>Balance: {balance ? Number(balance) / 1e9 : ''} SUI</p>
    </div>
  );
}

export default SuiBalance;
