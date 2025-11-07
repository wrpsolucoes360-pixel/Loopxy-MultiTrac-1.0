
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { MidiMapping, MappableAction } from '../types';
import { useSong } from './SongContext';
import { useMixer } from './MixerContext';
import { usePlayback } from './PlaybackContext';

interface MidiContextType {
  isMidiSupported: boolean;
  isDeviceConnected: boolean;
  devices: MIDIInput[];
  activeDeviceId: string | null;
  setActiveDeviceId: (id: string | null) => void;
  mappings: MidiMapping;
  isLearningFor: string | null;
  learn: (actionId: string) => void;
  cancelLearn: () => void;
  clearMapping: (actionId: string) => void;
  mappableActions: MappableAction[];
}

const MidiContext = createContext<MidiContextType | undefined>(undefined);
const MIDI_MAPPINGS_KEY = 'loopxy_midiMappings';

export const MidiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMidiSupported, setIsMidiSupported] = useState(false);
  const [devices, setDevices] = useState<MIDIInput[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<MidiMapping>({});
  const [isLearningFor, setIsLearningFor] = useState<string | null>(null);
  
  const { activeSong } = useSong();
  const { trackStates, toggleMute, toggleSolo } = useMixer();
  const playback = usePlayback();

  const loadMappings = useCallback(() => {
    try {
      const stored = localStorage.getItem(MIDI_MAPPINGS_KEY);
      if (stored) {
        setMappings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load MIDI mappings from localStorage:', error);
    }
  }, []);

  const saveMappings = useCallback((newMappings: MidiMapping) => {
    try {
      localStorage.setItem(MIDI_MAPPINGS_KEY, JSON.stringify(newMappings));
    } catch (error) {
      console.error('Failed to save MIDI mappings to localStorage:', error);
    }
  }, []);

  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const [status, data1, data2] = event.data;
    const command = status & 0xf0;
    const velocity = data2;

    // Treat Note On with 0 velocity as Note Off for better compatibility
    if (command === 144 && velocity === 0) {
      // For learning, we don't want to map note-off events.
      // For execution, this event does nothing if only note-on is mapped.
      return; 
    }
    
    // We only care about Note On and Control Change for triggering actions
    if (command !== 144 && command !== 176) {
        return;
    }

    const midiKey = `${command}-${data1}`;

    if (isLearningFor) {
      const newMappings = { ...mappings, [midiKey]: isLearningFor };
      setMappings(newMappings);
      saveMappings(newMappings);
      setIsLearningFor(null);
    } else {
      const actionId = mappings[midiKey];
      if (actionId) {
        // Execute action based on ID
        if (actionId.startsWith('mute_track_')) {
          toggleMute(actionId.replace('mute_track_', ''));
        } else if (actionId.startsWith('solo_track_')) {
          toggleSolo(actionId.replace('solo_track_', ''));
        } else {
          switch (actionId) {
            case 'play': playback.play(); break;
            case 'pause': playback.pause(); break;
            case 'stop': playback.stop(); break;
            case 'play_pause': playback.isPlaying ? playback.pause() : playback.play(); break;
            case 'toggle_loop': playback.toggleLoop(); break;
            case 'seek_start': playback.seek(0); break;
          }
        }
      }
    }
  }, [isLearningFor, mappings, playback, saveMappings, toggleMute, toggleSolo]);

  const connectToDevice = useCallback((deviceId: string | null) => {
    // Clean up old listeners
    devices.forEach(device => {
        device.onmidimessage = null;
    });

    const device = devices.find(d => d.id === deviceId);
    if (device) {
      device.onmidimessage = handleMidiMessage;
      setActiveDeviceId(device.id);
      console.log(`Listening to MIDI device: ${device.name}`);
    } else {
      setActiveDeviceId(null);
    }
  }, [devices, handleMidiMessage]);
  
  const updateDevices = useCallback(() => {
    if (navigator.requestMIDIAccess) {
      setIsMidiSupported(true);
      navigator.requestMIDIAccess().then(
        (midiAccess) => {
          const inputs = Array.from(midiAccess.inputs.values());
          setDevices(inputs);
          
          if (inputs.length > 0) {
            // If no device is active or the active one is gone, select the first.
            const currentActiveDeviceExists = inputs.some(d => d.id === activeDeviceId);
            if (!currentActiveDeviceExists) {
                connectToDevice(inputs[0].id);
            }
          } else {
            setActiveDeviceId(null);
          }
          
          midiAccess.onstatechange = () => updateDevices();
        },
        () => {
          console.error('Could not access MIDI devices.');
          setIsMidiSupported(false);
        }
      );
    } else {
      setIsMidiSupported(false);
    }
  }, [activeDeviceId, connectToDevice]);

  useEffect(() => {
    loadMappings();
    updateDevices();
  }, [loadMappings, updateDevices]);

  const learn = (actionId: string) => {
    setIsLearningFor(actionId);
  };
  
  const cancelLearn = () => {
    setIsLearningFor(null);
  };
  
  const clearMapping = (actionId: string) => {
    const newMappings = { ...mappings };
    const keyToRemove = Object.keys(newMappings).find(key => newMappings[key] === actionId);
    if (keyToRemove) {
        delete newMappings[keyToRemove];
        setMappings(newMappings);
        saveMappings(newMappings);
    }
  };
  
  const mappableActions = useMemo<MappableAction[]>(() => {
    const actions: MappableAction[] = [
      { id: 'play', label: 'Play', group: 'Global Playback' },
      { id: 'pause', label: 'Pause', group: 'Global Playback' },
      { id: 'play_pause', label: 'Play / Pause', group: 'Global Playback' },
      { id: 'stop', label: 'Stop', group: 'Global Playback' },
      { id: 'seek_start', label: 'Go to Beginning', group: 'Global Playback' },
      { id: 'toggle_loop', label: 'Toggle Loop', group: 'Global Playback' },
    ];
    
    if (activeSong && trackStates.length > 0) {
        activeSong.tracks.forEach(track => {
            actions.push({
                id: `mute_track_${track.id}`,
                label: `Mute '${track.name}'`,
                group: `${activeSong.title} Tracks`
            });
            actions.push({
                id: `solo_track_${track.id}`,
                label: `Solo '${track.name}'`,
                group: `${activeSong.title} Tracks`
            });
        });
    }

    return actions;
  }, [activeSong, trackStates]);

  const value = {
    isMidiSupported,
    isDeviceConnected: !!activeDeviceId,
    devices,
    activeDeviceId,
    setActiveDeviceId: connectToDevice,
    mappings,
    isLearningFor,
    learn,
    cancelLearn,
    clearMapping,
    mappableActions,
  };

  return <MidiContext.Provider value={value}>{children}</MidiContext.Provider>;
};

export const useMidi = (): MidiContextType => {
  const context = useContext(MidiContext);
  if (context === undefined) {
    throw new Error('useMidi must be used within a MidiProvider');
  }
  return context;
};
