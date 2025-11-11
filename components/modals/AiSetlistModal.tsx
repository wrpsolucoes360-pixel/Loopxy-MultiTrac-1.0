import React, { useState } from 'react';
import { Modal } from '../core/Modal';
import { useSong } from '../../context/SongContext';
import { createSetlistFromGemini } from '../../services/geminiService';
import { Spinner } from '../core/Spinner';
import { useNotification } from '../../context/NotificationContext';

export const AiSetlistModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { songs, createSetlist } = useSong();
    const { addNotification } = useNotification();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt) return;

        setIsLoading(true);
        setError('');
        try {
            const { setlistName, songIds } = await createSetlistFromGemini(prompt, songs);
            if (songIds.length > 0) {
                createSetlist(setlistName, songIds);
                addNotification(`Created new setlist: "${setlistName}"`, 'success');
                onClose();
                setPrompt('');
            } else {
                setError("AI couldn't create a setlist from your library. Try a different prompt or add more songs.");
            }
        } catch (err) {
            const errorMessage = 'An error occurred while generating the setlist.';
            setError(errorMessage);
            addNotification(errorMessage, 'error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Setlist with AI">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-400">Describe the setlist you want</label>
                    <textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'An upbeat 15-minute worship set starting with Praise'"
                        rows={3}
                        className="mt-1 w-full p-2 bg-audio-dark-contrast rounded"
                        required
                    />
                </div>
                 {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="px-3 py-1 sm:px-4 sm:py-2 bg-audio-dark-contrast rounded">Cancel</button>
                    <button type="submit" disabled={isLoading} className="px-3 py-1 sm:px-4 sm:py-2 bg-audio-accent text-white rounded disabled:bg-opacity-50 flex items-center gap-2">
                        {isLoading && <Spinner size="w-4 h-4" />}
                        {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};