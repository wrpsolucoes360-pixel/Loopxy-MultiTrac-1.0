

import React, { useState } from 'react';
import { useSong } from '../../context/SongContext';
import { Icon } from '../core/Icon';
import { ICONS } from '../../assets/icons';
import { useGoogleDrive } from '../../context/GoogleDriveContext';
import { Spinner } from '../core/Spinner';

interface LibraryPanelProps {
    onAddSong: () => void;
    onAiSetlist: () => void;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ onAddSong, onAiSetlist }) => {
    const { songs, setlists, activeSetlist, activeSong, setActiveSetlistId, setActiveSongId, reorderSongsInSetlist } = useSong();
    const { syncState, user, signIn, signOut, syncData } = useGoogleDrive();
    const [draggedSongId, setDraggedSongId] = useState<string | null>(null);
    const [dragOverSongId, setDragOverSongId] = useState<string | null>(null);

    const songsInSetlist = activeSetlist ? songs.filter(song => activeSetlist.songIds.includes(song.id)) : [];
    
    const orderedSongs = songsInSetlist.sort((a, b) => 
        activeSetlist!.songIds.indexOf(a.id) - activeSetlist!.songIds.indexOf(b.id)
    );

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, songId: string) => {
        setDraggedSongId(songId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', songId);
    };

    const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
        e.preventDefault();
    };

    const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, songId: string) => {
        e.preventDefault();
        if (draggedSongId && draggedSongId !== songId) {
            setDragOverSongId(songId);
        }
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
        e.preventDefault();
        setDragOverSongId(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropTargetId: string) => {
        e.preventDefault();
        if (!activeSetlist || !draggedSongId) return;

        const sourceId = draggedSongId;
        if (sourceId === dropTargetId) return;

        const currentIds = [...activeSetlist.songIds];
        const sourceIndex = currentIds.indexOf(sourceId);
        const targetIndex = currentIds.indexOf(dropTargetId);

        if (sourceIndex === -1 || targetIndex === -1) return;
        
        const [removed] = currentIds.splice(sourceIndex, 1);
        currentIds.splice(targetIndex, 0, removed);

        reorderSongsInSetlist(activeSetlist.id, currentIds);
        setDragOverSongId(null);
    };

    const handleDragEnd = () => {
        setDraggedSongId(null);
        setDragOverSongId(null);
    };
    
    const renderSyncButton = () => {
        switch (syncState) {
            case 'unauthenticated':
                return <button onClick={signIn} className="bg-blue-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-md font-semibold text-sm hover:bg-blue-700">Login to Sync</button>;
            case 'syncing':
                return <button disabled className="bg-audio-accent text-white px-2 sm:px-4 py-1 sm:py-2 rounded-md font-semibold text-sm flex items-center gap-2"><Spinner size="w-4 h-4" /> Syncing...</button>;
            case 'synced':
                 return <button onClick={syncData} className="bg-audio-green text-white px-2 sm:px-4 py-1 sm:py-2 rounded-md font-semibold text-sm flex items-center gap-2"><Icon path={ICONS.sync} className="w-4 h-4" /> Synced</button>;
            case 'error':
                 return <button onClick={syncData} className="bg-audio-accent-hot text-white px-2 sm:px-4 py-1 sm:py-2 rounded-md font-semibold text-sm flex items-center gap-2">Sync Error</button>;
            case 'idle':
            default:
                return <button onClick={syncData} className="bg-audio-accent text-white px-2 sm:px-4 py-1 sm:py-2 rounded-md font-semibold text-sm hover:bg-audio-accent-darker">Sync</button>;
        }
    };

    return (
        <div className="bg-audio-dark h-full rounded-lg flex flex-col p-4 gap-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{activeSetlist?.name || "No Setlist"}</h2>
                <div className="flex items-center gap-2">
                    <select
                        value={activeSetlist?.id || ''}
                        onChange={(e) => setActiveSetlistId(e.target.value)}
                        className="bg-audio-dark-contrast border border-audio-dark-contrast rounded-md p-1 sm:p-2 text-sm"
                    >
                        {setlists.map(setlist => (
                            <option key={setlist.id} value={setlist.id}>{setlist.name}</option>
                        ))}
                    </select>
                    {renderSyncButton()}
                </div>
            </div>
            {user && (
                 <div className="flex items-center justify-end gap-2 text-xs text-audio-light-contrast -mt-2">
                     <img src={user.imageUrl} alt="user" className="w-4 h-4 rounded-full"/>
                     <span>{user.email}</span>
                     <button onClick={signOut} className="font-semibold hover:text-white">(Sign out)</button>
                 </div>
            )}

            <div className="flex-grow overflow-y-auto pr-2">
                <ul className="space-y-2">
                    {orderedSongs.map((song, index) => (
                        <li
                            key={song.id}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, song.id)}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, song.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, song.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => setActiveSongId(song.id)}
                            className={`relative flex items-center gap-2 sm:gap-4 p-2 rounded-md cursor-pointer transition-all ${
                                activeSong?.id === song.id ? 'bg-audio-accent/20' : 'hover:bg-audio-dark-contrast'
                            } ${draggedSongId === song.id ? 'opacity-30' : ''}`}
                        >
                            {dragOverSongId === song.id && (
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-audio-accent z-10" />
                            )}
                            <span className="text-audio-light-contrast font-mono w-4 text-right">{index + 1}</span>
                            <img src={song.artworkUrl} alt={song.title} className="w-10 h-10 rounded-md flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                                <p className="font-semibold truncate">{song.title}</p>
                                <p className="text-sm text-audio-light-contrast truncate">{song.artist}</p>
                            </div>
                            <span className="font-mono text-sm w-8 hidden sm:block text-center">{song.key}</span>
                            <span className="font-mono text-sm w-12 text-right hidden sm:block">{song.bpm}</span>
                            <button className="text-audio-light-contrast cursor-move flex-shrink-0"><Icon path={ICONS.dragHandle} className="w-5 h-5" /></button>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="flex-shrink-0 flex justify-between items-center">
                <button onClick={onAddSong} className="flex items-center gap-2 text-audio-accent font-semibold text-sm">
                    <Icon path={ICONS.library} className="w-5 h-5"/>
                    Add Song to Library
                </button>
                <button onClick={onAiSetlist} className="flex items-center gap-2 text-audio-accent font-semibold text-sm">
                    <Icon path={ICONS.sparkles} className="w-5 h-5"/>
                    AI Setlist
                </button>
            </div>
        </div>
    );
};
