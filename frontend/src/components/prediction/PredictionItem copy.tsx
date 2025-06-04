import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import SliderPercentage from '@/components/utility/SliderPercentage';
import clsx from 'clsx';
import { useNetworkVariable } from '@/config/networkConfig';
import {
  ConnectButton,
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from '@mysten/dapp-kit';
import { usePredictionState } from '@/states/prediction/reducer';
import { useRefreshState, useTimeStampState } from '@/states/refresh/reducer';
import { RoundInterface, RoundPassInterface } from '@/types/round';
import { Transaction } from '@mysten/sui/transactions';
import { swalFire } from '@/utils/swalfire';
import { CoinBalance } from '@mysten/sui/client';
import { ProgressBar } from '@/components/utility/ProgressBar';
import { usePriceState } from '@/states/price/reducer';
import { formatNumberWithExpo } from '@/utils/format';
import PredictionClaimBtn from '@/components/prediction/PredictionClaimBtn';

interface Props extends SimpleComponent {
  roundId: string;
  // roundData: RoundPassInterface;
  objectId: string;
}

const PredictionItemWrapper = styled.div`
  /* perspective: 1000px; */
`;

const FlipCard = styled.div`
  transform-style: preserve-3d;
  transition: transform 0.5s;
  &.flipped {
    transform: rotateY(180deg);
  }
`;

const FlipCardFront = styled.div`
  backface-visibility: hidden;
  position: absolute;
  width: 100%;
  height: 100%;
`;

const FlipCardBack = styled.div`
  backface-visibility: hidden;
  position: absolute;
  width: 100%;
  height: 100%;
  transform: rotateY(180deg);
`;

function PredictionItem({ objectId, roundId }: Props) {
  const { connectionStatus } = useCurrentWallet();
  const [flipped, setFlipped] = useState(false);

  const [value, setValue] = useState(0);
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const [balance, setBalance] = useState<number | null>(null);
  const [coin, setCoin] = useState<CoinBalance>();
  const [isBull, setIsBull] = useState(true);
  const suiPrice = usePriceState().suiUsdt;

  const handleFlip = (isBull) => {
    setIsBull(isBull);
    setFlipped(!flipped);
  };

  const onChangePercentBar = (percentage: number) => {
    if (!balance) return;
    setValue(Number((balance * (percentage / 100)).toFixed(4)));
  };

  const handlePercentageClick = (percentage: number) => {
    if (percentage === 100) {
      setValue(balance);
    } else {
      setValue(Number((balance * (percentage / 100)).toFixed(4)));
    }
  };
  const percentageButtonList = [10, 25, 50, 75, 100];
  const refresh = useRefreshState();

  useEffect(() => {
    const fetchBalance = async () => {
      if (!account?.address) return;

      const result = await suiClient.getBalance({
        owner: account.address,
      });

      setCoin(result);
      setBalance(+result.totalBalance / 10e9); // string in MIST (1 SUI = 10^9 MIST)
    };

    fetchBalance();
  }, [account, suiClient, refresh]);

  const disabled = !value;

  const {
    mutate: signAndExecute,
    isPending,
    isSuccess,
    reset,
  } = useSignAndExecuteTransaction();

  const predictionSystemId = useNetworkVariable('predictionSystemId');
  const packageId = useNetworkVariable('packageId');

  const betConfirm = async () => {
    const tx = new Transaction();
    const suiAmount = Number((value * 1e9).toFixed(0));
    const [betCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(suiAmount)]);
    tx.moveCall({
      target: isBull
        ? `${packageId}::dashboard::bet_up`
        : `${packageId}::dashboard::bet_down`,
      arguments: [
        tx.object(predictionSystemId),
        tx.pure.u64(roundData.roundId),
        betCoin, // Convert SUI to MIST
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

          const objectId = effects?.created?.[0]?.reference.objectId;

          const eventResult = await suiClient.queryEvents({
            query: {
              Transaction: digest,
            },
          });

          if (eventResult.data.length > 0) {
            console.log(eventResult.data);
          }

          console.log({ effects });

          console.log(objectId);
          reset();
          swalFire().success('Tx Success!');
          setFlipped(false);
        },
      }
    );
  };

  const currentTime = useTimeStampState();
  const startTime = roundData.start_time;
  const lockTime = roundData.lock_time;
  const closeTime = roundData.close_time;

  const isStart = currentTime >= +startTime;
  const isLock = currentTime >= +lockTime;
  const isClose = currentTime >= +closeTime;

  const lockPrice = +roundData.lock_price;
  const closePrice = +roundData.close_price;

  const isBullResult = lockPrice < closePrice;
  const isBearResult = lockPrice > closePrice;
  const isVoidResult = lockPrice === closePrice;

  useEffect(() => {
    if (isClose || isLock) {
      setFlipped(false);
    }
  }, [isClose, isLock]);

  const isLiveRound = isStart && !isLock;
  const isLockRound = isStart && isLock && !isClose;
  const isEndRound = isStart && isLock && isClose;

  const totalAmount = +roundData.total_amount;
  const bullAmount = +roundData.up_amount;
  const bearAmount = +roundData.down_amount;

  const bullPayout =
    totalAmount === 0 ? 0 : (totalAmount / bullAmount).toFixed(3);
  const bearPayout =
    totalAmount === 0 ? 0 : (totalAmount / bearAmount).toFixed(3);

  const prizePool = totalAmount ? formatNumberWithExpo(totalAmount, 9) : 0;
  const bullPool = totalAmount ? formatNumberWithExpo(bullAmount, 9) : 0;
  const bearPool = totalAmount ? formatNumberWithExpo(bearAmount, 9) : 0;

  const bullPayoutMultiple =
    bullAmount === 0 ? 0 : (totalAmount / bullAmount).toFixed(2);
  const bearPayoutMultiple =
    bearAmount === 0 ? 0 : (totalAmount / bearAmount).toFixed(2);

  return (
    <PredictionItemWrapper
      className={`w-[20rem] h-[27rem] flex-shrink-0 border-1 border-[#353547] bg-[#27262C] rounded-2xl p-4 ${
        isEndRound ? 'opacity-60' : ''
      }`}
    >
      <FlipCard className={flipped ? 'flipped' : ''}>
        {/* front */}
        <FlipCardFront>
          <div className="">
            {isLiveRound && (
              <div className="mb-1">
                <ProgressBar
                  title={`Live Round #${roundData.round_id}`}
                  endTime={+lockTime}
                />
              </div>
            )}

            {isLockRound && (
              <div className="mb-1">
                <ProgressBar
                  title={`Lock Price #${roundData.round_id}`}
                  endTime={+closeTime}
                />
              </div>
            )}

            {isEndRound && (
              <div className="mb-1">
                <div className="text-sm text-[#B5B5C3]">
                  End Round #${roundData.round_id}
                </div>
              </div>
            )}

            <div className="flex flex-col w-full relative my-4">
              <div
                className={`py-2  flex flex-col items-center ${
                  isVoidResult
                    ? 'bg-black/20'
                    : isBullResult
                    ? 'bg-[#138268] text-white'
                    : 'bg-black/20'
                }`}
              >
                <b className="">UP</b>
                <b className="text-sm">Payout {bullPayoutMultiple}X</b>
              </div>

              <div className="w-full justify-between flex flex-col gap-2 border-x-2 border-cyan-500 bg-black p-6">
                <div className="flex justify-between items-center">
                  <div className="text-base font-bold">Prize Pool:</div>
                  <div className="text-sm font-bold">{prizePool} SUI</div>
                </div>
                {isLiveRound ? (
                  <div className="flex flex-col gap-2">
                    <div
                      onClick={() => handleFlip(true)}
                      className="bg-[#31D0AA]/50  py-4 rounded-lg cursor-pointer hover:bg-[#31D0AA]/60"
                    >
                      <div className="text-center text-xl font-bold text-white">
                        ENTER UP
                      </div>
                    </div>
                    <div className="bg-[#ED4B9E]/50 text-white py-4 rounded-lg cursor-pointer hover:opacity-60">
                      <div
                        onClick={() => handleFlip(false)}
                        className="text-center text-2xl font-bold text-white"
                      >
                        ENTER DOWN
                      </div>
                    </div>
                  </div>
                ) : isLockRound ? (
                  <div>
                    <div className="flex justify-between items-center">
                      <div className="text-base font-bold">Lock PRICE:</div>
                      <div className="text-base font-bold">
                        {formatNumberWithExpo(+lockPrice, suiPrice.expo)}$
                      </div>
                    </div>

                    <div className="flex justify-between items-center my-4">
                      <div className="text-base font-bold">CURRENT PRICE:</div>
                      <div className="text-base font-bold text-cyan-500">
                        {formatNumberWithExpo(suiPrice.current, suiPrice.expo)}$
                      </div>
                    </div>

                    <div
                      className={`flex justify-between items-center ${
                        isVoidResult
                          ? 'text-white'
                          : isBearResult
                          ? 'text-pink-500'
                          : 'text-emerald-500'
                      }`}
                    >
                      <div className="text-base font-bold">Close PRICE:</div>
                      <div className="text-base font-bold">
                        {formatNumberWithExpo(+closePrice, suiPrice.expo)}$
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center">
                      <div className="text-base font-bold">Lock PRICE:</div>
                      <div className="text-base font-bold">
                        {formatNumberWithExpo(+lockPrice, suiPrice.expo)}$
                      </div>
                    </div>
                    <div
                      className={`flex justify-between items-center ${
                        isVoidResult
                          ? 'text-white'
                          : isBearResult
                          ? 'text-pink-500'
                          : 'text-emerald-500'
                      }`}
                    >
                      <div className="text-base font-bold">Close PRICE:</div>
                      <div className="text-base font-bold">
                        {formatNumberWithExpo(+closePrice, suiPrice.expo)}$
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`py-2  flex flex-col items-center ${
                  isVoidResult
                    ? 'bg-black/20'
                    : isBearResult
                    ? 'bg-[#ED4B9E] text-white'
                    : 'bg-black/20'
                }`}
              >
                <b className="">DOWN</b>
                <b className="text-sm">Payout {bearPayoutMultiple}X</b>
              </div>

              {connectionStatus === 'connected' && closePrice !== 0 && (
                <div className="mt-4">
                  <PredictionClaimBtn roundData={roundData} roundId={roundId} />
                </div>
              )}
            </div>
          </div>
        </FlipCardFront>

        {/* back */}
        <FlipCardBack>
          <div className="">
            {isStart && !isLock && (
              <div className="mb-1">
                <ProgressBar
                  title={`Round #${roundData.round_id}`}
                  endTime={+lockTime}
                />
              </div>
            )}
            <div className="flex items-center justify-between py-2 mb-2 gap-2">
              <div className="flex items-center gap-2">
                <div
                  onClick={handleFlip}
                  className={clsx(
                    'text-white hover:text-cyan-500 cursor-pointer'
                  )}
                >
                  <Icon icon={'famicons:arrow-back'} className="text-2xl" />
                </div>
                <b>Set Position</b>
              </div>

              <div className="px-4 rounded-lg bg-emerald-500">UP</div>
            </div>
            <div className="inset-0">
              <div className="text-sm text-[#B5B5C3]"></div>
              <div className="mt-4">
                <div className="text-sm text-[#B5B5C3]">Value</div>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full bg-[#353547] rounded-lg p-3 text-white"
                    placeholder="0.0"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Icon icon={'token-branded:sui'} className="text-2xl" />
                    <span className="text-white">SUI</span>
                  </div>
                </div>
              </div>

              <SliderPercentage
                value={(value / balance) * 100}
                onChange={onChangePercentBar}
              />

              <div className="flex gap-2 mt-4">
                {percentageButtonList.map((percentage) => (
                  <button
                    key={percentage}
                    onClick={() => handlePercentageClick(percentage)}
                    className="bg-cyan-200 cursor-pointer rounded-lg px-3 py-2 text-cyan-900 font-bold text-xs hover:opacity-80"
                  >
                    {percentage}%
                  </button>
                ))}
              </div>

              {connectionStatus !== 'connected' ? (
                <div className="flex my-4 justify-center">
                  <ConnectButton className="w-full" />
                </div>
              ) : (
                <button
                  onClick={betConfirm}
                  disabled={disabled}
                  className="w-full bg-[#1FC7D4] text-white cursor-pointer font-bold rounded-lg py-3 mt-4 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  CONFIRM
                </button>
              )}

              <div className="text-xs text-[#B5B5C3] text-center mt-2">
                You won't be able to remove or change your position once you
                enter it.
              </div>
            </div>
          </div>
        </FlipCardBack>
      </FlipCard>
    </PredictionItemWrapper>
  );
}

export default PredictionItem;
