
import React from 'react';
import { Icon } from '../core/Icon';
import { ICONS } from '../../assets/icons';

interface MobileNavProps {
    onOpenSetlist: () => void;
    onOpenPads: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenSetlist, onOpenPads }) => {
    
    const navButtonClass = "flex flex-col items-center justify-center gap-1 w-full text-audio-light-contrast transition-colors";
    const activeNavButtonClass = "text-audio-accent";
    
    return (
        <nav className="bg-audio-dark rounded-lg flex items-stretch h-14">
            <button className={`${navButtonClass} ${activeNavButtonClass}`}>
                <Icon path={ICONS.mixer} className="w-5 h-5" />
                <span className="text-xs font-semibold">Tracks</span>
            </button>
            <button className={navButtonClass} onClick={onOpenSetlist}>
                <Icon path={ICONS.list} className="w-5 h-5" />
                <span className="text-xs font-semibold">Setlist</span>
            </button>
            <button className={navButtonClass} onClick={onOpenPads}>
                <Icon path={ICONS.pads} className="w-5 h-5" />
                <span className="text-xs font-semibold">Pads</span>
            </button>
        </nav>
    );
};
