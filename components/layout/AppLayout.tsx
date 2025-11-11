


import React, { useState } from 'react';
import { Header } from './Header';
import { LibraryPanel } from './LibraryPanel';
import { Mixer } from '../mixer/Mixer';
import { WaveformDisplay } from '../core/WaveformDisplay';
import { useSong } from '../../context/SongContext';
import { AddSongModal } from '../modals/AddSongModal';
import { AiSetlistModal } from '../modals/AiSetlistModal';
import { MidiMappingModal } from '../modals/MidiMappingModal';
import { SettingsModal } from '../modals/SettingsModal';
import { MobileNav } from './MobileNav';
import { SetlistModal } from '../modals/SetlistModal';
import { PadPlayerModal } from '../modals/PadPlayerModal';
import { PadPlayer } from '../mixer/PadPlayer';
import { NotificationHost } from '../core/NotificationHost';

export const AppLayout: React.FC = () => {
    const { activeSong } = useSong();
    const [isAddSongModalOpen, setAddSongModalOpen] = useState(false);
    const [isAiSetlistModalOpen, setAiSetlistModalOpen] = useState(false);
    const [isMidiModalOpen, setMidiModalOpen] = useState(false);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    
    // New states for mobile modals
    const [isSetlistModalOpen, setSetlistModalOpen] = useState(false);
    const [isPadModalOpen, setPadModalOpen] = useState(false);

    const openAddSongModal = () => {
        setSetlistModalOpen(false); // Close setlist modal if open
        setAddSongModalOpen(true);
    };

    const openAiSetlistModal = () => {
        setSetlistModalOpen(false); // Close setlist modal if open
        setAiSetlistModalOpen(true);
    };


    return (
        <div className="bg-audio-darker text-audio-light w-screen h-screen overflow-hidden flex flex-col p-2 sm:p-4">
            <Header
                onOpenMidiMappings={() => setMidiModalOpen(true)}
                onOpenSettings={() => setSettingsModalOpen(true)}
            />
            <div className="flex-grow flex flex-col md:flex-row gap-4 min-h-0">
                {/* Main Content (Waveform + Mixer) - Always visible on mobile, left side on desktop */}
                <div className="flex-grow flex flex-col gap-4 min-h-0">
                    <WaveformDisplay />
                    {activeSong ? (
                        <Mixer />
                    ) : (
                        <div className="flex-grow flex items-center justify-center bg-audio-dark rounded-lg">
                            <p className="text-audio-light-contrast">Select a song to begin</p>
                        </div>
                    )}
                </div>

                {/* Desktop Right Panel (Library + Pad Player) */}
                <div className="w-full md:w-96 lg:w-[450px] flex-shrink-0 h-auto hidden md:flex flex-col gap-4">
                    <div className="flex-grow min-h-0">
                        <LibraryPanel
                            onAddSong={() => setAddSongModalOpen(true)}
                            onAiSetlist={() => setAiSetlistModalOpen(true)}
                        />
                    </div>
                    <div className="flex-shrink-0">
                        <PadPlayer />
                    </div>
                </div>
            </div>
            
            {/* Mobile Navigation */}
            <div className="flex-shrink-0 pt-2 md:hidden">
                 <MobileNav 
                    onOpenSetlist={() => setSetlistModalOpen(true)}
                    onOpenPads={() => setPadModalOpen(true)}
                 />
            </div>

            {/* Modals */}
            <AddSongModal isOpen={isAddSongModalOpen} onClose={() => setAddSongModalOpen(false)} />
            <AiSetlistModal isOpen={isAiSetlistModalOpen} onClose={() => setAiSetlistModalOpen(false)} />
            <MidiMappingModal isOpen={isMidiModalOpen} onClose={() => setMidiModalOpen(false)} />
            <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
            
            {/* Mobile-only Modals */}
            <SetlistModal 
                isOpen={isSetlistModalOpen} 
                onClose={() => setSetlistModalOpen(false)}
                onAddSong={openAddSongModal}
                onAiSetlist={openAiSetlistModal}
            />
            <PadPlayerModal isOpen={isPadModalOpen} onClose={() => setPadModalOpen(false)} />

            {/* Notification Host */}
            <NotificationHost />
        </div>
    );
};