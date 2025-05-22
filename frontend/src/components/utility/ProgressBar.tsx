import React, { useEffect, useState } from 'react';

type ProgressBarProps = {
  title: string;
  endTime: number; // timestamp in milliseconds
  duration?: number; // fallback duration in ms (optional, default: 10s)
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  endTime,
  duration = 1000,
  title,
}) => {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const now = Date.now();
    const actualDuration = endTime - now;

    if (actualDuration <= 0) {
      setProgress(100);
      setTimeLeft('00:00:00');
      return;
    }

    const startTime = now;

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const remaining = actualDuration - elapsed;

      const percent = ((300_000 - (endTime - currentTime)) / 300_000) * 100;


      // const percent = Math.min((elapsed / actualDuration) * 100, 100);

      // Calculate hours, minutes, seconds
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
      setProgress(percent);

      if (percent >= 100) {
        clearInterval(interval);
        setTimeLeft('00:00:00');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="w-full">
      <div className="w-full flex justify-between items-center">
        <div className="text-sm text-[#B5B5C3]">{title}</div>
        <div className="text-sm text-[#B5B5C3]">{timeLeft}</div>
      </div>
      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full bg-cyan-500 transition-all duration-100 linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
