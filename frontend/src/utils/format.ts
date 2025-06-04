export const formatNumberWithExpo = (value: number, expo: number) => {
  return Number(value / Math.pow(10, Math.abs(expo))).toFixed(Math.abs(expo));
};

export function decodeRound(bytes: number[]) {
  try {
    const buf = Buffer.from(bytes);
    let offset = 0;

    function readU64() {
      const value = buf.readBigUInt64LE(offset);
      offset += 8;
      return value;
    }

    function readI64() {
      const value = buf.readBigInt64LE(offset);
      offset += 8;
      return value;
    }

    function readBool() {
      return buf[offset++] === 1;
    }

    function readObjectId() {
      const slice = buf.slice(offset, offset + 32);
      offset += 32;
      return `0x${slice.toString('hex')}`;
    }

    return {
      id: readObjectId(),
      round_id: readU64(),
      start_time: readU64(),
      lock_time: readU64(),
      lock_oracle_round_id: readU64(),
      close_time: readU64(),
      close_oracle_round_id: readU64(),
      lock_price: readI64(),
      close_price: readI64(),
      total_amount: readU64(),
      up_amount: readU64(),
      down_amount: readU64(),
      treasury_fee: readU64(),
      treasury_fee_amount: readU64(),
      reward_amount: readU64(),
      reward_base_amount: readU64(),
      bets: readObjectId(),
      oracle_called: readBool(),
    };
  } catch (error) {
    console.log({ error });
    return null;
  }
}
