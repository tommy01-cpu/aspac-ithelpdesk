"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationContextType {
  isNotificationPanelOpen: boolean;
  openNotificationPanel: () => void;
  closeNotificationPanel: () => void;
  toggleNotificationPanel: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationPanel = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationPanel must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  const openNotificationPanel = () => setIsNotificationPanelOpen(true);
  const closeNotificationPanel = () => setIsNotificationPanelOpen(false);
  const toggleNotificationPanel = () => setIsNotificationPanelOpen(prev => !prev);

  const value = {
    isNotificationPanelOpen,
    openNotificationPanel,
    closeNotificationPanel,
    toggleNotificationPanel,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
