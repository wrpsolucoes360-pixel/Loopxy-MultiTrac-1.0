
import React from 'react';
import { Modal } from '../core/Modal';
import { useMidi } from '../../context/MidiContext';
import { MappableAction } from '../../types';
import { Spinner } from '../core/Spinner';

const getNoteName = (noteNumber: number): string => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1;
    return `${notes[noteNumber % 12]}${octave}`;
};

const formatMidiKey = (key: string): string => {
    const [command, data1] = key.split('-').map(Number);
    if (command === 144) { // Note On
        return `Note ${getNoteName(data1)}`;
    }
    if (command === 176) { // Control Change
        return `CC ${data1}`;
    }
    return 'Unknown';
};


export const MidiMappingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const {
        isMidiSupported,
        devices,
        activeDeviceId,
        setActiveDeviceId,
        mappings,
        isLearningFor,
        learn,
        cancelLearn,
        clearMapping,
        mappableActions
    } = useMidi();

    const handleClose = () => {
        cancelLearn();
        onClose();
    };
    
    const groupedActions = mappableActions.reduce((acc, action) => {
        if (!acc[action.group]) {
            acc[action.group] = [];
        }
        acc[action.group].push(action);
        return acc;
    }, {} as Record<string, MappableAction[]>);

    const reversedMappings = Object.entries(mappings).reduce((acc, [key, value]) => {
        acc[value] = key;
        return acc;
    }, {} as Record<string, string>);

    const renderContent = () => {
        if (!isMidiSupported) {
            return <p className="text-audio-light-contrast">Your browser does not support MIDI, or you have not granted permission.</p>;
        }
        if (devices.length === 0) {
            return <p className="text-audio-light-contrast">No MIDI devices connected. Please connect a device and refresh.</p>;
        }

        return (
            <div className="space-y-6">
                <div>
                    <label htmlFor="midi-device-select" className="block text-sm font-medium text-gray-400 mb-2">Active MIDI Device</label>
                    <select
                        id="midi-device-select"
                        value={activeDeviceId || ''}
                        onChange={(e) => setActiveDeviceId(e.target.value)}
                        className="w-full p-2 bg-audio-dark-contrast rounded border border-gray-600"
                    >
                        {devices.map(device => (
                            <option key={device.id} value={device.id}>{device.name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {Object.entries(groupedActions).map(([group, actions]) => (
                        <div key={group}>
                            <h3 className="font-bold text-lg mb-2">{group}</h3>
                            <ul className="space-y-2">
                                {actions.map(action => (
                                    <li key={action.id} className="flex items-center justify-between p-2 bg-audio-dark-contrast rounded-md">
                                        <span className="text-sm">{action.label}</span>
                                        <div className="flex items-center gap-2">
                                            {isLearningFor === action.id ? (
                                                <>
                                                    <span className="text-sm font-mono text-audio-accent flex items-center gap-2">
                                                        <Spinner size="w-4 h-4" />
                                                        Listening...
                                                    </span>
                                                    <button onClick={cancelLearn} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                                                </>
                                            ) : reversedMappings[action.id] ? (
                                                <>
                                                    <span className="text-sm font-mono bg-audio-dark px-2 py-1 rounded">{formatMidiKey(reversedMappings[action.id])}</span>
                                                    <button onClick={() => clearMapping(action.id)} className="text-xs text-gray-400 hover:text-white">Clear</button>
                                                </>

                                            ) : (
                                                <button onClick={() => learn(action.id)} className="px-3 py-1 text-sm bg-audio-accent text-white rounded hover:bg-audio-accent-darker disabled:opacity-50" disabled={!!isLearningFor}>Learn</button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="MIDI Mappings">
            {renderContent()}
        </Modal>
    );
};
