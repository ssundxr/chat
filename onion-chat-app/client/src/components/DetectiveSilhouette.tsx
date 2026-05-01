import React from 'react';

export const DetectiveSilhouette: React.FC = () => {
  return (
    <div className="silhouette-container">
      <svg
        viewBox="0 0 300 500"
        className="silhouette-svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Smoke effect */}
        <defs>
          <filter id="smoke-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>
          <linearGradient id="smoke-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ff88" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Background city skyline */}
        <g className="city-skyline">
          {/* Clock tower */}
          <rect x="120" y="280" width="20" height="180" fill="#1a1a1a" opacity="0.4" />
          <circle cx="130" cy="280" r="25" fill="none" stroke="#333" strokeWidth="1" opacity="0.3" />
          {/* Building silhouettes */}
          <polygon points="50,300 30,250 70,250" fill="#111" opacity="0.5" />
          <rect x="80" y="280" width="30" height="180" fill="#0a0a0a" opacity="0.6" />
          <polygon points="200,350 170,280 230,280" fill="#111" opacity="0.4" />
          <rect x="240" y="320" width="35" height="160" fill="#0a0a0a" opacity="0.5" />
        </g>

        {/* Smoke wisps */}
        <g className="smoke-wisps" filter="url(#smoke-blur)">
          <path
            d="M 140 80 Q 130 60, 145 40 T 140 10"
            fill="none"
            stroke="#00ff88"
            strokeWidth="3"
            opacity="0.15"
            className="smoke-path smoke-1"
          />
          <path
            d="M 155 100 Q 170 75, 160 45 T 175 15"
            fill="none"
            stroke="#00ff88"
            strokeWidth="2.5"
            opacity="0.12"
            className="smoke-path smoke-2"
          />
          <path
            d="M 125 90 Q 110 65, 120 35 T 105 5"
            fill="none"
            stroke="#00ff88"
            strokeWidth="2"
            opacity="0.1"
            className="smoke-path smoke-3"
          />
        </g>

        {/* Detective silhouette */}
        <g className="detective-figure">
          {/* Head with detective hat */}
          <ellipse cx="130" cy="120" rx="28" ry="35" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          
          {/* Detective hat - top brim */}
          <path
            d="M 100 80 Q 130 55 160 80 L 158 90 Q 130 70 102 90 Z"
            fill="#0a0a0a"
            stroke="#333"
            strokeWidth="1.5"
          />
          
          {/* Hat crown */}
          <ellipse cx="130" cy="75" rx="22" ry="18" fill="#111" stroke="#444" strokeWidth="1" />
          
          {/* Face outline */}
          <circle cx="130" cy="125" r="20" fill="none" stroke="#333" strokeWidth="1.5" opacity="0.6" />

          {/* Pipe */}
          <g className="pipe">
            <path
              d="M 145 135 Q 165 130 180 120"
              fill="none"
              stroke="#555"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="180" cy="120" r="6" fill="#444" stroke="#666" strokeWidth="1" />
            <circle cx="180" cy="120" r="3" fill="#222" />
          </g>

          {/* Shoulders and coat */}
          <ellipse cx="130" cy="200" rx="45" ry="50" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          
          {/* Collar detail */}
          <path
            d="M 110 155 L 100 180 L 160 180 L 150 155"
            fill="#111"
            stroke="#444"
            strokeWidth="1"
          />

          {/* Left arm */}
          <path
            d="M 100 170 Q 70 190 65 240"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="20"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Right arm */}
          <path
            d="M 160 170 Q 190 185 195 230"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="20"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Body */}
          <rect x="105" y="200" width="50" height="80" fill="#0a0a0a" opacity="0.7" />

          {/* Coat bottom */}
          <path
            d="M 90 280 L 80 400 L 180 400 L 170 280 Z"
            fill="#1a1a1a"
            stroke="#333"
            strokeWidth="1.5"
            opacity="0.9"
          />

          {/* Legs outline */}
          <line x1="105" y1="280" x2="100" y2="400" stroke="#333" strokeWidth="8" opacity="0.5" />
          <line x1="155" y1="280" x2="160" y2="400" stroke="#333" strokeWidth="8" opacity="0.5" />
        </g>

        {/* Fog overlay gradient */}
        <rect width="300" height="500" fill="url(#smoke-gradient)" />
      </svg>

      {/* Grain texture overlay */}
      <div className="grain-overlay"></div>
    </div>
  );
};

export default DetectiveSilhouette;
