import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PadConfigModal } from '../modals/PadConfigModal';
import { Icon } from '../core/Icon';
import { ICONS } from '../../assets/icons';

const PADS = [
    { key: 'Db', label: 'D♭' }, { key: 'Eb', label: 'E♭' }, { key: 'Gb', label: 'G♭' }, { key: 'Ab', label: 'A♭' }, { key: 'Bb', label: 'B♭' }, { key: 'B', label: 'B' },
    { key: 'C', label: 'C' }, { key: 'D', label: 'D' }, { key: 'E', label: 'E' }, { key: 'F', label: 'F' }, { key: 'G', label: 'G' }, { key: 'A', label: 'A' },
];

const PAD_FREQUENCIES: Record<string, number> = {
    'C': 130.81, 'Db': 138.59, 'D': 146.83, 'Eb': 155.56, 'E': 164.81, 'F': 174.61,
    'Gb': 185.00, 'G': 196.00, 'Ab': 207.65, 'A': 220.00, 'Bb': 233.08, 'B': 246.94,
};

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface PadConfig {
    name: string;
    artworkUrl: string;
    waveform: WaveformType;
}

const DEFAULT_PAD_CONFIG: PadConfig = {
    name: 'Fundamental Ambient Pad',
    artworkUrl: 'https://picsum.photos/id/200/40/40',
    waveform: 'sawtooth',
};


export const PadPlayer: React.FC = () => {
    const [activePad, setActivePad] = useState<string | null>(null);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [padConfig, setPadConfig] = useState<PadConfig>(DEFAULT_PAD_CONFIG);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Audio references
    const audioContextRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    // Load config from localStorage on mount
    useEffect(() => {
        try {
            const storedConfig = localStorage.getItem('loopxy_padConfig');
            if (storedConfig) {
                setPadConfig(JSON.parse(storedConfig));
            }
        } catch (error) {
            console.error("Failed to load pad config from localStorage", error);
        }
    }, []);

    // Save config to localStorage on change
    useEffect(() => {
        try {
            localStorage.setItem('loopxy_padConfig', JSON.stringify(padConfig));
        } catch (error) {
            console.error("Failed to save pad config to localStorage", error);
        }
    }, [padConfig]);


    const handlePadClick = (padKey: string) => {
        // Initialize AudioContext on first user interaction
        if (!audioContextRef.current) {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = context;
            const gainNode = context.createGain();
            gainNode.connect(context.destination);
            gainNodeRef.current = gainNode;
        }
        
        const context = audioContextRef.current;
        if (context.state === 'suspended') {
            context.resume();
        }

        // Stop current oscillator if it exists
        if (oscillatorRef.current) {
            oscillatorRef.current.stop();
            // FIX: The disconnect method requires an argument in some environments.
            // The oscillator is connected to the gain node.
            if (gainNodeRef.current) {
                oscillatorRef.current.disconnect(gainNodeRef.current);
            }
            oscillatorRef.current = null;
        }

        // If clicking the same pad, turn it off. Otherwise, start the new one.
        if (activePad === padKey) {
            setActivePad(null);
        } else {
            setActivePad(padKey);
            const newOscillator = context.createOscillator();
            newOscillator.type = padConfig.waveform;
            newOscillator.frequency.setValueAtTime(PAD_FREQUENCIES[padKey], context.currentTime);
            newOscillator.connect(gainNodeRef.current!);
            newOscillator.start();
            oscillatorRef.current = newOscillator;
        }
    };

    // Effect to handle volume and mute changes
    useEffect(() => {
        if (gainNodeRef.current && audioContextRef.current) {
            const targetVolume = isMuted ? 0 : volume;
            gainNodeRef.current.gain.setTargetAtTime(targetVolume, audioContextRef.current.currentTime, 0.015);
        }
    }, [volume, isMuted]);

    // Cleanup effect
    useEffect(() => {
        const osc = oscillatorRef.current;
        const gain = gainNodeRef.current;
        const context = audioContextRef.current;
        return () => {
            if (osc) {
                try {
                    osc.stop();
                    // FIX: The disconnect method requires an argument in some environments.
                    // The oscillator is connected to the gain node.
                    if (gain) {
                        osc.disconnect(gain);
                    }
                } catch(e) { /* ignore */ }
            }
            if (gain) {
                try {
                    // FIX: The disconnect method requires an argument in some environments.
                    // The gain node is connected to the audio context destination.
                    if (context) {
                        gain.disconnect(context.destination);
                    }
                } catch(e) { /* ignore */}
            }
        };
    }, []);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(parseFloat(e.target.value));
    };

    const handleSaveConfig = (newConfig: PadConfig) => {
        setPadConfig(newConfig);
        setIsConfigOpen(false);
    };

    return (
        <>
            <div className="bg-audio-dark-contrast p-2 sm:p-3 rounded-lg flex flex-col gap-3">
                 {/* Top section: Info, Mute, Solo, Config */}
                <div className="flex items-center gap-2">
                    <img src={padConfig.artworkUrl} alt="Ambient Pad" className="w-8 h-8 rounded" />
                    <div className="flex-grow">
                        <p className="font-semibold text-sm">{padConfig.name}</p>
                        <p className="text-xs text-audio-light-contrast">Custom Pad</p>
                    </div>

                    <div className="flex gap-1">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded font-bold text-xs transition-colors ${
                                isMuted ? 'bg-audio-accent-hot text-white' : 'bg-gray-600 hover:bg-gray-500'
                            }`}
                        >
                            M
                        </button>
                        <button
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded font-bold text-xs bg-gray-600 opacity-50 cursor-not-allowed" title="Solo not implemented for pads">S</button>
                    </div>

                    <button onClick={() => setIsConfigOpen(true)} className="text-audio-light-contrast hover:text-white" title="Configure Pad">
                        <Icon path={ICONS.settings} className="w-5 h-5" />
                    </button>
                </div>
                
                 {/* Volume Slider */}
                <div className="relative w-full h-5 flex items-center group">
                    <div className="absolute w-full h-1.5 bg-audio-darker rounded-full" />
                    <div
                        className={`absolute h-1.5 rounded-full transition-colors ${isMuted ? 'bg-gray-500' : 'bg-audio-accent'}`}
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
                        aria-label="Pad volume"
                    />
                </div>

                {/* Pad Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                    {PADS.map(pad => (
                        <button
                            key={pad.key}
                            onClick={() => handlePadClick(pad.key)}
                            className={`py-2 rounded text-sm font-bold transition-colors ${
                                activePad === pad.key ? 'bg-audio-accent text-white' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                        >
                            {pad.label}
                        </button>
                    ))}
                </div>
            </div>
            <PadConfigModal
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                onSave={handleSaveConfig}
                currentConfig={padConfig}
            />
        </>
    );
};