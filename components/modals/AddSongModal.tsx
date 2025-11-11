
import React, { useState, useCallback } from 'react';
import { Modal } from '../core/Modal';
import { useSong } from '../../context/SongContext';
import { getSongStructureFromGemini, analyzeTrackListFromAudio } from '../../services/geminiService';
import { Track, TrackColor, Song } from '../../types';
import { Spinner } from '../core/Spinner';
import { Icon } from '../core/Icon';
import { ICONS } from '../../assets/icons';
import { useNotification } from '../../context/NotificationContext';

const trackColors = Object.values(TrackColor);

export const AddSongModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addSong, updateSong } = useSong();
    const { addNotification } = useNotification();
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [bpm, setBpm] = useState('');
    const [key, setKey] = useState('');
    const [songColor, setSongColor] = useState<TrackColor | undefined>(undefined);
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    type UploadMode = 'manual' | 'ai';
    const [uploadMode, setUploadMode] = useState<UploadMode>('manual');
    const [singleFile, setSingleFile] = useState<File | null>(null);
    const [isSeparating, setIsSeparating] = useState(false);


    const resetForm = useCallback(() => {
        setTitle('');
        setArtist('');
        setBpm('');
        setKey('');
        setSongColor(undefined);
        setFiles([]);
        setIsProcessing(false);
        setError('');
        setDraggedIndex(null);
        setDragOverIndex(null);
        setUploadMode('manual');
        setSingleFile(null);
        setIsSeparating(false);
    }, []);

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };
    
    const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSingleFile(file);

            // Attempt to parse artist and title from filename
            const cleanedName = file.name.replace(/\.[^/.]+$/, ""); // remove extension
            const parts = cleanedName.split(/[-–—]/).map(p => p.trim());
            if (parts.length >= 2) {
                setArtist(parts[0]);
                setTitle(parts[1]);
            } else {
                setTitle(cleanedName);
            }
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSeparateStems = async () => {
        if (!singleFile || !title || !artist) {
            setError("Please provide a file, title, and artist before separating stems.");
            return;
        }

        setIsSeparating(true);
        setError('');

        try {
            const stems = await analyzeTrackListFromAudio(title, artist);

            const separatedFiles: File[] = stems.map(stemName => {
                return new File([singleFile], `${stemName}.wav`, { type: 'audio/wav' });
            });

            setFiles(separatedFiles);
            setUploadMode('manual');
            setSingleFile(null);
            addNotification('Stems separated successfully!', 'success');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Could not separate stems. Please try again.";
            setError(errorMessage);
            addNotification(errorMessage, 'error');
        } finally {
            setIsSeparating(false);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
        e.preventDefault();
    };

    const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };
    
    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;
        
        const newFiles = [...files];
        const [draggedFile] = newFiles.splice(draggedIndex, 1);
        newFiles.splice(targetIndex, 0, draggedFile);
        
        setFiles(newFiles);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !artist || files.length === 0) {
            setError('Title, Artist, and at least one audio file are required.');
            return;
        }
        setIsProcessing(true);
        setError('');

        try {
            const newSongId = `song-meta-${Date.now()}`;
            const tracks: Track[] = files.map((file, index) => ({
                id: `track-${newSongId}-${index}`,
                name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
                color: songColor ? undefined : trackColors[index % trackColors.length],
            }));

            const newSongData: Omit<Song, 'id' | 'updatedAt'> = {
                title,
                artist,
                artworkUrl: `https://picsum.photos/seed/${title}/100/100`,
                bpm: parseInt(bpm) || 120,
                key: key || 'C',
                songColor,
                tracks,
                structure: [],
            };
            
            const addedSong = await addSong(newSongData, files);
            addNotification(`Song "${title}" added successfully!`, 'success');

            // Now, fetch structure from Gemini async
            try {
                const structure = await getSongStructureFromGemini(title, artist);
                if (structure && structure.length > 0) {
                    updateSong({ ...addedSong, structure });
                    addNotification(`Analyzed song structure for "${title}".`, 'info');
                }
            } catch (structureError) {
                addNotification(`Could not analyze song structure for "${title}".`, 'error');
            }

            handleClose();

        } catch (err) {
            console.error(err);
            const errorMessage = "Failed to add song. Please try again.";
            setError(errorMessage);
            addNotification(errorMessage, 'error');
            setIsProcessing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add New Song">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Song Title" className="w-full p-2 bg-audio-dark-contrast rounded" required />
                <input type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist" className="w-full p-2 bg-audio-dark-contrast rounded" required />
                <div className="flex gap-4">
                    <input type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="BPM" className="w-1/2 p-2 bg-audio-dark-contrast rounded" />
                    <input type="text" value={key} onChange={e => setKey(e.target.value)} placeholder="Key (e.g., C#m)" className="w-1/2 p-2 bg-audio-dark-contrast rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Song Color (Optional)</label>
                    <div className="flex gap-2 flex-wrap">
                        {Object.values(TrackColor).map(color => (
                            <button
                                type="button"
                                key={color}
                                onClick={() => setSongColor(prev => prev === color ? undefined : color)}
                                className={`w-8 h-8 rounded-full border-2 transition-transform duration-150 ${songColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                                title={color.replace('track-', '')}
                            >
                                <div className={`w-full h-full rounded-full bg-${color}`}></div>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Audio Tracks (Stems)</label>
                     <div className="flex bg-audio-dark-contrast rounded-md p-1 mb-3">
                        <button
                            type="button"
                            onClick={() => setUploadMode('manual')}
                            className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${uploadMode === 'manual' ? 'bg-audio-accent text-white' : 'text-audio-light-contrast hover:bg-audio-dark'}`}
                        >
                            Upload Stems
                        </button>
                        <button
                            type="button"
                            onClick={() => setUploadMode('ai')}
                            className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${uploadMode === 'ai' ? 'bg-audio-accent text-white' : 'text-audio-light-contrast hover:bg-audio-dark'}`}
                        >
                            <Icon path={ICONS.sparkles} className="w-4 h-4" />
                            Separate with AI
                        </button>
                    </div>

                    {uploadMode === 'manual' && (
                        <>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <Icon path={ICONS.musicNote} className="mx-auto h-12 w-12 text-gray-500" />
                                    <div className="flex text-sm text-gray-500">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-audio-dark rounded-md font-medium text-audio-accent hover:text-audio-accent-darker focus-within:outline-none">
                                            <span>Upload files</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept="audio/*" />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-600">MP3, WAV, FLAC, etc.</p>
                                </div>
                            </div>
                            {files.length > 0 && (
                                <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {files.map((file, index) => (
                                        <li
                                            key={index}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={handleDragOver}
                                            onDragEnter={(e) => handleDragEnter(e, index)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, index)}
                                            onDragEnd={handleDragEnd}
                                            className={`relative flex items-center p-2 rounded-md bg-audio-dark-contrast transition-opacity ${draggedIndex === index ? 'opacity-30' : ''}`}
                                        >
                                            {dragOverIndex === index && (
                                                <div className="absolute top-0 left-0 w-full h-0.5 bg-audio-accent z-10" />
                                            )}
                                            <Icon path={ICONS.dragHandle} className="w-5 h-5 text-audio-light-contrast cursor-move mr-3" />
                                            <span className="flex-grow text-sm text-gray-300 truncate">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="ml-2 text-gray-500 hover:text-white"
                                                aria-label="Remove file"
                                            >
                                                &times;
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}

                    {uploadMode === 'ai' && (
                        <div className="space-y-4">
                            {isSeparating ? (
                                <div className="text-center p-8 space-y-3">
                                    <Spinner size="w-8 h-8 mx-auto"/>
                                    <p>AI is analyzing the song...</p>
                                    <p className="text-xs text-audio-light-contrast">This may take a moment.</p>
                                </div>
                            ) : !singleFile ? (
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
                                    <div className="space-y-1 text-center">
                                        <Icon path={ICONS.musicNote} className="mx-auto h-12 w-12 text-gray-500" />
                                        <div className="flex text-sm text-gray-500">
                                            <label htmlFor="single-file-upload" className="relative cursor-pointer bg-audio-dark rounded-md font-medium text-audio-accent hover:text-audio-accent-darker focus-within:outline-none">
                                                <span>Upload a single audio file</span>
                                                <input id="single-file-upload" name="single-file-upload" type="file" className="sr-only" onChange={handleSingleFileChange} accept="audio/*" />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-600">e.g., a finished mix or song</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-4 bg-audio-dark-contrast rounded-md space-y-4">
                                    <p className="truncate">
                                        <span className="font-semibold">{singleFile.name}</span> selected.
                                    </p>
                                     {(!title || !artist) && (
                                        <p className="text-xs text-audio-light-contrast">Please fill in the Title and Artist fields above to enable AI separation.</p>
                                    )}
                                    <div className="flex justify-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setSingleFile(null)}
                                            className="px-3 py-1 sm:px-4 sm:py-2 bg-audio-dark text-white rounded"
                                        >
                                            Change File
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSeparateStems}
                                            disabled={!title || !artist}
                                            className="px-3 py-1 sm:px-4 sm:py-2 bg-audio-accent-hot text-white rounded flex items-center gap-2 disabled:bg-opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Icon path={ICONS.sparkles} className="w-4 h-4" />
                                            Separate Stems
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={handleClose} className="px-3 py-1 sm:px-4 sm:py-2 bg-audio-dark-contrast rounded">Cancel</button>
                    <button type="submit" disabled={isProcessing} className="px-3 py-1 sm:px-4 sm:py-2 bg-audio-accent text-white rounded disabled:bg-opacity-50 flex items-center gap-2">
                        {isProcessing && <Spinner size="w-4 h-4" />}
                        {isProcessing ? 'Processing...' : 'Add Song'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};