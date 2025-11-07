
import React from 'react';
import { useSong } from '../../context/SongContext';
import { useMixer } from '../../context/MixerContext';
import { ChannelStrip } from './ChannelStrip';

export const Mixer: React.FC = () => {
    const { activeSong } = useSong();
    const { trackStates } = useMixer();

    if (!activeSong) return null;

    const isAnyTrackSoloed = trackStates.some(t => t.isSolo);

    return (
        <div className="bg-audio-dark rounded-lg p-4 flex-grow overflow-x-auto">
            <div className="flex gap-4 h-full">
                {activeSong.tracks.map(track => (
                    <ChannelStrip 
                        key={track.id} 
                        track={track} 
                        songColor={activeSong.songColor} 
                        isAnyTrackSoloed={isAnyTrackSoloed}
                    />
                ))}
            </div>
        </div>
    );
};
