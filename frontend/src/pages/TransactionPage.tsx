import PredictionClaim from '@/components/prediction/PredictionClaim';
import { useNetworkVariable } from '@/config/networkConfig';
import { useRefreshState } from '@/states/refresh/reducer';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

interface Props extends SimpleComponent {}

const TransactionPageWrapper = styled.div``;

function TransactionPage(props: Props) {
  const { connectionStatus } = useCurrentWallet();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

  const predictionSystemId = useNetworkVariable('predictionSystemId');
  const packageId = useNetworkVariable('packageId');

  const [userRounds, setUserRounds] = useState<number[]>([]);
  const refresh = useRefreshState();

  async function fetchUserRounds() {
    const roundLength = await getUserRoundLength();
    if (!roundLength) return;

    const pageSize = 10;
    const totalPages = Math.ceil(roundLength / pageSize);
    const allValues = [];

    for (let page = 0; page < totalPages; page++) {
      const cursor = page * pageSize;
      const size = Math.min(pageSize, roundLength - cursor);

      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::dashboard::get_user_round`,
        arguments: [
          tx.object(predictionSystemId), // &mut Prediction
          tx.pure.address(account.address), // address
          tx.pure.u64(cursor), // cursor
          tx.pure.u64(size), // size
        ],
      });

      const result = await suiClient.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: tx,
      });

      const returnValue = result.results?.[0]?.returnValues?.[0]?.[0];

      if (returnValue) {
        const values = Array.from(returnValue).map((b: any) => Number(b));
        allValues.push(...values);
      }
    }

    const uniqueValues = [...new Set(allValues)];
    setUserRounds(uniqueValues);
  }

  async function getUserRoundLength() {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::dashboard::get_user_round_length`,
      arguments: [
        tx.object(predictionSystemId),
        tx.pure.address(account.address),
      ],
    });

    const result = await suiClient.devInspectTransactionBlock({
      sender: account.address,
      transactionBlock: tx,
    });

    const returnValue = result.results?.[0]?.returnValues?.[0]?.[0];

    // The returnValue is a Uint8Array where first byte represents the length
    // Since we're getting [1,0,0,0,0,0,0,0], this means length is 1
    const length = returnValue ? returnValue[0] : 0;

    return length;
  }

  useEffect(() => {
    if (connectionStatus !== 'connected') return;

    fetchUserRounds();
  }, [connectionStatus, refresh]);

  return (
    <TransactionPageWrapper className='flex justify-center'>
      <div className="flex flex-col gap-4">
        {userRounds.sort((a, b) => b - a).map((round) => (
          <div key={round}>
            <PredictionClaim round={round} />
          </div>
        ))}
      </div>
    </TransactionPageWrapper>
  );
}

export default TransactionPage;
