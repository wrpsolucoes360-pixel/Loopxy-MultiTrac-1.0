import { Song, Setlist } from '../types';

const DB_NAME = 'loopxy-db';
const DB_VERSION = 1;
const SONG_STORE = 'songs';
const SETLIST_STORE = 'setlists';
const AUDIO_STORE = 'audio';

let db: IDBDatabase;

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export const openDB = (): Promise<IDBDatabase> => {
    if (db) {
        return Promise.resolve(db);
    }
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Database error:', request.error);
            reject('Error opening database');
        };

        request.onupgradeneeded = (event) => {
            const tempDb = (event.target as IDBOpenDBRequest).result;
            if (!tempDb.objectStoreNames.contains(SONG_STORE)) {
                tempDb.createObjectStore(SONG_STORE, { keyPath: 'id' });
            }
            if (!tempDb.objectStoreNames.contains(SETLIST_STORE)) {
                tempDb.createObjectStore(SETLIST_STORE, { keyPath: 'id' });
            }
            if (!tempDb.objectStoreNames.contains(AUDIO_STORE)) {
                // The track 'id' will be the key for the audio blob
                tempDb.createObjectStore(AUDIO_STORE);
            }
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(db);
        };
    });
};

const getStore = (storeName: string, mode: IDBTransactionMode) => {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
};

const getAll = <T>(storeName: string): Promise<T[]> => openDB().then(() => promisifyRequest(getStore(storeName, 'readonly').getAll()));
const get = <T>(storeName: string, key: IDBValidKey): Promise<T | undefined> => openDB().then(() => promisifyRequest(getStore(storeName, 'readonly').get(key)));
const put = <T>(storeName: string, item: T): Promise<IDBValidKey> => openDB().then(() => promisifyRequest(getStore(storeName, 'readwrite').put(item)));
export const dbClear = (storeName: string): Promise<void> => openDB().then(() => promisifyRequest(getStore(storeName, 'readwrite').clear()));


export const dbGetSongs = () => getAll<Song>(SONG_STORE);
export const dbGetSetlists = () => getAll<Setlist>(SETLIST_STORE);

export const dbAddSong = async (song: Song, audioFiles: { audioId: string, blob: Blob }[]): Promise<void> => {
    await openDB();
    const tx = db.transaction([SONG_STORE, AUDIO_STORE], 'readwrite');
    const songStore = tx.objectStore(SONG_STORE);
    const audioStore = tx.objectStore(AUDIO_STORE);

    songStore.put({ ...song, updatedAt: song.updatedAt || Date.now() });
    audioFiles.forEach(({ audioId, blob }) => {
        audioStore.put(blob, audioId);
    });

    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const dbUpdateSong = (song: Song) => put(SONG_STORE, { ...song, updatedAt: Date.now() });

export const dbAddSetlist = (setlist: Setlist) => put(SETLIST_STORE, { ...setlist, updatedAt: setlist.updatedAt || Date.now() });
export const dbUpdateSetlist = (setlist: Setlist) => put(SETLIST_STORE, { ...setlist, updatedAt: Date.now() });

export const dbGetAudioBlob = (audioId: string): Promise<Blob | undefined> => get<Blob>(AUDIO_STORE, audioId);
export const dbPutAudioBlob = (audioId: string, blob: Blob) => put(AUDIO_STORE, blob);

export const dbCount = (storeName: string): Promise<number> => openDB().then(() => promisifyRequest(getStore(storeName, 'readonly').count()));