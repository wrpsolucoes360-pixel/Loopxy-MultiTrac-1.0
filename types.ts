

export interface Track {
  id: string;
  name: string;
  url?: string; // Will be a transient blob URL for playback, loaded from IndexedDB
  color?: TrackColor;
}

export interface SongSection {
  label: string;
  durationPercentage: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  bpm: number;
  key: string;
  songColor?: TrackColor;
  tracks: Track[];
  structure?: SongSection[];
  updatedAt: number; // For sync conflict resolution
}

export interface Setlist {
  id:string;
  name: string;
  songIds: string[];
  updatedAt: number; // For sync conflict resolution
}

export interface MixerTrackState {
  id: string;
  volume: number; // 0 to 1
  pan: number; // -1 (left) to 1 (right)
  isMuted: boolean;
  isSolo: boolean;
}

export enum TrackColor {
    Red = 'track-red',
    Blue = 'track-blue',
    Green = 'track-green',
    Yellow = 'track-yellow',
    Purple = 'track-purple',
    Cyan = 'track-cyan',
    Orange = 'track-orange',
}

// Google Drive Sync Types
export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'unauthenticated';

export interface GoogleUser {
    name: string;
    email: string;
    imageUrl: string;
}

// MIDI Types
export interface MidiMapping {
  [midiKey: string]: string; // e.g., { "144-60": "play" }
}

export interface MappableAction {
  id: string;        // e.g., "play", "mute_track-t1-2"
  label: string;     // e.g., "Play", "Mute 'Bass'"
  group: string;     // e.g., "Global Playback", "I Speak Jesus (Live) Tracks"
}

// Playback Types
export interface MetronomeSettings {
    enabled: boolean;
    continuous: boolean; // Play during the whole song
    countInBars: number; // 0 for no count-in
    volume: number;      // 0 to 1
}