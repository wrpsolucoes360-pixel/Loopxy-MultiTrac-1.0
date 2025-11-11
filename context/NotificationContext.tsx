
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, type?: Notification['type']) => void;
  removeNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: Notification['type'] = 'info') => {
    const newNotification: Notification = {
      id: Date.now(),
      message,
      type,
    };
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const value = { notifications, addNotification, removeNotification };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = (): { addNotification: (message: string, type?: Notification['type']) => void; } => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return { addNotification: context.addNotification };
};

export const useNotificationHost = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationHost must be used within a NotificationProvider');
    }
    return context;
}
