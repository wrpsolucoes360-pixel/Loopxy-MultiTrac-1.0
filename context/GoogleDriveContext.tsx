
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { SyncState, GoogleUser, Song, Setlist } from '../types';
import * as drive from '../services/googleDriveService';
import { dbGetSongs, dbGetSetlists, dbAddSong, dbAddSetlist, dbGetAudioBlob, dbPutAudioBlob, dbClear } from '../services/db';

interface GoogleDriveContextType {
  syncState: SyncState;
  user: GoogleUser | null;
  signIn: () => void;
  signOut: () => void;
  syncData: () => void;
  setNeedsSync: (needsSync: boolean) => void;
  registerReloadCallback: (callback: () => void) => void;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | undefined>(undefined);

// NOTE: These should be stored securely in environment variables.
const API_KEY = process.env.GOOGLE_API_KEY || '';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export const GoogleDriveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [syncState, setSyncState] = useState<SyncState>('unauthenticated');
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);
  const [reloadCallback, setReloadCallback] = useState<(() => void) | null>(null);


  const registerReloadCallback = useCallback((callback: () => void) => {
    setReloadCallback(() => callback);
  }, []);

  const handleAuthChange = useCallback((isSignedIn: boolean) => {
    if (isSignedIn) {
      const profile = drive.getUserProfile();
      if (profile) {
        setUser({
            name: profile.getName(),
            email: profile.getEmail(),
            imageUrl: profile.getImageUrl(),
        });
        setSyncState('idle');
      }
    } else {
      setUser(null);
      setSyncState('unauthenticated');
    }
  }, []);

  useEffect(() => {
    const initClient = async () => {
      await drive.loadGapi();
      await drive.initClient(API_KEY, CLIENT_ID, SCOPES, handleAuthChange);
      setIsApiLoaded(true);
    };
    initClient();
  }, [handleAuthChange]);
  
  useEffect(() => {
    if (needsSync && syncState !== 'unauthenticated') {
        setSyncState('idle');
    }
  }, [needsSync, syncState]);

  const signIn = () => {
    if (isApiLoaded) drive.signIn();
  };

  const signOut = () => {
    if (isApiLoaded) drive.signOut();
  };
  
  const syncData = useCallback(async () => {
    if (syncState === 'syncing' || syncState === 'unauthenticated' || !isApiLoaded) return;
    
    console.log('Starting sync...');
    setSyncState('syncing');

    try {
        const appFolderId = await drive.findOrCreateAppFolder();
        const driveFiles = await drive.listFiles(appFolderId);
        
        const libraryFile = driveFiles.find(f => f.name === 'library.json');
        
        // Fetch local data
        const localSongs = await dbGetSongs();
        const localSetlists = await dbGetSetlists();

        let remoteLibrary: { songs: Song[], setlists: Setlist[] } = { songs: [], setlists: []};
        if (libraryFile?.id) {
            const content = await drive.getFileContent(libraryFile.id);
            if (content) {
                remoteLibrary = JSON.parse(content);
            }
        }

        // Simple sync logic: local is master, push all changes to drive.
        // A more robust implementation would handle conflicts.
        console.log('Uploading library.json...');
        const newLibraryContent = JSON.stringify({ songs: localSongs, setlists: localSetlists }, null, 2);
        if (libraryFile?.id) {
            await drive.updateFile(libraryFile.id, newLibraryContent);
        } else {
            await drive.createFile(appFolderId, 'library.json', newLibraryContent, 'application/json');
        }

        // Sync audio files
        for (const song of localSongs) {
            for (const track of song.tracks) {
                const audioFile = driveFiles.find(f => f.name === `${track.id}.mp3`);
                if (!audioFile) {
                    console.log(`Uploading audio for track ${track.id}...`);
                    const blob = await dbGetAudioBlob(track.id);
                    if (blob) {
                        await drive.createFile(appFolderId, `${track.id}.mp3`, blob, 'audio/mpeg');
                    }
                }
            }
        }

        // Here we could implement downloading missing files from drive to local
        // For now, we assume local-first is the primary goal.

        console.log('Sync complete.');
        setNeedsSync(false);
        setSyncState('synced');

    } catch (error) {
        console.error('Sync failed:', error);
        setSyncState('error');
    }
  }, [syncState, isApiLoaded]);


  const value = {
    syncState,
    user,
    signIn,
    signOut,
    syncData,
    setNeedsSync,
    registerReloadCallback,
  };

  return <GoogleDriveContext.Provider value={value}>{children}</GoogleDriveContext.Provider>;
};

export const useGoogleDrive = (): GoogleDriveContextType => {
  const context = useContext(GoogleDriveContext);
  if (context === undefined) {
    throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
  }
  return context;
};
