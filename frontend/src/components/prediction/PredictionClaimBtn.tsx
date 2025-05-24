import { useNetworkVariable } from '@/config/networkConfig';
import { useRefreshState } from '@/states/refresh/reducer';
import { RoundPassInterface } from '@/types/round';
import { swalFire } from '@/utils/swalfire';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

interface Props extends SimpleComponent {
  roundId: string;
  roundData: RoundPassInterface;
}

const PredictionClaimBtnWrapper = styled.div``;

function PredictionClaimBtn({ roundData }: Props) {
  const { connectionStatus } = useCurrentWallet();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

  const predictionSystemId = useNetworkVariable('predictionSystemId');
  const packageId = useNetworkVariable('packageId');
  const [direction, setDirection] = useState(null);

  const [isClaim, setIsClaim] = useState(false);

  async function isClaimable() {
    // console.log(roundData.round_id);
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::dashboard::claimable`,
      arguments: [
        tx.object(predictionSystemId),
        tx.pure.u64(+roundData.round_id),
        tx.pure.address(account.address),
      ],
    });
    const result = await suiClient.devInspectTransactionBlock({
      sender: account.address,
      transactionBlock: tx,
    });

    // console.log({ result });

    const returnValue = result.results?.[0]?.returnValues?.[0]?.[0][0];
    setIsClaim(Boolean(returnValue));
  }

  async function getBetDetail() {
    const userAddress = account.address;
    const tx = new Transaction();
    // First get the round
    // tx.moveCall({
    //   target: `${packageId}::dashboard::get_round`,
    //   arguments: [
    //     tx.object(predictionSystemId),
    //     tx.pure.u64(+roundData.round_id),
    //   ],
    // });

    // Then get the bet
    tx.moveCall({
      target: `${packageId}::dashboard::get_round_bet`,
      arguments: [
        tx.object(roundData.objectId),
        tx.pure.address(account.address),
      ],
    });

    const res = await suiClient.devInspectTransactionBlock({
      sender: account.address,
      transactionBlock: tx,
    });

    // console.log({ res });

    const returnVal = res.results?.[0]?.returnValues?.[0];

    if (returnVal) {
      const [value, type] = returnVal;
      console.log('Raw Return:', value, 'Type:', type);
      // You may need to decode based on your `Bet` struct definition
    }
  }

  const {
    mutate: signAndExecute,
    isPending,
    isSuccess,
    reset,
  } = useSignAndExecuteTransaction();

  const claim = async () => {
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::dashboard::claim`,
        arguments: [
          tx.object(predictionSystemId), // &mut Prediction
          tx.pure.u64(+roundData.round_id), // round_id: u64
          tx.object('0x6'), // Clock object
        ],
      });
      swalFire().loading('wait for tx');

      await signAndExecute(
        {
          transaction: tx,
        },
        {
          onError: (error) => {
            console.error('Claim transaction failed:', error);
            swalFire().error('Failed to claim rewards');
          },
          onSuccess: async ({ digest }) => {
            try {
              const { effects } = await suiClient.waitForTransaction({
                digest,
                options: {
                  showEffects: true,
                },
              });

              if (effects.status.status === 'success') {
                swalFire().success('Successfully claimed rewards!');
                // Trigger refresh to update UI
              } else {
                throw new Error('Transaction failed');
              }
            } catch (err) {
              console.error('Error checking transaction:', err);
              swalFire().error('Failed to verify claim transaction');
            }
          },
        }
      );
    } catch (err) {
      console.error('Error executing claim:', err);
      swalFire().error('Failed to execute claim transaction');
    }
  };

  const refresh = useRefreshState();
  useEffect(() => {
    isClaimable();
    // getBetDetail();
  }, [refresh]);
  return (
    <PredictionClaimBtnWrapper>
      <div className="">
        {isClaim ? (
          <button
            onClick={claim}
            className="w-full bg-[#1FC7D4] text-white cursor-pointer font-bold px-8 rounded-lg py-3 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Claim
          </button>
        ) : (
          <div>You loss 😭</div>
        )}
      </div>
    </PredictionClaimBtnWrapper>
  );
}

export default PredictionClaimBtn;
