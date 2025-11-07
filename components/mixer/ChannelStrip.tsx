import React, { useState, useEffect } from 'react';
import { Track, TrackColor } from '../../types';
import { useMixer } from '../../context/MixerContext';
import { useSong } from '../../context/SongContext';
import { usePlayback } from '../../context/PlaybackContext';
import { VuMeter } from './VuMeter';
import { Icon } from '../core/Icon';
import { ICONS } from '../../assets/icons';

interface ChannelStripProps {
    track: Track;
    songColor?: TrackColor;
    isAnyTrackSoloed: boolean;
}

export const ChannelStrip: React.FC<ChannelStripProps> = ({ track, songColor, isAnyTrackSoloed }) => {
    const { trackStates, updateTrackVolume, updateTrackPan, toggleMute, toggleSolo } = useMixer();
    const { activeSong, updateSong } = useSong();
    const { trackLevels, loadingProgress } = usePlayback();
    
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(track.name);

    useEffect(() => {
        if (!isEditing) {
            setEditedName(track.name);
        }
    }, [track.name, isEditing]);

    const state = trackStates.find(t => t.id === track.id);
    const level = trackLevels[track.id] || 0;
    const progress = loadingProgress[track.id];
    const isLoading = typeof progress === 'number' && progress >= 0 && progress < 100;
    const hasError = progress === -1;

    if (!state) return null;

    const { volume, pan, isMuted, isSolo } = state;
    const effectiveColor = track.color || songColor || TrackColor.Blue;
    
    const isEffectivelyMuted = isMuted || (isAnyTrackSoloed && !isSolo);
    const faderColor = isEffectivelyMuted ? 'bg-gray-500' : `bg-${effectiveColor}`;

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateTrackVolume(track.id, parseFloat(e.target.value));
    };
    
    const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateTrackPan(track.id, parseFloat(e.target.value));
    };

    const handleNameSave = () => {
        if (activeSong && editedName.trim() && editedName.trim() !== track.name) {
            const updatedTracks = activeSong.tracks.map(t =>
                t.id === track.id ? { ...t, name: editedName.trim() } : t
            );
            updateSong({ ...activeSong, tracks: updatedTracks });
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleNameSave();
        } else if (e.key === 'Escape') {
            setEditedName(track.name);
            setIsEditing(false);
        }
    };

    const handleSetSongColor = () => {
        if (isEditing) return; // Don't trigger when editing name
        if (!activeSong) return;
        if (activeSong.songColor === effectiveColor) return;
        if (activeSong.songColor) {
            const confirmOverride = window.confirm(
                `This song already has a global color. Would you like to override it with this track's color?`
            );
            if (confirmOverride) {
                updateSong({ ...activeSong, songColor: effectiveColor });
            }
        } else {
            updateSong({ ...activeSong, songColor: effectiveColor });
        }
    };

    const containerClasses = [
        'flex', 'flex-col', 'items-center', 'gap-2', 
        'w-32', // Wider on mobile for horizontal fader
        'md:w-24', // Revert to original width on desktop
        'h-full',
        'bg-audio-dark-contrast', 'p-1', 'md:p-2', 'rounded-lg', 'transition-all', 'duration-200'
    ];

    if (isSolo) {
        containerClasses.push('border-2', 'border-track-yellow');
    } else if (isAnyTrackSoloed && !isLoading && !hasError) {
        containerClasses.push('opacity-60', 'grayscale-[50%]');
    }

    const LoadingOverlay = () => (
        <div className="absolute inset-0 bg-audio-dark-contrast/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10 p-1 text-center">
            {hasError ? (
                <>
                    <Icon path={ICONS.error} className="w-5 h-5 text-audio-accent-hot mb-1" />
                    <span className="text-xs font-bold text-audio-accent-hot">Error</span>
                </>
            ) : (
                <>
                    <div className="w-full bg-audio-darker rounded-full h-1.5 mb-2">
                        <div className="bg-audio-accent h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="text-xs font-bold">{Math.round(progress)}%</span>
                </>
            )}
        </div>
    );


    return (
        <div className={containerClasses.join(' ')}>
            <div
                className={`flex items-center justify-center w-full cursor-pointer hover:opacity-90 transition-opacity py-1 rounded-md bg-${effectiveColor} text-white font-semibold`}
                onClick={handleSetSongColor}
                title="Click background to set as song color"
            >
                 {isEditing ? (
                    <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent text-center text-sm outline-none border-b border-white/50"
                        autoFocus
                        onClick={(e) => e.stopPropagation()} // Prevent parent onClick
                    />
                ) : (
                    <span 
                      className="text-sm truncate text-center w-full px-1"
                      onClick={(e) => {
                          e.stopPropagation();
                          setIsEditing(true);
                      }}
                      title="Click to edit name"
                    >
                        {track.name}
                    </span>
                )}
            </div>

            {/* Desktop: Vertical Fader */}
            <div className="relative hidden flex-grow w-full md:flex justify-center items-stretch gap-1 md:gap-2 py-2 px-2">
                <div 
                    className={`absolute top-2 left-2 w-2 h-2 rounded-full transition-colors duration-150 ${isMuted ? 'bg-audio-accent-hot shadow-[0_0_4px_1px_rgba(255,79,121,0.7)]' : 'bg-black/50'}`} 
                    title={isMuted ? "Muted" : ""} 
                />
                <div 
                    className={`absolute top-2 right-2 w-2 h-2 rounded-full transition-colors duration-150 ${isSolo ? 'bg-track-yellow shadow-[0_0_4px_1px_rgba(234,179,8,0.7)]' : 'bg-black/50'}`} 
                    title={isSolo ? "Solo" : ""} 
                />

                <div className="relative w-5 md:w-9 h-full">
                    <div className="absolute inset-0 bg-audio-darker rounded-full overflow-hidden">
                        <div
                            className={`absolute bottom-0 w-full rounded-full transition-colors ${faderColor}`}
                            style={{ height: `${volume * 100}%` }}
                        />
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label={`${track.name} volume`}
                        disabled={isLoading || hasError}
                    />
                </div>
                
                <VuMeter level={level} />
                {(isLoading || hasError) && <LoadingOverlay />}
            </div>
            
            {/* Mobile: Horizontal Fader */}
            <div className="relative flex flex-col justify-center flex-grow w-full md:hidden px-2 py-2">
                 <div 
                    className="relative w-full h-5 flex items-center group my-auto"
                    onDoubleClick={() => updateTrackVolume(track.id, 0.75)}
                    title="Volume (Double-click to reset)"
                 >
                    <div className="absolute w-full h-1.5 bg-audio-darker rounded-full" />
                    <div
                        className={`absolute h-1.5 rounded-full transition-colors ${faderColor}`}
                        style={{ width: `${volume * 100}%` }}
                    />
                    <div
                        className="absolute w-4 h-4 bg-white rounded-full border-2 border-audio-dark-contrast shadow-lg transform -translate-y-1/2 transition group-hover:scale-110"
                        style={{ left: `calc(${volume * 100}% - 8px)`, top: '50%' }}
                    />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label={`${track.name} volume`}
                        disabled={isLoading || hasError}
                    />
                </div>
                {(isLoading || hasError) && <LoadingOverlay />}
            </div>

            <div className="w-full px-1">
                <div
                    className="relative h-4 group flex items-center"
                    onDoubleClick={() => updateTrackPan(track.id, 0)}
                    title="Pan (Double-click to center)"
                >
                    <div className="w-full h-0.5 bg-audio-darker relative">
                        {/* Center Mark */}
                        <div className="absolute h-full w-0.5 bg-audio-light-contrast left-1/2 -translate-x-1/2" />
                    </div>
                    <div 
                        className="absolute w-2 h-4 bg-white rounded-sm top-1/2 -translate-y-1/2 shadow-md pointer-events-none transition-transform group-hover:scale-110"
                        style={{ 
                            left: `calc(${(pan + 1) / 2 * 100}%)`,
                            transform: `translateX(-50%) translateY(-50%)`
                        }}
                    />
                    <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        value={pan}
                        onChange={handlePanChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label={`${track.name} pan`}
                        disabled={isLoading || hasError}
                    />
                </div>
                <div className="flex justify-between text-xs text-audio-light-contrast -mt-1">
                    <span>L</span>
                    <span>R</span>
                </div>
            </div>

            <div className="flex gap-1 md:gap-2 mt-2">
                <button
                    onClick={() => toggleMute(track.id)}
                    className={`w-5 h-5 md:w-9 md:h-9 rounded-md font-bold text-sm transition-colors text-white ${
                        isMuted
                          ? 'bg-audio-accent-hot'
                          : `bg-${effectiveColor}/70 hover:bg-${effectiveColor}/90`
                    }`}
                    disabled={isLoading || hasError}
                >
                    M
                </button>
                <button
                    onClick={() => toggleSolo(track.id)}
                    className={`w-5 h-5 md:w-9 md:h-9 rounded-md font-bold text-sm transition-colors ${
                        isSolo
                          ? 'bg-track-yellow text-black ring-2 ring-offset-2 ring-offset-audio-dark-contrast ring-white'
                          : `bg-${effectiveColor}/70 hover:bg-${effectiveColor}/90 text-white`
                    }`}
                    disabled={isLoading || hasError}
                >
                    S
                </button>
            </div>
        </div>
    );
};
