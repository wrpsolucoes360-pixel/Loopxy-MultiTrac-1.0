

import React, { useState, useRef, useEffect } from 'react';
import { usePlayback } from '../../context/PlaybackContext';
import { useSong } from '../../context/SongContext';
import { useMidi } from '../../context/MidiContext';
import { Icon } from '../core/Icon';
import { ICONS } from '../../assets/icons';
import { transposeKey } from '../../utils/musicUtils';

const formatTime = (seconds: number) => {
    const floorSeconds = Math.floor(seconds);
    const min = Math.floor(floorSeconds / 60);
    const sec = floorSeconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

interface HeaderProps {
    onOpenMidiMappings: () => void;
    onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMidiMappings, onOpenSettings }) => {
    const { 
        isPlaying, currentTime, duration, play, pause, stop, seek, isFullyLoaded, 
        isLooping, toggleLoop, masterVolume, setMasterVolume, masterBpm, toggleMasterBpm,
        pitchShift, transposeUp, transposeDown, resetPitch,
        metronomeSettings, updateMetronomeSettings
    } = usePlayback();
    const { activeSong } = useSong();
    const { isDeviceConnected } = useMidi();
    
    const [isMetronomeSettingsOpen, setIsMetronomeSettingsOpen] = useState(false);
    const metronomeButtonRef = useRef<HTMLDivElement>(null);

    const transportButtonClass = "bg-audio-dark-contrast p-2 rounded-md text-audio-light hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
    
    const displayKey = activeSong ? transposeKey(activeSong.key, pitchShift) : '-';
    
    // Close metronome settings popover on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMetronomeSettingsOpen && metronomeButtonRef.current && !metronomeButtonRef.current.contains(event.target as Node)) {
                setIsMetronomeSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMetronomeSettingsOpen]);

    const MetronomeSettingsPopover = () => (
        <div className="absolute top-full right-0 mt-2 w-64 bg-audio-dark-contrast rounded-lg shadow-lg p-4 z-50 text-sm">
            <div className="flex justify-between items-center mb-4">
                <label htmlFor="metronome-enabled" className="font-bold">Enable Metronome</label>
                <input
                    id="metronome-enabled"
                    type="checkbox"
                    checked={metronomeSettings.enabled}
                    onChange={(e) => updateMetronomeSettings({ enabled: e.target.checked })}
                    className="h-4 w-4 rounded-full border-gray-600 bg-gray-700 text-audio-accent focus:ring-audio-accent-darker accent-audio-accent"
                />
            </div>
             <div className="space-y-3">
                <div>
                    <label htmlFor="metronome-volume" className="block mb-1">Volume</label>
                    <input
                        id="metronome-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={metronomeSettings.volume}
                        onChange={(e) => updateMetronomeSettings({ volume: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-audio-dark rounded-lg appearance-none cursor-pointer accent-audio-accent"
                        disabled={!metronomeSettings.enabled}
                    />
                </div>
                 <div>
                    <label htmlFor="metronome-countin" className="block mb-1">Count-in</label>
                    <select
                        id="metronome-countin"
                        value={metronomeSettings.countInBars}
                        onChange={(e) => updateMetronomeSettings({ countInBars: parseInt(e.target.value) })}
                        className="w-full p-2 bg-audio-dark rounded border border-gray-600"
                        disabled={!metronomeSettings.enabled}
                    >
                        <option value="0">Off</option>
                        <option value="1">1 Bar</option>
                        <option value="2">2 Bars</option>
                    </select>
                </div>
                 <div className="flex justify-between items-center">
                    <label htmlFor="metronome-continuous">Play during song</label>
                    <input
                        id="metronome-continuous"
                        type="checkbox"
                        checked={metronomeSettings.continuous}
                        onChange={(e) => updateMetronomeSettings({ continuous: e.target.checked })}
                        className="h-4 w-4 rounded-full border-gray-600 bg-gray-700 text-audio-accent focus:ring-audio-accent-darker accent-audio-accent"
                        disabled={!metronomeSettings.enabled}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <header className="flex-shrink-0 bg-audio-dark rounded-lg p-2 flex flex-wrap items-center justify-center sm:justify-between gap-2 sm:gap-3 mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
                <button className="bg-audio-light text-audio-dark font-bold px-3 py-1 text-sm rounded-md flex-shrink-0">MASTER</button>
                <div className="relative w-24 sm:w-28 h-5 flex items-center group">
                    {/* Track */}
                    <div className="absolute w-full h-1.5 bg-audio-dark-contrast rounded-full" />
                    {/* Fill */}
                    <div
                        className="absolute h-1.5 bg-audio-light rounded-full"
                        style={{ width: `${masterVolume * 100}%` }}
                    />
                    {/* Thumb */}
                    <div
                        className="absolute w-4 h-4 bg-white rounded-full border-2 border-audio-dark-contrast shadow-lg transform -translate-y-1/2 transition group-hover:scale-110"
                        style={{ left: `calc(${masterVolume * 100}% - 8px)`, top: '50%' }}
                    />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={masterVolume}
                        onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Master volume"
                    />
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button onClick={() => seek(0)} className={transportButtonClass} disabled={!isFullyLoaded}><Icon path={ICONS.rewind} className="w-5 h-5" /></button>
                <button className={transportButtonClass} onClick={isPlaying ? pause : play} disabled={!isFullyLoaded}>
                    <Icon path={isPlaying ? ICONS.pause : ICONS.play} className="w-5 h-5" />
                </button>
                <button onClick={stop} className={transportButtonClass} disabled={!isFullyLoaded}><Icon path={ICONS.stop} className="w-5 h-5" /></button>
                <button className={transportButtonClass} disabled={!isFullyLoaded}><Icon path={ICONS.forward} className="w-5 h-5" /></button>
            </div>

            <div className="flex items-center gap-2 text-center font-mono text-sm bg-audio-dark-contrast px-2 py-1 rounded-md">
                <span>{formatTime(currentTime)}</span>
                <span className="text-audio-light-contrast">/</span>
                <span>{formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                <div className={`bg-audio-dark-contrast px-2 py-1 rounded-md font-bold text-sm transition-colors ${masterBpm ? 'ring-2 ring-audio-accent' : ''}`}>
                    {masterBpm ? <span className="text-audio-accent">{masterBpm} BPM</span> : <span>{activeSong?.bpm || '---'} BPM</span>}
                </div>
                <div className="bg-audio-dark-contrast rounded-md font-bold text-sm flex items-center h-full">
                    <button onClick={transposeDown} className="p-2 h-full hover:bg-black/20 rounded-l-md disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isFullyLoaded} title="Transpose Down">
                        <Icon path={ICONS.chevronDown} className="w-4 h-4" />
                    </button>
                    <div onClick={resetPitch} className="px-3 text-center cursor-pointer min-w-[50px]" title="Reset transposition">
                        <span>{displayKey}</span>
                        {pitchShift !== 0 && <span className="text-xs font-normal text-audio-light-contrast ml-1">({pitchShift > 0 ? '+' : ''}{pitchShift})</span>}
                    </div>
                    <button onClick={transposeUp} className="p-2 h-full hover:bg-black/20 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isFullyLoaded} title="Transpose Up">
                        <Icon path={ICONS.chevronUp} className="w-4 h-4" />
                    </button>
                </div>
                 <button 
                    onClick={toggleMasterBpm}
                    className={`p-2 rounded-md transition-colors ${masterBpm ? 'bg-audio-accent text-white' : 'bg-audio-dark-contrast text-audio-light'}`}
                    disabled={!isFullyLoaded}
                    title={masterBpm ? `Synced to ${masterBpm} BPM. Click to disable.` : 'Enable Tempo Sync'}
                >
                    <Icon path={ICONS.sync} className="w-5 h-5" />
                </button>
                 <button 
                    onClick={toggleLoop}
                    className={`p-2 rounded-md transition-colors ${isLooping ? 'bg-audio-accent text-white' : 'bg-audio-dark-contrast text-audio-light'}`}
                    disabled={!isFullyLoaded}
                >
                    <Icon path={ICONS.loop} className="w-5 h-5" />
                </button>
                 <div className="relative" ref={metronomeButtonRef}>
                    <button 
                        onClick={() => setIsMetronomeSettingsOpen(prev => !prev)}
                        className={`p-2 rounded-md transition-colors ${metronomeSettings.enabled ? 'bg-audio-accent text-white' : 'bg-audio-dark-contrast text-audio-light'}`}
                        disabled={!isFullyLoaded}
                        title="Metronome Settings"
                    >
                        <Icon path={ICONS.metronome} className="w-5 h-5" />
                    </button>
                    {isMetronomeSettingsOpen && <MetronomeSettingsPopover />}
                 </div>
            </div>

            <div className="flex items-center gap-2">
                 <button
                    onClick={onOpenMidiMappings}
                    className={`${transportButtonClass} ${isDeviceConnected ? 'text-audio-accent' : ''}`}
                    title="MIDI Mappings"
                >
                    <Icon path={ICONS.midi} className="w-5 h-5" />
                </button>
                 <button className={transportButtonClass}><Icon path={ICONS.outs} className="w-5 h-5" /></button>
                 <button onClick={onOpenSettings} className={transportButtonClass} title="Settings"><Icon path={ICONS.settings} className="w-5 h-5" /></button>
            </div>
        </header>
    );
};
