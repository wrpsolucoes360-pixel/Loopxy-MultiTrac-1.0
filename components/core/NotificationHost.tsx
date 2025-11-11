
import React, { useEffect } from 'react';
import { useNotificationHost } from '../../context/NotificationContext';
import { Icon } from './Icon';
import { ICONS } from '../../assets/icons';

const NOTIFICATION_TIMEOUT = 5000;

export const NotificationHost: React.FC = () => {
    const { notifications, removeNotification } = useNotificationHost();

    useEffect(() => {
        if (notifications.length > 0) {
            const latestNotification = notifications[notifications.length - 1];
            const timer = setTimeout(() => {
                removeNotification(latestNotification.id);
            }, NOTIFICATION_TIMEOUT);

            return () => clearTimeout(timer);
        }
    }, [notifications, removeNotification]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <Icon path={ICONS.sync} className="w-5 h-5" />;
            case 'error': return <Icon path={ICONS.error} className="w-5 h-5" />;
            case 'info':
            default: return <Icon path={ICONS.info} className="w-5 h-5" />;
        }
    };

    const getColors = (type: string) => {
        switch (type) {
            case 'success': return 'bg-audio-green';
            case 'error': return 'bg-audio-accent-hot';
            case 'info':
            default: return 'bg-audio-accent';
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[100] w-full max-w-sm space-y-3">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className={`flex items-start gap-3 p-4 rounded-lg shadow-2xl text-white ${getColors(notification.type)} animate-fade-in-up`}
                >
                    <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                    </div>
                    <div className="flex-grow">
                        <p className="text-sm font-semibold">{notification.message}</p>
                    </div>
                    <button onClick={() => removeNotification(notification.id)} className="ml-2 -mr-1 p-1 rounded-full hover:bg-white/20 transition-colors">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"></path></svg>
                    </button>
                </div>
            ))}
        </div>
    );
};
