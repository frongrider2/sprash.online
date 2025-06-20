import PredictionItem, {
  PredictionItemObject,
} from '@/components/prediction/PredictionItem';
import styled from 'styled-components';
import logo from '@/assets/logo/logo.png';
import { Icon } from '@iconify/react/dist/iconify.js';
import { usePriceState } from '@/states/price/reducer';
import { decodeRound, formatNumberWithExpo } from '@/utils/format';
import { usePredictionState } from '@/states/prediction/reducer';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import { useRefreshState } from '@/states/refresh/reducer';
import { RoundInterface, RoundPassInterface } from '@/types/round';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64, fromHex, toBase64, toHex } from '@mysten/sui/utils';
import { useNetworkVariable } from '@/config/networkConfig';

interface Props extends SimpleComponent {}

const HomePageWrapper = styled.div`
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const passRoundData = (
  data: RoundInterface,
  objectId: string
): RoundPassInterface => {
  return {
    objectId,
    roundId: data.name ?? '',
    type: data.value.type ?? '',
    close_oracle_round_id: data.value.fields.close_oracle_round_id ?? '',
    close_price: data.value.fields.close_price.fields.magnitude ?? '',
    close_time: data.value.fields.close_time ?? '',
    down_amount: data.value.fields.down_amount ?? '',
    lock_oracle_round_id: data.value.fields.lock_oracle_round_id ?? '',
    lock_price: data.value.fields.lock_price.fields.magnitude ?? '',
    lock_time: data.value.fields.lock_time ?? '',
    oracle_called: data.value.fields.oracle_called ?? false,
    reward_amount: data.value.fields.reward_amount ?? '',
    reward_base_amount: data.value.fields.reward_base_amount ?? '',
    round_id: data.value.fields.round_id ?? '',
    start_time: data.value.fields.start_time ?? '',
    total_amount: data.value.fields.total_amount ?? '',
    treasury_fee: data.value.fields.treasury_fee ?? '',
    treasury_fee_amount: data.value.fields.treasury_fee_amount ?? '',
    up_amount: data.value.fields.up_amount ?? '',
  };
};

function HomePage(props: Props) {
  function scroll(direction: number) {
    const container = document.querySelector('.overflow-x-scroll');
    if (container) {
      const scrollAmount = 320; // Width of one PredictionItem
      container.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth',
      });
    }
  }

  const suiPrice = usePriceState().suiUsdt;
  const currentPrice = formatNumberWithExpo(suiPrice.current, suiPrice.expo);

  const predictionState = usePredictionState();
  const currentRound = +predictionState.current_round_id;
  const refresh = useRefreshState();

  const suiClient = useSuiClient();
  const [roundList, setRoundList] = useState<RoundPassInterface[]>([]);

  const account = useCurrentAccount();

  const packageId = useNetworkVariable('packageId');
  const predictionSystemId = useNetworkVariable('predictionSystemId');

  const [roundObjectIdList, setRoundObjectIdList] = useState<
    {
      roundId: number;
      objectId: string;
    }[]
  >([]);

  useEffect(() => {
    const container = document.querySelector('.overflow-x-scroll');
    if (container) {
      container.scrollLeft = container.scrollWidth;
    }
  }, [roundList]);

  const fetchRoundObjectId = async (roundId: number) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::prediction::get_round_by_id`,
      arguments: [tx.object(predictionSystemId), tx.pure.u64(roundId)],
    });

    const result = await suiClient.devInspectTransactionBlock({
      sender: account.address,
      transactionBlock: tx,
    });

    console.log({ result });
    const returnValue = result.results?.[0]?.returnValues?.[0];

    const decodedRound = decodeRound(returnValue[0]);

    console.log({ decodedRound });
  };

  const fetchRoundData = async () => {
    const arrayResult = Array.from(
      { length: Math.min(10, currentRound) },
      (_, index) => currentRound - Math.min(10, currentRound) + 1 + index
    );

    for (const roundId of arrayResult) {
      const check = roundObjectIdList.find((item) => item.roundId === roundId);
      if (check) {
        continue;
      }

      await fetchRoundObjectId(roundId);
    }
  };

  useEffect(() => {
    fetchRoundData();
  }, [currentRound]);

  // console.log({ roundObjectIdList });

  return (
    <HomePageWrapper>
      <div className="flex items-center justify-between px-8 h-[10rem]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-full">
            <Icon icon="token-branded:sui" className="text-5xl" />
          </div>
          <b className="text-2xl font-bold">Sui Price Prediction </b>
          <div className="text-blue-500 ml-4 w-[7rem]">${currentPrice}</div>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 px-8 py-2 rounded-full">
          <Icon
            icon="icon-park-solid:left-c"
            className="text-3xl cursor-pointer hover:text-cyan-500"
            onClick={() => scroll(-1)}
          />
          <div className="p-0 rounded-full">
            <img src={logo} alt="logo" className="h-16 rounded-full" />
          </div>
          <Icon
            icon="icon-park-solid:right-c"
            className="text-3xl cursor-pointer hover:text-cyan-500"
            onClick={() => scroll(1)}
          />
        </div>
        <div></div>
      </div>

      <div className="w-full mt-4 flex gap-4 overflow-hidden relative items-center">
        {/* <button className="absolute left-0 z-10" onClick={() => scroll(-1)}>
          <Icon icon="mdi:chevron-left" className='text-3xl'/>
        </button> */}
        <div className="w-full max-w-full flex gap-4 overflow-x-scroll scrollbar-hide">
          {roundObjectIdList.map((round) => {
            return (
              <div key={round.roundId}>
                <PredictionItemObject
                  roundId={round.roundId}
                  objectId={round.objectId}
                />
              </div>
            );
          })}
        </div>
        {/* <button className="absolute right-0 z-10" onClick={() => scroll(1)}>
          <Icon icon="mdi:chevron-right" className='text-3xl'/>
        </button> */}
      </div>
    </HomePageWrapper>
  );
}

export default HomePage;
