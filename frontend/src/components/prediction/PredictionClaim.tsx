import styled from 'styled-components';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useEffect, useState } from 'react';
import { useNetworkVariable } from '@/config/networkConfig';
import { swalFire } from '@/utils/swalfire';

interface Props extends SimpleComponent {
  round: number;
}

const PredictionClaimWrapper = styled.div``;

function PredictionClaim(props: Props) {
  const { connectionStatus } = useCurrentWallet();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

  const predictionSystemId = useNetworkVariable('predictionSystemId');
  const packageId = useNetworkVariable('packageId');

  const [isClaim, setIsClaim] = useState(false);

  async function getRound() {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::dashboard::get_round`,
      arguments: [tx.object(predictionSystemId), tx.pure.u64(props.round)],
    });

    const result = await suiClient.devInspectTransactionBlock({
      sender: account.address,
      transactionBlock: tx,
    });

    const returnValue = result.results?.[0]?.returnValues?.[0]?.[0];

    if (!returnValue) return null;

    const round = {
      id: returnValue[0],
      round_id: Number(returnValue[1]),
      start_time: Number(returnValue[2]),
      lock_time: Number(returnValue[3]),
      lock_oracle_round_id: Number(returnValue[4]),
      close_time: Number(returnValue[5]),
      close_oracle_round_id: Number(returnValue[6]),
      lock_price: Number(returnValue[7]),
      close_price: Number(returnValue[8]),
      total_amount: Number(returnValue[9]),
      up_amount: Number(returnValue[10]),
      down_amount: Number(returnValue[11]),
      treasury_fee: Number(returnValue[12]),
      treasury_fee_amount: Number(returnValue[13]),
      reward_amount: Number(returnValue[14]),
      reward_base_amount: Number(returnValue[15]),
      bets: returnValue[16],
      oracle_called: Boolean(returnValue[17]),
    };

    return round;
  }

  async function isClaimable() {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::dashboard::claimable`,
      arguments: [
        tx.object(predictionSystemId),
        tx.pure.u64(props.round),
        tx.pure.address(account.address),
      ],
    });

    const result = await suiClient.devInspectTransactionBlock({
      sender: account.address,
      transactionBlock: tx,
    });

    const returnValue = result.results?.[0]?.returnValues?.[0]?.[0];
    setIsClaim(Boolean(returnValue));
  }

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    getRound();
    isClaimable();
  }, [connectionStatus]);

  const {
    mutate: signAndExecute,
    isPending,
    isSuccess,
    reset,
  } = useSignAndExecuteTransaction();

  const claim = async () => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::dashboard::claim`,
      arguments: [
        tx.object(predictionSystemId),
        tx.pure.u64(props.round),
        tx.object('0x6'), // Clock object
      ],
    });
    swalFire().loading('wait for tx');

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onError: (error) => {
          console.log(error);
          swalFire().error('Tx failed!');
        },
        onSuccess: async ({ digest }) => {
          const { effects } = await suiClient.waitForTransaction({
            digest,
            options: {
              showEffects: true,
            },
          });

          console.log({ effects });
          swalFire().success('Tx Success!');
        },
      }
    );
  };

  return (
    <PredictionClaimWrapper className="flex gap-4 bg-gray-100 p-4 rounded-lg text-black">
      <div className="">ROUND : {props.round}</div>
      <div className="">
        {isClaim ? (
          <button
            onClick={claim}
            className="w-full bg-[#1FC7D4] text-white cursor-pointer font-bold px-8 rounded-lg py-3 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Claim
          </button>
        ) : (
          'Not Claimable'
        )}
      </div>
    </PredictionClaimWrapper>
  );
}

export default PredictionClaim;
