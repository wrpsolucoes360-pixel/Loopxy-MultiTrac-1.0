
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { Song, Setlist, Track } from '../types';
import { INITIAL_SONGS, INITIAL_SETLISTS } from '../constants';
import { dbGetSongs, dbGetSetlists, dbAddSong, dbUpdateSong, dbAddSetlist, dbUpdateSetlist, dbGetAudioBlob, dbCount } from '../services/db';
import { useGoogleDrive } from './GoogleDriveContext';

interface SongContextType {
  songs: Song[];
  setlists: Setlist[];
  activeSetlist: Setlist | null;
  activeSong: Song | null;
  addSong: (songData: Omit<Song, 'id' | 'updatedAt'>, files: File[]) => Promise<Song>;
  createSetlist: (name: string, songIds: string[]) => void;
  setActiveSetlistId: (id: string | null) => void;
  setActiveSongId: (id: string | null) => void;
  updateSong: (updatedSong: Song) => void;
  reorderSongsInSetlist: (setlistId: string, orderedSongIds: string[]) => void;
  reloadDataFromDb: () => Promise<void>;
}

const SongContext = createContext<SongContextType | undefined>(undefined);

export const SongProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [hydratedActiveSong, setHydratedActiveSong] = useState<Song | null>(null);
  const activeBlobUrls = useRef<string[]>([]);
  const { setNeedsSync, registerReloadCallback } = useGoogleDrive();

  const loadData = useCallback(async () => {
      try {
        const songCount = await dbCount('songs');
        if (songCount === 0) {
          console.log('Database is empty, seeding initial data...');
          // Seed songs
          for (const song of INITIAL_SONGS) {
            const audioFiles = await Promise.all(song.tracks.map(async (track) => {
                const response = await fetch(track.url!);
                const blob = await response.blob();
                return { audioId: track.id, blob };
            }));
            const songToStore = { ...song, tracks: song.tracks.map(t => ({...t, url: undefined}))};
            await dbAddSong(songToStore, audioFiles);
          }
          // Seed setlists
          for (const setlist of INITIAL_SETLISTS) {
            await dbAddSetlist(setlist);
          }
           setNeedsSync(true); // Data was seeded, needs to be synced
        }

        const [dbSongs, dbSetlists] = await Promise.all([dbGetSongs(), dbGetSetlists()]);
        setSongs(dbSongs);
        setSetlists(dbSetlists);

        if (!activeSetlistId) {
            const storedActiveSetlistId = localStorage.getItem('loopxy_activeSetlistId');
             if (storedActiveSetlistId && dbSetlists.some(s => s.id === JSON.parse(storedActiveSetlistId))) {
               setActiveSetlistId(JSON.parse(storedActiveSetlistId));
             } else {
               setActiveSetlistId(dbSetlists[0]?.id || null);
             }
        }
      } catch (error) {
        console.error("Failed to load or seed data from IndexedDB", error);
      }
    }, [activeSetlistId, setNeedsSync]);

  // Load initial data from IndexedDB
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Register the reload function with the Google Drive context
  useEffect(() => {
    registerReloadCallback(loadData);
  }, [registerReloadCallback, loadData]);


  // Persist active setlist ID to localStorage
  useEffect(() => {
    try {
      if (activeSetlistId) {
        localStorage.setItem('loopxy_activeSetlistId', JSON.stringify(activeSetlistId));
      } else {
        localStorage.removeItem('loopxy_activeSetlistId');
      }
    } catch (error) {
      console.error("Failed to save active setlist ID to localStorage", error);
    }
  }, [activeSetlistId]);

  // Hydrate active song with blob URLs
  useEffect(() => {
    // Revoke old blob URLs to prevent memory leaks
    activeBlobUrls.current.forEach(URL.revokeObjectURL);
    activeBlobUrls.current = [];

    if (!activeSongId) {
      setHydratedActiveSong(null);
      return;
    }

    const songToHydrate = songs.find(s => s.id === activeSongId);
    if (!songToHydrate) {
      setHydratedActiveSong(null);
      return;
    }

    let isCancelled = false;
    
    const hydrate = async () => {
      try {
        const hydratedTracks = await Promise.all(
          songToHydrate.tracks.map(async (track) => {
            const blob = await dbGetAudioBlob(track.id);
            if (!blob) {
              console.error(`Audio blob not found for track ID: ${track.id}`);
              return { ...track, url: '' }; // Return with empty URL on error
            }
            const url = URL.createObjectURL(blob);
            activeBlobUrls.current.push(url);
            return { ...track, url };
          })
        );
        
        if (!isCancelled) {
          setHydratedActiveSong({ ...songToHydrate, tracks: hydratedTracks });
        }

      } catch (error) {
        console.error("Error hydrating song:", error);
        if (!isCancelled) {
          setHydratedActiveSong(songToHydrate); // Set with missing URLs on error
        }
      }
    };

    hydrate();

    return () => {
      isCancelled = true;
    };
  }, [activeSongId, songs]);

  const addSong = useCallback(async (songData: Omit<Song, 'id' | 'updatedAt'>, files: File[]): Promise<Song> => {
    const newSong: Song = { ...songData, id: `song-${Date.now()}`, updatedAt: Date.now() };
    const audioFiles = files.map((file, index) => ({
      audioId: newSong.tracks[index].id,
      blob: file,
    }));

    const songToStore = { ...newSong, tracks: newSong.tracks.map(t => ({...t, url: undefined}))};

    await dbAddSong(songToStore, audioFiles);
    const updatedSongs = await dbGetSongs();
    setSongs(updatedSongs);
    setNeedsSync(true);
    return newSong;
  }, [setNeedsSync]);

  const updateSong = useCallback(async (updatedSong: Song) => {
    const songWithTimestamp = { ...updatedSong, updatedAt: Date.now() };
    // We only store track metadata in the song object, not the blob URLs
    const songToStore = { ...songWithTimestamp, tracks: songWithTimestamp.tracks.map(t => ({...t, url: undefined}))};
    await dbUpdateSong(songToStore);
    setSongs(prevSongs => prevSongs.map(song => song.id === songWithTimestamp.id ? songWithTimestamp : song));
    setNeedsSync(true);
  }, [setNeedsSync]);

  const createSetlist = useCallback(async (name: string, songIds: string[]) => {
    const newSetlist: Setlist = { id: `setlist-${Date.now()}`, name, songIds, updatedAt: Date.now() };
    await dbAddSetlist(newSetlist);
    const updatedSetlists = await dbGetSetlists();
    setSetlists(updatedSetlists);
    setActiveSetlistId(newSetlist.id);
    setNeedsSync(true);
  }, [setNeedsSync]);

  const reorderSongsInSetlist = useCallback(async (setlistId: string, orderedSongIds: string[]) => {
    const setlist = setlists.find(sl => sl.id === setlistId);
    if (setlist) {
      const updatedSetlist = { ...setlist, songIds: orderedSongIds, updatedAt: Date.now() };
      await dbUpdateSetlist(updatedSetlist);
      setSetlists(prevSetlists =>
        prevSetlists.map(sl =>
          sl.id === setlistId ? updatedSetlist : sl
        )
      );
      setNeedsSync(true);
    }
  }, [setlists, setNeedsSync]);

  const activeSetlist = setlists.find(s => s.id === activeSetlistId) || null;
  
  // Set first song of active setlist as active song if none is selected
  useEffect(() => {
    if (activeSetlist && !activeSongId) {
        const firstSongId = activeSetlist.songIds[0];
        if (firstSongId && songs.some(s => s.id === firstSongId)) {
            setActiveSongId(firstSongId);
        } else if (!firstSongId) {
            setActiveSongId(null);
        }
    } else if (activeSetlist && activeSongId && !activeSetlist.songIds.includes(activeSongId)) {
        // If the active song is no longer in the active setlist, deselect it
        // or select the first one.
        setActiveSongId(activeSetlist.songIds[0] || null);
    }
  }, [activeSetlist, activeSongId, songs]);

  const value = {
    songs,
    setlists,
    activeSetlist,
    activeSong: hydratedActiveSong,
    addSong,
    createSetlist,
    setActiveSetlistId,
    setActiveSongId,
    updateSong,
    reorderSongsInSetlist,
    reloadDataFromDb: loadData,
  };

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>;
};

export const useSong = (): SongContextType => {
  const context = useContext(SongContext);
  if (context === undefined) {
    throw new Error('useSong must be used within a SongProvider');
  }
  return context;
};