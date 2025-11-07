import { Song, Setlist, TrackColor } from './types';

// Using placeholder audio URLs. In a real scenario, these would be blob URLs or from a cloud service.
const placeholderAudio = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/123941/Yodel_Sound_Effect.mp3';
const now = Date.now();

export const INITIAL_SONGS: Song[] = [
  {
    id: 'song-1',
    title: 'I Speak Jesus (Live)',
    artist: 'Charity Gayle',
    artworkUrl: 'https://picsum.photos/id/101/100/100',
    bpm: 74,
    key: 'E',
    songColor: TrackColor.Blue,
    tracks: [
      { id: 't1-1', name: 'Drums 1', url: placeholderAudio },
      { id: 't1-2', name: 'Bass', url: placeholderAudio },
      { id: 't1-3', name: 'Guitar 1', url: placeholderAudio },
      { id: 't1-4', name: 'Vocals', url: placeholderAudio, color: TrackColor.Yellow }, // Override
    ],
    structure: [
        { label: 'Intro', durationPercentage: 15 },
        { label: 'Verse 1', durationPercentage: 25 },
        { label: 'Chorus', durationPercentage: 30 },
        { label: 'Verse 2', durationPercentage: 25 },
        { label: 'Outro', durationPercentage: 5 },
    ],
    updatedAt: now,
  },
  {
    id: 'song-2',
    title: 'I Thank God',
    artist: 'Maverick City',
    artworkUrl: 'https://picsum.photos/id/102/100/100',
    bpm: 128,
    key: 'E',
    tracks: [
      { id: 't2-1', name: 'Drums', url: placeholderAudio, color: TrackColor.Red },
      { id: 't2-2', name: 'Synth Bass', url: placeholderAudio, color: TrackColor.Blue },
      { id: 't2-3', name: 'Piano', url: placeholderAudio, color: TrackColor.Purple },
      { id: 't2-4', name: 'Lead Vocal', url: placeholderAudio, color: TrackColor.Yellow },
      { id: 't2-5', name: 'Backing Vocals', url: placeholderAudio, color: TrackColor.Cyan },
    ],
    updatedAt: now,
  },
   {
    id: 'song-3',
    title: 'Praise',
    artist: 'Elevation Worship',
    artworkUrl: 'https://picsum.photos/id/103/100/100',
    bpm: 127,
    key: 'A',
    songColor: TrackColor.Orange,
    tracks: [
      { id: 't3-1', name: 'Drums', url: placeholderAudio },
      { id: 't3-2', name: 'Bass', url: placeholderAudio },
      { id: 't3-3', name: 'EG 1', url: placeholderAudio, color: TrackColor.Green },
      { id: 't3-4', name: 'EG 2', url: placeholderAudio, color: TrackColor.Cyan },
      { id: 't3-5', name: 'Keys', url: placeholderAudio, color: TrackColor.Purple },
      { id: 't3-6', name: 'Lead Vocals', url: placeholderAudio, color: TrackColor.Yellow },
    ],
    updatedAt: now,
  },
  {
    id: 'song-4',
    title: 'Goodbye Yesterday',
    artist: 'Original version',
    artworkUrl: 'https://picsum.photos/id/104/100/100',
    bpm: 120,
    key: 'Ab',
    songColor: TrackColor.Purple,
    tracks: [
        { id: 't4-1', name: 'Kick', url: placeholderAudio },
        { id: 't4-2', name: 'Snare', url: placeholderAudio },
        { id: 't4-3', name: 'Bass', url: placeholderAudio },
        { id: 't4-4', name: 'Synth Pad', url: placeholderAudio },
    ],
    updatedAt: now,
  }
];

export const INITIAL_SETLISTS: Setlist[] = [
  {
    id: 'setlist-1',
    name: 'Sunday Setlist 20 March',
    songIds: ['song-1', 'song-2', 'song-3', 'song-4'],
    updatedAt: now,
  },
  {
    id: 'setlist-2',
    name: 'Practice Session',
    songIds: ['song-2', 'song-4'],
    updatedAt: now,
  },
];