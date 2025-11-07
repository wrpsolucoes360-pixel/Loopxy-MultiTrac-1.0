
import React from 'react';

export const Spinner: React.FC<{ size?: string }> = ({ size = 'w-5 h-5' }) => {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-t-transparent border-audio-accent ${size}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
