
import React from 'react';
import { Modal } from '../core/Modal';
import { PadPlayer } from '../mixer/PadPlayer';

interface PadPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PadPlayerModal: React.FC<PadPlayerModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ambient Pad Player">
      <PadPlayer />
    </Modal>
  );
};
