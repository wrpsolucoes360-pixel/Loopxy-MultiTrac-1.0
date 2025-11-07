
import React, { ReactNode } from 'react';
import { Icon } from './Icon';
import { ICONS } from '../../assets/icons';

const requiredKeys = [
    { key: 'API_KEY', name: 'Google Gemini API Key' },
    { key: 'GOOGLE_API_KEY', name: 'Google Drive API Key' },
    { key: 'GOOGLE_CLIENT_ID', name: 'Google Drive Client ID' }
];

export const ApiKeyGuard: React.FC<{ children: ReactNode }> = ({ children }) => {
    const missingKeys = requiredKeys.filter(k => !process.env[k.key]);

    if (missingKeys.length > 0) {
        return (
            <div className="bg-audio-darker text-audio-light w-screen h-screen flex items-center justify-center p-4">
                <div className="bg-audio-dark rounded-lg p-8 max-w-2xl text-center shadow-2xl border border-audio-dark-contrast">
                    <Icon path={ICONS.error} className="w-16 h-16 text-audio-accent-hot mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Configuration Error</h1>
                    <p className="text-audio-light-contrast mb-6">
                        The application cannot start because some required API keys (environment variables) are missing.
                    </p>
                    <div className="bg-audio-dark-contrast rounded-md p-4 text-left space-y-2">
                        <h2 className="font-semibold">Missing Keys:</h2>
                        <ul className="list-disc list-inside text-audio-light-contrast">
                            {missingKeys.map(k => (
                                <li key={k.key}><span className="font-mono text-white bg-audio-darker px-1 rounded">{k.key}</span> ({k.name})</li>
                            ))}
                        </ul>
                    </div>
                    <p className="text-xs text-audio-light-contrast mt-6">
                        If you are running this on a platform like Vercel or Netlify, please add these keys in your project's "Environment Variables" settings and redeploy the application.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
