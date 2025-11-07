
import React, { useState, useEffect } from 'react';

interface VuMeterProps {
  level: number; // 0 to 1
}

const PEAK_DECAY_RATE = 0.01;
const PEAK_DECAY_INTERVAL = 50; // ms

export const VuMeter: React.FC<VuMeterProps> = ({ level }) => {
  const [peak, setPeak] = useState(0);

  useEffect(() => {
    // If new level is higher than current peak, update peak immediately
    if (level > peak) {
      setPeak(level);
    }
  }, [level, peak]);

  useEffect(() => {
    // Set up an interval to decay the peak value
    const decayInterval = setInterval(() => {
      // Only decay if the current level is lower than the peak
      if (level < peak) {
        setPeak(p => Math.max(level, p - PEAK_DECAY_RATE));
      }
    }, PEAK_DECAY_INTERVAL);

    return () => clearInterval(decayInterval);
  }, [level, peak]);
  
  const levelPercentage = level * 100;
  const peakPercentage = peak * 100;

  return (
    <div className="relative w-1.5 sm:w-4 h-full bg-audio-darker rounded-full overflow-hidden">
        {/* Gradient level bar */}
        <div 
            className="absolute bottom-0 w-full"
            style={{ 
                height: `${levelPercentage}%`,
                backgroundImage: 'linear-gradient(to top, #22C55E, #EAB308 70%, #EF4444)',
                transition: 'height 0.05s linear'
            }} 
        />
        {/* Peak hold indicator */}
        <div 
            className="absolute left-0 right-0 h-0.5 bg-red-400"
            style={{ 
                bottom: `${peakPercentage}%`,
                transition: 'bottom 0.05s linear'
            }} 
        />
    </div>
  );
};
