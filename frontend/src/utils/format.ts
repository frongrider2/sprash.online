export const formatNumberWithExpo = (value: number, expo: number) => {
  return Number(value / Math.pow(10, Math.abs(expo))).toFixed(Math.abs(expo));
};
