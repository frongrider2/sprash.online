import { useNetworkVariable } from '@/config/networkConfig';
import { useAppDispatch } from '@/states/hooks';
import { PredictionSlide } from '@/states/prediction/reducer';
import { useRefreshState } from '@/states/refresh/reducer';
import { PredictionObjectRaw } from '@/types/prediction';
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { SuiObjectData } from '@mysten/sui/client';
import { useEffect } from 'react';
import styled from 'styled-components';

interface Props extends SimpleComponent {}

const PredictionSystemWrapper = styled.div``;

function PredictionSystem(props: Props) {
  const dispatch = useAppDispatch();
  const refresh = useRefreshState();

  const predictionSystemId = useNetworkVariable('predictionSystemId');

  const { data: dataResponse, refetch: refreshFetch } = useSuiClientQuery(
    'getObject',
    {
      id: predictionSystemId,
      options: {
        showContent: true,
      },
    }
  );


  if (dataResponse?.data) {
    const predictionSystem = parsePrediction(dataResponse.data);
    // console.log(predictionSystem);

    dispatch(PredictionSlide.actions.setPrediction(predictionSystem));
  }

  useEffect(() => {
    refreshFetch();
  }, [refreshFetch]);

  return null;
}

function parsePrediction(data: SuiObjectData): PredictionObjectRaw {
  if (data.content?.dataType !== 'moveObject') return null;

  const { ...rest } = data.content.fields as any;

  const round_table_id = (data.content.fields as any).rounds.fields.id.id ?? '';

  return {
    ...rest,
    round_table_id,
  };
}

export default PredictionSystem;
