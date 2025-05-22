import styled from 'styled-components';

interface Props extends SimpleComponent {}

const PredictionResultWrapper = styled.div``;

function PredictionResult(props: Props) {
  return (
    <PredictionResultWrapper>
      <div className=""></div>
    </PredictionResultWrapper>
  );
}

export default PredictionResult;
