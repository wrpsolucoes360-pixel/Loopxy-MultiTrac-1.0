
import React, { useState, useEffect } from 'react';
import { Modal } from '../core/Modal';
import { useSettings } from '../../context/SettingsContext';

const ACCENT_COLORS = [
    { name: 'Sky Blue', value: '#30C5FF' },
    { name: 'Hot Pink', value: '#FF4F79' },
    { name: 'Lime Green', value: '#22C55E' },
    { name: 'Vibrant Orange', value: '#F97316' },
    { name: 'Electric Purple', value: '#8B5CF6' },
    { name: 'Cyan', value: '#06B6D4' },
];

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { settings, updateSettings } = useSettings();
    const [accentColor, setAccentColor] = useState(settings.accentColor);
    const [metronomeVolume, setMetronomeVolume] = useState(settings.defaultMetronomeVolume);

    useEffect(() => {
        if (isOpen) {
            setAccentColor(settings.accentColor);
            setMetronomeVolume(settings.defaultMetronomeVolume);
        }
    }, [isOpen, settings]);
    
    const handleSave = () => {
        updateSettings({
            accentColor,
            defaultMetronomeVolume: metronomeVolume,
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Application Settings">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Accent Color</label>
                    <div className="flex flex-wrap gap-3">
                        {ACCENT_COLORS.map(color => (
                            <button
                                key={color.value}
                                type="button"
                                onClick={() => setAccentColor(color.value)}
                                className={`w-10 h-10 rounded-full border-2 transition-transform duration-150 ${accentColor === color.value ? 'border-white scale-110' : 'border-transparent'}`}
                                title={color.name}
                                style={{ backgroundColor: color.value }}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="metronome-volume" className="block text-sm font-medium text-gray-400 mb-2">
                        Default Metronome Volume
                    </label>
                    <input
                        id="metronome-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={metronomeVolume}
                        onChange={(e) => setMetronomeVolume(parseFloat(e.target.value))}
                        className="w-full h-2 bg-audio-dark-contrast rounded-lg appearance-none cursor-pointer accent-audio-accent"
                    />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-audio-dark-contrast rounded">Cancel</button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 bg-audio-accent text-white rounded">Save</button>
                </div>
            </div>
        </Modal>
    );
};
