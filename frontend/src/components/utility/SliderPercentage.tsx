import styled from 'styled-components';

interface Props extends SimpleComponent {
  value: number;
  onChange: (value: number) => void;
}

const SliderPercentageWrapper = styled.div`
  padding: 1rem 0;

  .slider:hover {
    opacity: 1;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 100%;
    background: #4abaf6;
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 100%;
    background: #4abaf6;
    cursor: pointer;
  }
`;

function SliderPercentage({ value, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const percentage = Math.floor(+Number(e.target.value));
    onChange(percentage);
  };

  return (
    <SliderPercentageWrapper>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={handleChange}
        className="slider w-full h-2 bg-[#353547] rounded-lg appearance-none cursor-pointer"
      />
      <div className="text-right text-sm text-[#B5B5C3] mt-1">
        {value.toFixed(0)}%
      </div>
    </SliderPercentageWrapper>
  );
}

export default SliderPercentage;
