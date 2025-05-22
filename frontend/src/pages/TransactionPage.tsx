import { useNetworkVariable } from '@/config/networkConfig';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useEffect } from 'react';
import styled from 'styled-components';

interface Props extends SimpleComponent {}

const TransactionPageWrapper = styled.div``;

function TransactionPage(props: Props) {
  const { connectionStatus } = useCurrentWallet();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

  const predictionSystemId = useNetworkVariable('predictionSystemId');
  const packageId = useNetworkVariable('packageId');

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

    console.log({ allValues });
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
  }, [connectionStatus]);

  return (
    <TransactionPageWrapper>
      <div className=""></div>
    </TransactionPageWrapper>
  );
}

export default TransactionPage;
