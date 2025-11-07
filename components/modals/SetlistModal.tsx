
import React from 'react';
import { FullscreenModal } from '../core/FullscreenModal';
import { LibraryPanel } from '../layout/LibraryPanel';

interface SetlistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSong: () => void;
    onAiSetlist: () => void;
}

export const SetlistModal: React.FC<SetlistModalProps> = ({ isOpen, onClose, onAddSong, onAiSetlist }) => {
    return (
        <FullscreenModal isOpen={isOpen} onClose={onClose} title="Setlist">
            <LibraryPanel
                onAddSong={onAddSong}
                onAiSetlist={onAiSetlist}
            />
        </FullscreenModal>
    );
};
