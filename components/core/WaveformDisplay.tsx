import React, { useRef, useState, useEffect, useCallback } from 'react';
import { usePlayback } from '../../context/PlaybackContext';
import { useSong } from '../../context/SongContext';
import { Icon } from './Icon';
import { ICONS } from '../../assets/icons';

const WAVEFORM_POINTS = 200;
const SECTION_COLORS = ['bg-pink-500/50', 'bg-blue-500/50', 'bg-green-500/50', 'bg-yellow-500/50', 'bg-purple-500/50', 'bg-indigo-500/50'];


const FakeWaveform: React.FC = React.memo(() => {
    const [points] = useState(() => Array.from({ length: WAVEFORM_POINTS }, () => Math.random()));
    
    return (
        <div className="absolute inset-0 flex items-center justify-between px-1">
            {points.map((p, i) => (
                <div
                    key={i}
                    className="bg-gradient-to-b from-audio-accent to-pink-500"
                    style={{
                        width: '0.25%',
                        height: `${20 + p * 70}%`,
                        opacity: 0.5 + p * 0.3
                    }}
                />
            ))}
        </div>
    );
});


export const WaveformDisplay: React.FC = () => {
    const { activeSong } = useSong();
    const { isPlaying, currentTime, duration, seek, isLooping, toggleLoop, loopStart, loopEnd, setLoopPoints } = usePlayback();
    
    const containerRef = useRef<HTMLDivElement>(null);
    const waveformInnerRef = useRef<HTMLDivElement>(null);
    
    const [loopDraft, setLoopDraft] = useState<{ start: number; end: number } | null>(null);
    const isSettingLoop = useRef(false);
    const isDragging = useRef(false);
    const pointerDownPos = useRef({ x: 0 });

    const [showSections, setShowSections] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%

    const getPercentageFromX = useCallback((clientX: number) => {
        if (!containerRef.current || !waveformInnerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const totalWidth = waveformInnerRef.current.offsetWidth;
        if (totalWidth === 0) return 0;

        const absoluteX = clientX - rect.left + scrollLeft;
        const percentage = absoluteX / totalWidth;
        return Math.max(0, Math.min(1, percentage));
    }, []);

    // Auto-scroll effect to keep playhead in view
    useEffect(() => {
        if (isPlaying && containerRef.current && waveformInnerRef.current && duration > 0) {
            const { scrollLeft, clientWidth } = containerRef.current;
            const totalWidth = waveformInnerRef.current.offsetWidth;
            const playheadPx = (currentTime / duration) * totalWidth;

            const margin = clientWidth * 0.3; // Keep playhead within the middle 40%
            const visibleRight = scrollLeft + clientWidth;

            if (playheadPx > visibleRight - margin) {
                containerRef.current.scrollLeft = playheadPx - clientWidth + margin;
            } else if (playheadPx < scrollLeft + margin) {
                containerRef.current.scrollLeft = Math.max(0, playheadPx - margin);
            }
        }
    }, [currentTime, duration, isPlaying]);


    const handleInteractionStart = useCallback((clientX: number) => {
        isDragging.current = false;
        pointerDownPos.current = { x: clientX };
        const percentage = getPercentageFromX(clientX);
        isSettingLoop.current = true;
        setLoopDraft({ start: percentage, end: percentage });
    }, [getPercentageFromX]);

    const handleInteractionMove = useCallback((clientX: number) => {
        if (!isSettingLoop.current) return;
        if (!isDragging.current && Math.abs(clientX - pointerDownPos.current.x) > 5) {
            isDragging.current = true;
        }
        const percentage = getPercentageFromX(clientX);
        setLoopDraft(draft => (draft ? { ...draft, end: percentage } : null));
    }, [getPercentageFromX]);

    const handleInteractionEnd = useCallback((clientX: number) => {
        if (!isSettingLoop.current) return;
        
        if (isDragging.current && loopDraft) {
            const start = Math.min(loopDraft.start, loopDraft.end);
            const end = Math.max(loopDraft.start, loopDraft.end);
            if (end - start > 0.01) { // Only set loop if it's wider than 1%
                setLoopPoints(start * duration, end * duration);
                if (!isLooping) {
                    toggleLoop();
                }
            }
        } else { // This was a click/tap
            const percentage = getPercentageFromX(clientX);
            if (duration > 0) {
                seek(percentage * duration);
            }
        }
        isSettingLoop.current = false;
        isDragging.current = false;
        setLoopDraft(null);
    }, [loopDraft, duration, isLooping, setLoopPoints, toggleLoop, getPercentageFromX, seek]);

    // Mouse event listeners
    const handleMouseMove = useCallback((e: MouseEvent) => handleInteractionMove(e.clientX), [handleInteractionMove]);
    const handleMouseUp = useCallback((e: MouseEvent) => {
        handleInteractionEnd(e.clientX);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [handleInteractionEnd, handleMouseMove]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button')) return;
        e.preventDefault();
        handleInteractionStart(e.clientX);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Touch event listeners
    const handleTouchMove = useCallback((e: TouchEvent) => handleInteractionMove(e.touches[0].clientX), [handleInteractionMove]);
    const handleTouchEnd = useCallback((e: TouchEvent) => {
        handleInteractionEnd(e.changedTouches[0].clientX);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
    }, [handleInteractionEnd, handleTouchMove]);
    
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button')) return;
        handleInteractionStart(e.touches[0].clientX);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);
    };

    // Effect for cleaning up window listeners
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

    const zoom = (factor: number) => {
        setZoomLevel(prevZoom => {
            const newZoom = Math.max(1, Math.min(prevZoom * factor, 20)); // Min 1x, Max 20x
            if (containerRef.current) {
                const { scrollLeft, clientWidth } = containerRef.current;
                const centerPointAbsolute = scrollLeft + clientWidth / 2;
                const centerRatio = centerPointAbsolute / (clientWidth * prevZoom);
                const newTotalWidth = clientWidth * newZoom;
                const newScrollLeft = (centerRatio * newTotalWidth) - clientWidth / 2;
                setTimeout(() => {
                    if (containerRef.current) {
                        containerRef.current.scrollLeft = newScrollLeft;
                    }
                }, 0);
            }
            return newZoom;
        });
    };

    const handleZoomIn = (e: React.MouseEvent) => { e.stopPropagation(); zoom(1.5); };
    const handleZoomOut = (e: React.MouseEvent) => { e.stopPropagation(); zoom(1 / 1.5); };
    const handleToggleSections = (e: React.MouseEvent) => { e.stopPropagation(); setShowSections(prev => !prev); };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    const renderSections = () => {
        if (!activeSong?.structure) return null;
        let accumulatedPercentage = 0;
        return activeSong.structure.map((section, index) => {
            const start = accumulatedPercentage;
            accumulatedPercentage += section.durationPercentage;
            return (
                <div
                    key={index}
                    className={`absolute h-full top-0 flex items-center justify-center text-xs font-bold text-white/80 ${SECTION_COLORS[index % SECTION_COLORS.length]}`}
                    style={{
                        left: `${start}%`,
                        width: `${section.durationPercentage}%`,
                    }}
                    title={section.label}
                >
                   <span className="truncate px-1">{section.label}</span>
                </div>
            );
        });
    };

    return (
        <div 
            className="bg-audio-dark rounded-lg p-2 flex-shrink-0 relative h-24 md:h-32 flex items-center cursor-pointer overflow-x-auto overflow-y-hidden touch-pan-y" 
            ref={containerRef} 
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            <div
                className="relative h-full"
                ref={waveformInnerRef}
                style={{ width: `${zoomLevel * 100}%` }}
            >
                <FakeWaveform />
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {showSections && renderSections()}
                </div>

                <div
                    className="absolute top-0 h-full w-1 bg-audio-accent-hot z-30 pointer-events-none"
                    style={{ left: `${progressPercentage}%` }}
                >
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-audio-accent-hot rounded-full"></div>
                </div>

                {isLooping && duration > 0 && (
                     <div
                        className="absolute top-0 h-full bg-audio-accent/30 border-x-2 border-audio-accent z-20 pointer-events-none"
                        style={{
                            left: `${(loopStart / duration) * 100}%`,
                            width: `${((loopEnd - loopStart) / duration) * 100}%`,
                        }}
                     />
                )}

                {loopDraft && (
                     <div
                        className="absolute top-0 h-full bg-audio-accent/20 border-x-2 border-dashed border-audio-accent-hot z-20 pointer-events-none"
                        style={{
                            left: `${Math.min(loopDraft.start, loopDraft.end) * 100}%`,
                            width: `${Math.abs(loopDraft.end - loopDraft.start) * 100}%`,
                        }}
                     />
                )}
            </div>
            
            <div className="absolute left-2 bottom-1 text-xs text-audio-light-contrast z-40 pointer-events-none">
                Tap to seek, drag to create a loop
            </div>

            <div className="absolute right-2 top-2 z-40 flex flex-col gap-1">
                <button onClick={handleToggleSections} className={`bg-black/50 p-1 rounded-full text-white hover:bg-black transition-colors ${!showSections ? 'text-audio-light-contrast' : ''}`} title={showSections ? 'Hide Sections' : 'Show Sections'}><Icon path={ICONS.eye} className="w-4 h-4" /></button>
                <button onClick={handleZoomIn} className="bg-black/50 p-1 rounded-full text-white hover:bg-black disabled:opacity-50" disabled={zoomLevel >= 20} title="Zoom In"><Icon path={ICONS.zoomIn} className="w-4 h-4" /></button>
                <button onClick={handleZoomOut} className="bg-black/50 p-1 rounded-full text-white hover:bg-black disabled:opacity-50" disabled={zoomLevel <= 1} title="Zoom Out"><Icon path={ICONS.zoomOut} className="w-4 h-4" /></button>
            </div>
        </div>
    );
};