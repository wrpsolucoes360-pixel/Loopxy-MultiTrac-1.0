
import React from 'react';
import { SongProvider } from './context/SongContext';
import { MixerProvider } from './context/MixerContext';
import { PlaybackProvider } from './context/PlaybackContext';
import { GoogleDriveProvider } from './context/GoogleDriveContext';
import { MidiProvider } from './context/MidiContext';
import { AppLayout } from './components/layout/AppLayout';
import { SettingsProvider } from './context/SettingsContext';
import { ApiKeyGuard } from './components/core/ApiKeyGuard';
import { NotificationProvider } from './context/NotificationContext';

const App: React.FC = () => {
  return (
    <ApiKeyGuard>
      <SettingsProvider>
        <NotificationProvider>
          <GoogleDriveProvider>
            <SongProvider>
              <MixerProvider>
                <PlaybackProvider>
                  <MidiProvider>
                    <AppLayout />
                  </MidiProvider>
                </PlaybackProvider>
              </MixerProvider>
            </SongProvider>
          </GoogleDriveProvider>
        </NotificationProvider>
      </SettingsProvider>
    </ApiKeyGuard>
  );
};

export default App;