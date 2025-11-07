
import React, { ReactNode } from 'react';

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-audio-darker z-50 flex flex-col p-2 sm:p-4"
    >
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold">{title}</h2>
        <button onClick={onClose} className="text-audio-light-contrast hover:text-white p-2 text-2xl leading-none">&times;</button>
      </div>
      <div className="flex-grow min-h-0">
        {children}
      </div>
    </div>
  );
};
