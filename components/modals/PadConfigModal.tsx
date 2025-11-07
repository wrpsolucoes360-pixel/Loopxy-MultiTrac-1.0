import React, { useState, useEffect } from 'react';
import { Modal } from '../core/Modal';
import { PadConfig, WaveformType } from '../mixer/PadPlayer';

interface PadConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newConfig: PadConfig) => void;
  currentConfig: PadConfig;
}

const WAVEFORM_OPTIONS: { id: WaveformType; label: string }[] = [
    { id: 'sine', label: 'Sine (Smooth)' },
    { id: 'square', label: 'Square (Retro)' },
    { id: 'sawtooth', label: 'Sawtooth (Bright)' },
    { id: 'triangle', label: 'Triangle (Mellow)' },
];

export const PadConfigModal: React.FC<PadConfigModalProps> = ({ isOpen, onClose, onSave, currentConfig }) => {
    const [name, setName] = useState(currentConfig.name);
    const [artworkUrl, setArtworkUrl] = useState(currentConfig.artworkUrl);
    const [waveform, setWaveform] = useState(currentConfig.waveform);

    useEffect(() => {
        if (isOpen) {
            setName(currentConfig.name);
            setArtworkUrl(currentConfig.artworkUrl);
            setWaveform(currentConfig.waveform);
        }
    }, [isOpen, currentConfig]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const newUrl = URL.createObjectURL(file);
            // It's good practice to revoke the old URL if it's a blob URL
            if (artworkUrl.startsWith('blob:')) {
                URL.revokeObjectURL(artworkUrl);
            }
            setArtworkUrl(newUrl);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, artworkUrl, waveform });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configure Ambient Pad">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="pad-name" className="block text-sm font-medium text-gray-400">Pad Name</label>
                    <input
                        id="pad-name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full p-2 bg-audio-dark-contrast rounded mt-1"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400">Pad Artwork</label>
                    <div className="mt-1 flex items-center gap-4">
                        <img src={artworkUrl} alt="Pad artwork" className="w-16 h-16 rounded object-cover" />
                        <label htmlFor="artwork-upload" className="cursor-pointer bg-audio-dark-contrast px-3 py-1 sm:py-2 rounded-md text-sm font-medium hover:bg-gray-700">
                            Change Image
                            <input id="artwork-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400">Pad Sound (Waveform)</label>
                    <div className="mt-2 space-y-2">
                        {WAVEFORM_OPTIONS.map(option => (
                            <label key={option.id} className="flex items-center gap-2 p-2 bg-audio-dark-contrast rounded-md has-[:checked]:bg-audio-accent/20 has-[:checked]:ring-1 has-[:checked]:ring-audio-accent cursor-pointer">
                                <input
                                    type="radio"
                                    name="waveform"
                                    value={option.id}
                                    checked={waveform === option.id}
                                    onChange={() => setWaveform(option.id)}
                                    className="h-4 w-4 rounded-full border-gray-600 bg-gray-700 text-audio-accent focus:ring-audio-accent-darker"
                                />
                                <span className="text-sm font-medium">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
                
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-3 py-1 sm:px-4 sm:py-2 bg-audio-dark-contrast rounded">Cancel</button>
                    <button type="submit" className="px-3 py-1 sm:px-4 sm:py-2 bg-audio-accent text-white rounded">Save</button>
                </div>
            </form>
        </Modal>
    );
};