
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { MixerTrackState } from '../types';
import { useSong } from './SongContext';

interface MixerContextType {
  trackStates: MixerTrackState[];
  setTrackStates: React.Dispatch<React.SetStateAction<MixerTrackState[]>>;
  updateTrackVolume: (trackId: string, volume: number) => void;
  updateTrackPan: (trackId: string, pan: number) => void;
  toggleMute: (trackId: string) => void;
  toggleSolo: (trackId: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MixerContext = createContext<MixerContextType | undefined>(undefined);

export const MixerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { activeSong } = useSong();
  const [history, setHistory] = useState<MixerTrackState[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const trackStates = history[historyIndex];
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const setTrackStates = (newStates: MixerTrackState[] | ((prev: MixerTrackState[]) => MixerTrackState[])) => {
    const updatedStates = typeof newStates === 'function' ? newStates(trackStates) : newStates;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updatedStates);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  useEffect(() => {
    if (activeSong) {
      const initialStates: MixerTrackState[] = activeSong.tracks.map(track => ({
        id: track.id,
        volume: 0.75,
        pan: 0,
        isMuted: false,
        isSolo: false,
      }));
      setHistory([initialStates]);
      setHistoryIndex(0);
    } else {
      setHistory([[]]);
      setHistoryIndex(0);
    }
  }, [activeSong]);
  
  const updateTrackState = (updater: (prevStates: MixerTrackState[]) => MixerTrackState[]) => {
      setTrackStates(updater);
  };

  const updateTrackVolume = (trackId: string, volume: number) => {
    updateTrackState(prev => prev.map(t => t.id === trackId ? { ...t, volume } : t));
  };

  const updateTrackPan = (trackId: string, pan: number) => {
    updateTrackState(prev => prev.map(t => t.id === trackId ? { ...t, pan } : t));
  };
  
  const toggleMute = (trackId: string) => {
      updateTrackState(prev => prev.map(t => t.id === trackId ? { ...t, isMuted: !t.isMuted, isSolo: false } : t));
  };

  const toggleSolo = (trackId: string) => {
    updateTrackState(prev => {
      const isCurrentlySolo = prev.find(t => t.id === trackId)?.isSolo;
      // If turning solo on, solo this track and unsolo others.
      if (!isCurrentlySolo) {
        return prev.map(t => ({
          ...t,
          isSolo: t.id === trackId,
          isMuted: false
        }));
      }
      // If turning solo off, unsolo all tracks.
      else {
        return prev.map(t => ({...t, isSolo: false}));
      }
    });
  };

  const undo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(prev => prev - 1);
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(prev => prev + 1);
    }
  }, [canRedo]);
  
  const value = {
    trackStates: trackStates || [],
    setTrackStates,
    updateTrackVolume,
    updateTrackPan,
    toggleMute,
    toggleSolo,
    undo,
    redo,
    canUndo,
    canRedo,
  };

  return <MixerContext.Provider value={value}>{children}</MixerContext.Provider>;
};

export const useMixer = (): MixerContextType => {
  const context = useContext(MixerContext);
  if (context === undefined) {
    throw new Error('useMixer must be used within a MixerProvider');
  }
  return context;
};