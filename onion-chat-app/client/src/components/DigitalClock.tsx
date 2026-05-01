import React, { useEffect, useState } from 'react';

export const DigitalClock: React.FC = () => {
  const [time, setTime] = useState<string>('00:00:00');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTime(`${hours}:${minutes}:${seconds}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className="digital-clock">{time}</span>;
};

export default DigitalClock;
