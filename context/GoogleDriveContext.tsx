
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { SyncState, GoogleUser, Song, Setlist } from '../types';
import * as drive from '../services/googleDriveService';
import { dbGetSongs, dbGetSetlists, dbAddSong, dbAddSetlist, dbGetAudioBlob, dbPutAudioBlob, dbUpdateSong, dbUpdateSetlist } from '../services/db';
import { useNotification } from './NotificationContext';

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

// NOTE: These are now checked by the ApiKeyGuard component.
const API_KEY = process.env.GOOGLE_API_KEY!;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export const GoogleDriveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [syncState, setSyncState] = useState<SyncState>('unauthenticated');
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);
  const [reloadCallback, setReloadCallback] = useState<(() => void) | null>(null);
  const { addNotification } = useNotification();


  const registerReloadCallback = useCallback((callback: () => void) => {
    setReloadCallback(() => callback);
  }, []);

  const handleAuthChange = useCallback((isSignedIn: boolean) => {
    if (isSignedIn) {
      // FIX: 'gapi' is not defined in this scope. It should be accessed from the window object.
      const gUser = (window as any).gapi.auth2.getAuthInstance().currentUser.get();
      const profile = gUser.getBasicProfile();
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
    
    addNotification('Starting sync with Google Drive...', 'info');
    setSyncState('syncing');

    try {
        const appFolderId = await drive.findOrCreateAppFolder();
        const driveFiles = await drive.listFiles(appFolderId);
        
        // 1. GET REMOTE & LOCAL DATA
        const libraryFile = driveFiles.find(f => f.name === 'library.json');
        let remoteLibrary: { songs: Song[], setlists: Setlist[] } = { songs: [], setlists: []};
        if (libraryFile?.id) {
            const content = await drive.getFileContent(libraryFile.id);
            if (content) remoteLibrary = JSON.parse(content);
        }
        const localSongs = await dbGetSongs();
        const localSetlists = await dbGetSetlists();

        let hasChanged = false;

        // 2. MERGE METADATA (SONGS & SETLISTS)
        for (const remoteSong of remoteLibrary.songs) {
            const localSong = localSongs.find(s => s.id === remoteSong.id);
            if (!localSong) { // Doesn't exist locally -> download
                await dbAddSong(remoteSong, []);
                hasChanged = true;
            } else if (remoteSong.updatedAt > localSong.updatedAt) { // Remote is newer -> update local
                await dbUpdateSong(remoteSong);
                hasChanged = true;
            }
        }
        for (const remoteSetlist of remoteLibrary.setlists) {
            const localSetlist = localSetlists.find(s => s.id === remoteSetlist.id);
            if (!localSetlist || remoteSetlist.updatedAt > localSetlist.updatedAt) {
                 await dbUpdateSetlist(remoteSetlist);
                 hasChanged = true;
            }
        }

        // Get final list of local data after potential remote updates
        const finalLocalSongs = await dbGetSongs();
        const finalLocalSetlists = await dbGetSetlists();

        // 3. SYNC AUDIO BLOBS
        for (const song of finalLocalSongs) {
            for (const track of song.tracks) {
                const audioBlob = await dbGetAudioBlob(track.id);
                const remoteFile = driveFiles.find(f => f.name === `${track.id}.mp3`);
                if (audioBlob && !remoteFile) { // Exists locally, not remotely -> upload
                    console.log(`Uploading audio for track ${track.id}...`);
                    await drive.createFile(appFolderId, `${track.id}.mp3`, audioBlob, 'audio/mpeg');
                } else if (!audioBlob && remoteFile) { // Exists remotely, not locally -> download
                    console.log(`Downloading audio for track ${track.id}`);
                    const blob = await drive.getFileBlob(remoteFile.id!);
                    if (blob) {
                        await dbPutAudioBlob(track.id, blob);
                        hasChanged = true;
                    }
                }
            }
        }

        // 4. UPLOAD FINAL LIBRARY
        console.log('Uploading merged library.json...');
        const newLibraryContent = JSON.stringify({ songs: finalLocalSongs, setlists: finalLocalSetlists }, null, 2);
        if (libraryFile?.id) {
            await drive.updateFile(libraryFile.id, newLibraryContent);
        } else {
            await drive.createFile(appFolderId, 'library.json', newLibraryContent, 'application/json');
        }

        if (hasChanged && reloadCallback) {
            addNotification('Local data updated from cloud. Reloading.', 'info');
            reloadCallback();
        }

        addNotification('Sync with Google Drive complete!', 'success');
        setNeedsSync(false);
        setSyncState('synced');

    } catch (error) {
        console.error('Sync failed:', error);
        setSyncState('error');
        addNotification('Sync failed. Check console for details.', 'error');
    }
  }, [syncState, isApiLoaded, addNotification, reloadCallback]);


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