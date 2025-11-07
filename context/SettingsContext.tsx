
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';

const SETTINGS_KEY = 'loopxy_settings';
const DEFAULT_ACCENT_COLOR = '#30C5FF'; // Corresponds to audio-accent
const DEFAULT_METRONOME_VOLUME = 0.6;

interface AppSettings {
    accentColor: string;
    defaultMetronomeVolume: number;
}

interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings: AppSettings = {
    accentColor: DEFAULT_ACCENT_COLOR,
    defaultMetronomeVolume: DEFAULT_METRONOME_VOLUME,
};

// Function to load settings from localStorage
const loadSettings = (): AppSettings => {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            return { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error('Failed to load settings from localStorage:', error);
    }
    return defaultSettings;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(loadSettings);

    // Save settings to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error);
        }
    }, [settings]);

    // Apply accent color theme via a style tag
    useEffect(() => {
        const styleId = 'dynamic-accent-color-style';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        
        const color = settings.accentColor || DEFAULT_ACCENT_COLOR;
        
        // This CSS overrides the Tailwind utility classes by being more specific or by appearing later.
        styleTag.innerHTML = `
            .bg-audio-accent { background-color: ${color} !important; }
            .text-audio-accent { color: ${color} !important; }
            .border-audio-accent { border-color: ${color} !important; }
            .ring-audio-accent { --tw-ring-color: ${color} !important; }
            .accent-audio-accent { accent-color: ${color} !important; }
            .bg-audio-accent\\/20 { background-color: ${color}33 !important; } /* 20% opacity */
            .bg-audio-accent\\/30 { background-color: ${color}4D !important; } /* 30% opacity */
        `;
    }, [settings.accentColor]);

    const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    const value = { settings, updateSettings };

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
