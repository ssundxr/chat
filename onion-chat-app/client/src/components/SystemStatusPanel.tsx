import React, { useEffect, useState } from 'react';

type StatusItem = {
  label: string;
  value: string;
};

export const SystemStatusPanel: React.FC = () => {
  const [radarRotation, setRadarRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRadarRotation((prev) => (prev + 2) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const statusItems: StatusItem[] = [
    { label: 'Server', value: 'Online' },
    { label: 'Network', value: 'Tor' },
    { label: 'Encryption', value: 'E2EE (AES-256-GCM)' },
    { label: 'Anonymity', value: 'Enabled' },
  ];

  return (
    <div className="status-panel">
      <div className="status-header">SYSTEM STATUS</div>
      
      <div className="status-content">
        <div className="status-list">
          {statusItems.map((item, idx) => (
            <div key={idx} className="status-item">
              <div className="status-indicator"></div>
              <span className="status-label">{item.label}:</span>
              <span className="status-value">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Radar animation */}
        <div className="radar-container">
          <svg viewBox="0 0 100 100" className="radar-svg">
            {/* Outer circle */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="#00ff88" strokeWidth="0.5" opacity="0.3" />
            
            {/* Middle circle */}
            <circle cx="50" cy="50" r="30" fill="none" stroke="#00ff88" strokeWidth="0.5" opacity="0.2" />
            
            {/* Inner circle */}
            <circle cx="50" cy="50" r="15" fill="none" stroke="#00ff88" strokeWidth="0.5" opacity="0.15" />
            
            {/* Center dot */}
            <circle cx="50" cy="50" r="2" fill="#00ff88" />
            
            {/* Rotating sweep line */}
            <g
              style={{
                transform: `rotate(${radarRotation}deg)`,
                transformOrigin: '50px 50px',
                transition: 'transform 0.05s linear',
              }}
            >
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="8"
                stroke="#00ff88"
                strokeWidth="1"
                opacity="0.6"
              />
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="8"
                stroke="#00ff88"
                strokeWidth="0.5"
                opacity="0.3"
                strokeDasharray="2,3"
              />
            </g>

            {/* Compass lines */}
            <line x1="50" y1="5" x2="50" y2="15" stroke="#00ff88" strokeWidth="0.8" opacity="0.4" />
            <line x1="95" y1="50" x2="85" y2="50" stroke="#00ff88" strokeWidth="0.8" opacity="0.4" />
            <line x1="50" y1="95" x2="50" y2="85" stroke="#00ff88" strokeWidth="0.8" opacity="0.4" />
            <line x1="5" y1="50" x2="15" y2="50" stroke="#00ff88" strokeWidth="0.8" opacity="0.4" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusPanel;
