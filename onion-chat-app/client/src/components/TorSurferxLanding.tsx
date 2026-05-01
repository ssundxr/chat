import React, { useEffect, useState } from 'react';
import { DetectiveSilhouette } from './DetectiveSilhouette';
import { SystemStatusPanel } from './SystemStatusPanel';
import { DigitalClock } from './DigitalClock';
import { BlinkingCursor } from './BlinkingCursor';
import './TorSurferxLanding.css';

export const TorSurferxLanding: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="torsurferx-container">
      {/* Top-left corner label */}
      <div className="top-label">
        <span className="label-text">[ PRIVATE. ENCRYPTED. ANONYMOUS. ]</span>
      </div>

      {/* Main content grid */}
      <div className="content-grid">
        {/* LEFT SIDE - Visual */}
        <div className="left-section">
          <DetectiveSilhouette />
          
          {/* Bottom-left quote */}
          <div className="quote-box">
            <p className="quote-text">
              "When you have eliminated the impossible, whatever remains, however improbable, must be the truth."
            </p>
            <p className="quote-author">— Sherlock Holmes</p>
          </div>
        </div>

        {/* RIGHT SIDE - Content */}
        <div className="right-section">
          {/* Top branding */}
          <div className="branding-section">
            <h1 className="brand-name">TorSurferx</h1>
            <p className="brand-subtitle">PRIVACY IS POWER</p>
          </div>

          {/* Center greeting */}
          <div className="greeting-section">
            <h2 className="greeting-title">
              Welcome back.
            </h2>
            <p className="greeting-subtitle">
              <span className="brace">{'{'}</span> Start a secure conversation <span className="brace">{'}'}</span>
              <BlinkingCursor />
            </p>
          </div>

          {/* System status panel */}
          <SystemStatusPanel />

          {/* Action buttons */}
          <div className="buttons-section">
            <button className="btn btn-primary">
              <span className="btn-arrow">&gt;</span> START CHAT
            </button>
            <button className="btn btn-secondary">
              JOIN ROOM
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bottom-bar">
        <p className="bottom-quote">
          "SILENCE IS BETTER THAN UNNECESSARY TALK." — SHERLOCK HOLMES
        </p>
        <div className="clock-section">
          <DigitalClock />
          <div className="status-dot"></div>
        </div>
      </div>
    </div>
  );
};

export default TorSurferxLanding;
