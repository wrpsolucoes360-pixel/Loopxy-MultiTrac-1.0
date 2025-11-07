

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback } from 'react';
import { useSong } from './SongContext';
import { useMixer } from './MixerContext';
import { MetronomeSettings } from '../types';
import { useSettings } from './SettingsContext';

interface PlaybackContextType {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loadingProgress: Record<string, number>;
  isFullyLoaded: boolean;
  error: string | null;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  isLooping: boolean;
  toggleLoop: () => void;
  loopStart: number;
  loopEnd: number;
  setLoopPoints: (start: number, end: number) => void;
  masterVolume: number;
  setMasterVolume: (volume: number) => void;
  trackLevels: Record<string, number>;
  masterBpm: number | null;
  toggleMasterBpm: () => void;
  pitchShift: number; // In semitones
  transposeUp: () => void;
  transposeDown: () => void;
  resetPitch: () => void;
  metronomeSettings: MetronomeSettings;
  updateMetronomeSettings: (settings: Partial<MetronomeSettings>) => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

export const PlaybackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { activeSong } = useSong();
  const { trackStates } = useMixer();
  const { settings } = useSettings();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState<Record<string, number>>({});
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [masterVolume, setMasterVolume] = useState(1);
  const [trackLevels, setTrackLevels] = useState<Record<string, number>>({});
  const [masterBpm, setMasterBpm] = useState<number | null>(null);
  const [pitchShift, setPitchShift] = useState(0); // in semitones
  const [metronomeSettings, setMetronomeSettings] = useState<MetronomeSettings>({
    enabled: false,
    continuous: false,
    countInBars: 1,
    volume: settings.defaultMetronomeVolume,
  });

  const audioSources = useRef<{ source: AudioBufferSourceNode, destination: AudioNode }[]>([]);
  const gainNodes = useRef<Record<string, GainNode>>({});
  const pannerNodes = useRef<Record<string, StereoPannerNode>>({});
  const analyserNodes = useRef<Record<string, AnalyserNode>>({});
  const dataArrays = useRef<Record<string, Uint8Array>>({});
  const audioBuffers = useRef<Record<string, AudioBuffer>>({});
  const animationFrameId = useRef<number | undefined>();
  const playbackStartTime = useRef<number>(0);
  const pauseTime = useRef<number>(0);
  const masterGainNode = useRef<GainNode>(audioContext.createGain());
  const metronomeGainNode = useRef<GainNode>(audioContext.createGain());
  const metronomeSources = useRef<OscillatorNode[]>([]);


  useEffect(() => {
    masterGainNode.current.connect(audioContext.destination);
    metronomeGainNode.current.connect(audioContext.destination);
    return () => {
        try {
            masterGainNode.current.disconnect(audioContext.destination);
            metronomeGainNode.current.disconnect(audioContext.destination);
        } catch(e) { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    masterGainNode.current.gain.setValueAtTime(masterVolume, audioContext.currentTime);
  }, [masterVolume]);
  
  useEffect(() => {
    metronomeGainNode.current.gain.setValueAtTime(metronomeSettings.volume, audioContext.currentTime);
  }, [metronomeSettings.volume]);


  const cleanupAudio = useCallback(() => {
    audioSources.current.forEach(({ source, destination }) => {
      try {
        source.stop(audioContext.currentTime);
      } catch (e) { /* ignore if already stopped */ }
      source.disconnect(destination);
    });
    audioSources.current = [];
    
    metronomeSources.current.forEach(source => {
        try { source.stop(audioContext.currentTime); } catch (e) { /* ignore */ }
        // FIX: The disconnect method was called without arguments which can cause a TypeScript error. Metronome sources are connected
        // to metronomeGainNode.current, so we disconnect from that explicitly to resolve the error.
        source.disconnect(metronomeGainNode.current);
    });
    metronomeSources.current = [];

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
  }, []);

  useEffect(() => {
    return () => {
        cleanupAudio();
    };
  }, [cleanupAudio]);
  
    // When the default metronome volume changes in settings, update it for the current song if not playing.
    useEffect(() => {
        if (!isPlaying) {
            setMetronomeSettings(prev => ({...prev, volume: settings.defaultMetronomeVolume}));
        }
    }, [settings.defaultMetronomeVolume, isPlaying]);

  const loadAudioData = useCallback(() => {
    if (!activeSong) {
      cleanupAudio();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setLoadingProgress({});
      setIsFullyLoaded(false);
      setError(null);
      setPitchShift(0);
      return;
    }
      
    cleanupAudio();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoadingProgress({});
    setIsFullyLoaded(false);
    setError(null);
    audioBuffers.current = {};
    gainNodes.current = {};
    pannerNodes.current = {};
    analyserNodes.current = {};
    dataArrays.current = {};
    setTrackLevels({});
    setPitchShift(0);
    setMetronomeSettings(prev => ({ // Reset metronome settings for new song
        ...prev,
        enabled: false,
        continuous: false,
        volume: settings.defaultMetronomeVolume
    }));

    const trackPromises = activeSong.tracks.map((track) => {
        return new Promise<number>((resolve) => {
            if (!track.url) {
                console.error(`Track ${track.name} is missing a URL.`);
                setError(`Track "${track.name}" has no audio.`);
                setLoadingProgress((prev) => ({ ...prev, [track.id]: -1 }));
                return resolve(0);
            }

            const xhr = new XMLHttpRequest();
            xhr.open('GET', track.url, true);
            xhr.responseType = 'arraybuffer';

            xhr.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    setLoadingProgress((prev) => ({ ...prev, [track.id]: percentComplete }));
                }
            };

            xhr.onload = async () => {
                if (xhr.status === 200) {
                    try {
                        const decodedData = await audioContext.decodeAudioData(xhr.response);
                        audioBuffers.current[track.id] = decodedData;

                        gainNodes.current[track.id] = audioContext.createGain();
                        gainNodes.current[track.id].connect(masterGainNode.current);

                        pannerNodes.current[track.id] = audioContext.createStereoPanner();
                        pannerNodes.current[track.id].connect(gainNodes.current[track.id]);
                        
                        const analyser = audioContext.createAnalyser();
                        analyser.fftSize = 32;
                        analyserNodes.current[track.id] = analyser;
                        dataArrays.current[track.id] = new Uint8Array(analyser.frequencyBinCount);

                        setLoadingProgress((prev) => ({ ...prev, [track.id]: 100 }));
                        resolve(decodedData.duration);
                    } catch (err) {
                        console.error(`Error decoding track ${track.name}:`, err);
                        setError(`Could not decode ${track.name}.`);
                        setLoadingProgress((prev) => ({ ...prev, [track.id]: -1 }));
                        resolve(0);
                    }
                } else {
                    console.error(`Error loading track ${track.name}: Status ${xhr.status}`);
                    setError(`Could not load ${track.name}.`);
                    setLoadingProgress((prev) => ({ ...prev, [track.id]: -1 }));
                    resolve(0);
                }
            };

            xhr.onerror = () => {
                console.error(`Network error loading track ${track.name}.`);
                setError(`Could not load ${track.name}.`);
                setLoadingProgress((prev) => ({ ...prev, [track.id]: -1 }));
                resolve(0);
            };

            setLoadingProgress((prev) => ({ ...prev, [track.id]: 0 }));
            xhr.send();
        });
    });

    Promise.all(trackPromises).then((durations) => {
        const maxDuration = Math.max(...durations.filter(d => d > 0));
        if (maxDuration > 0) {
            setDuration(maxDuration);
            setLoopEnd(maxDuration);
        }
        setIsFullyLoaded(true);
    });
  }, [activeSong, cleanupAudio, settings.defaultMetronomeVolume]);


  useEffect(() => {
    loadAudioData();
  }, [loadAudioData]);


  const updateTrackParameters = useCallback(() => {
    if (!trackStates.length || !isFullyLoaded) return;

    const isAnyTrackSoloed = trackStates.some(t => t.isSolo);

    for (const trackState of trackStates) {
      const gainNode = gainNodes.current[trackState.id];
      const pannerNode = pannerNodes.current[trackState.id];

      if (gainNode) {
        let targetVolume = 0;
        if (isAnyTrackSoloed) {
          if (trackState.isSolo) {
            targetVolume = trackState.volume;
          }
        } else {
          if (!trackState.isMuted) {
            targetVolume = trackState.volume;
          }
        }
        gainNode.gain.setValueAtTime(targetVolume, audioContext.currentTime);
      }

      if (pannerNode) {
        pannerNode.pan.setValueAtTime(trackState.pan, audioContext.currentTime);
      }
    }
  }, [trackStates, isFullyLoaded]);

  useEffect(() => {
    updateTrackParameters();
  }, [trackStates, updateTrackParameters]);
  
  const setupAndPlay = useCallback((offset: number, when: number = audioContext.currentTime) => {
    if (!activeSong) return;
    cleanupAudio();
    
    let rate = 1;
    if (masterBpm !== null && activeSong && activeSong.bpm > 0) {
      rate = masterBpm / activeSong.bpm;
    }

    const sources = activeSong!.tracks.map(track => {
      const buffer = audioBuffers.current[track.id];
      if (!buffer) return null;

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      source.detune.value = pitchShift * 100;

      const analyser = analyserNodes.current[track.id];
      const panner = pannerNodes.current[track.id];
      const gainNode = gainNodes.current[track.id];

      let destinationNode: AudioNode | null = null;
      if (analyser && panner && gainNode) {
        source.connect(analyser);
        analyser.connect(panner);
        destinationNode = analyser;
      } else if (gainNode) {
        source.connect(gainNode);
        destinationNode = gainNode;
      }
      
      source.start(when, offset);
      return destinationNode ? { source, destination: destinationNode } : null;
    }).filter((s): s is { source: AudioBufferSourceNode, destination: AudioNode } => s !== null);
    
    audioSources.current = sources;
    updateTrackParameters();

  }, [activeSong, cleanupAudio, updateTrackParameters, masterBpm, pitchShift]);

  useEffect(() => {
    audioSources.current.forEach(({ source }) => {
        source.detune.setValueAtTime(pitchShift * 100, audioContext.currentTime);
    });
  }, [pitchShift]);


  const stop = useCallback(() => {
    cleanupAudio();
    setIsPlaying(false);
    setCurrentTime(0);
    pauseTime.current = 0;
  }, [cleanupAudio]);

  const tick = useCallback(() => {
    if (!isPlaying) {
      setTrackLevels({});
      return;
    }

    let newTime = audioContext.currentTime - playbackStartTime.current;
    if (isLooping && newTime >= loopEnd) {
      const loopDuration = loopEnd - loopStart;
      const timeOver = newTime - loopEnd;
      newTime = loopStart + (timeOver % loopDuration);
      
      const audioStartTime = audioContext.currentTime - (newTime - loopStart);
      playbackStartTime.current = audioStartTime - loopStart;

      setupAndPlay(loopStart, audioStartTime);
    }

    setCurrentTime(Math.max(0, newTime));
    
    const newLevels: Record<string, number> = {};
    if (activeSong) {
      activeSong.tracks.forEach(track => {
        const analyser = analyserNodes.current[track.id];
        const dataArray = dataArrays.current[track.id];
        if (analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray);
          let peak = 0;
          for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] > peak) peak = dataArray[i];
          }
          newLevels[track.id] = peak / 255;
        }
      });
      setTrackLevels(newLevels);
    }

    if (newTime >= duration) {
        stop();
    } else {
        animationFrameId.current = requestAnimationFrame(tick);
    }
  }, [duration, isLooping, isPlaying, loopEnd, loopStart, setupAndPlay, stop, activeSong]);

  const play = () => {
    if (isPlaying || !isFullyLoaded) return;
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    const { enabled, countInBars, continuous } = metronomeSettings;
    const bpm = masterBpm || activeSong?.bpm;

    const scheduleClick = (time: number, isDownbeat: boolean) => {
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isDownbeat ? 880 : 440, time);
        osc.connect(metronomeGainNode.current);
        osc.start(time);
        osc.stop(time + 0.05);
        metronomeSources.current.push(osc);
    };

    let countInDuration = 0;
    if (enabled && bpm && bpm > 0 && countInBars > 0 && pauseTime.current === 0) {
        const beatDuration = 60 / bpm;
        const countInBeats = countInBars * 4; // Assume 4/4
        countInDuration = countInBeats * beatDuration;
        
        const startTime = audioContext.currentTime;
        for (let i = 0; i < countInBeats; i++) {
            scheduleClick(startTime + i * beatDuration, i % 4 === 0);
        }

        if (continuous) {
            const totalBeats = Math.floor(duration / beatDuration);
            for (let i = 0; i < totalBeats; i++) {
                 scheduleClick(startTime + countInDuration + i * beatDuration, i % 4 === 0);
            }
        }
    } else if (enabled && bpm && bpm > 0 && continuous) {
        // Handle starting continuous click from a seeked position
        const beatDuration = 60 / bpm;
        const firstBeatAfterSeek = Math.ceil(pauseTime.current / beatDuration);
        const remainingDuration = duration - (firstBeatAfterSeek * beatDuration);
        const remainingBeats = Math.floor(remainingDuration / beatDuration);
        const startTime = audioContext.currentTime;

        for(let i=0; i < remainingBeats; i++) {
            const beatNumber = firstBeatAfterSeek + i;
            const time = startTime + (beatNumber * beatDuration) - pauseTime.current;
            scheduleClick(time, beatNumber % 4 === 0);
        }
    }

    const audioStartTime = audioContext.currentTime + countInDuration;
    playbackStartTime.current = audioStartTime - pauseTime.current;
    
    setupAndPlay(pauseTime.current, audioStartTime);
    setIsPlaying(true);
    animationFrameId.current = requestAnimationFrame(tick);
  };
  
  const pause = () => {
    if (!isPlaying) return;
    pauseTime.current = audioContext.currentTime - playbackStartTime.current;
    cleanupAudio();
    setIsPlaying(false);
  };
  
  const seek = (time: number) => {
    const newTime = Math.max(0, Math.min(time, duration));
    pauseTime.current = newTime;
    setCurrentTime(newTime);
    if (isPlaying) {
      playbackStartTime.current = audioContext.currentTime - newTime;
      setupAndPlay(newTime);
    }
  };
  
  const toggleLoop = () => setIsLooping(prev => !prev);
  
  const setLoopPoints = (start: number, end: number) => {
      setLoopStart(Math.max(0, start));
      setLoopEnd(Math.min(duration, end));
  };

  const toggleMasterBpm = useCallback(() => {
    if (!activeSong || !isFullyLoaded) return;
    const newMasterBpm = masterBpm === activeSong.bpm ? null : activeSong.bpm;
    setMasterBpm(newMasterBpm);
    let rate = 1;
    if (newMasterBpm !== null && activeSong.bpm > 0) {
      rate = newMasterBpm / activeSong.bpm;
    }
    audioSources.current.forEach(({ source }) => {
        source.playbackRate.setValueAtTime(rate, audioContext.currentTime);
    });
  }, [activeSong, masterBpm, isFullyLoaded]);

  const setMasterVolumeCallback = useCallback((volume: number) => {
    setMasterVolume(Math.max(0, Math.min(1, volume)));
  }, []);

  const updateMetronomeSettings = useCallback((settings: Partial<MetronomeSettings>) => {
    setMetronomeSettings(prev => ({ ...prev, ...settings }));
  }, []);

  const transposeUp = () => setPitchShift(p => p + 1);
  const transposeDown = () => setPitchShift(p => p - 1);
  const resetPitch = () => setPitchShift(0);
  
  const value = {
    isPlaying,
    currentTime,
    duration,
    loadingProgress,
    isFullyLoaded,
    error,
    play,
    pause,
    stop,
    seek,
    isLooping,
    toggleLoop,
    loopStart,
    loopEnd,
    setLoopPoints,
    masterVolume,
    setMasterVolume: setMasterVolumeCallback,
    trackLevels,
    masterBpm,
    toggleMasterBpm,
    pitchShift,
    transposeUp,
    transposeDown,
    resetPitch,
    metronomeSettings,
    updateMetronomeSettings,
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

export const usePlayback = (): PlaybackContextType => {
  const context = useContext(PlaybackContext);
  if (context === undefined) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
};
