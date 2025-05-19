import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { notificationApi, Notification } from '../api/notificationApi';

// Define notification types
export type NotificationType = 'welcome' | 'borrow-accepted' | 'borrow-rejected' | 'info';

// Define the context interface
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  showAllNotifications: boolean;
  setShowAllNotifications: (show: boolean) => void;
}

// Create the context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Check if user is authenticated
const isUserAuthenticated = () => {
    return !!localStorage.getItem('token');
};

// Create the provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showAllNotifications, setShowAllNotifications] = useState<boolean>(false);
    
    // Function to fetch notifications from the API
    const fetchNotifications = useCallback(async () => {
        // Only fetch if user is authenticated
        if (!isUserAuthenticated()) {
        return;
        }
        
        try {
        setLoading(true);
        setError(null);
        
        // Get notifications based on filter
        const data = await notificationApi.getNotifications(!showAllNotifications);
        setNotifications(data);
        
        // Get unread count
        const count = await notificationApi.getUnreadCount();
        setUnreadCount(count);
        } catch (err) {
        console.error('Failed to fetch notifications:', err);
        setError('Failed to fetch notifications');
        } finally {
        setLoading(false);
        }
    }, [showAllNotifications]);

    // Function to mark a notification as read
    const markAsRead = async (id: string) => {
        if (!isUserAuthenticated()) return;
        
        try {
        await notificationApi.markAsRead(id);
        
        // Update notifications list
        setNotifications(prevNotifications => 
            prevNotifications.map(notification => 
            notification.id === id ? { ...notification, read: true } : notification
            )
        );
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
        console.error('Failed to mark notification as read:', err);
        }
    };

    // Function to mark all notifications as read
    const markAllAsRead = async () => {
        if (!isUserAuthenticated()) return;
        
        try {
        await notificationApi.markAllAsRead();
        
        // Update notifications list
        setNotifications(prevNotifications => 
            prevNotifications.map(notification => ({ ...notification, read: true }))
        );
        
        // Reset unread count
        setUnreadCount(0);
        } catch (err) {
        console.error('Failed to mark all notifications as read:', err);
        }
    };

    // Initial fetch on mount and when filter changes
    useEffect(() => {
        if (isUserAuthenticated()) {
        fetchNotifications();
        } else {
        // Clear notifications when user logs out
        setNotifications([]);
        setUnreadCount(0);
        }
    }, [fetchNotifications, showAllNotifications]);

    // Add event listener for authentication changes
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'token') {
            if (event.newValue) {
            fetchNotifications();
            } else {
            // User logged out
            setNotifications([]);
            setUnreadCount(0);
            }
        }
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [fetchNotifications]);

    // Function to fetch only the unread count
    const fetchUnreadCount = useCallback(async () => {
        if (!isUserAuthenticated()) {
        return;
        }
        
        try {
        const count = await notificationApi.getUnreadCount();
        setUnreadCount(count);
        } catch (err) {
        console.error('Failed to fetch unread count:', err);
        }
    }, []);

    // Polling for unread count every 10 seconds (more frequent than full notification fetch)
    useEffect(() => {
        if (!isUserAuthenticated()) return;
        
        // Fetch immediately on mount
        fetchUnreadCount();
        
        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 5000); // Check more frequently for unread count

        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    // Provide the context values
    return (
        <NotificationContext.Provider
        value={{
            notifications,
            unreadCount,
            loading,
            error,
            markAsRead,
            markAllAsRead,
            fetchNotifications,
            showAllNotifications,
            setShowAllNotifications
        }}
        >
        {children}
        </NotificationContext.Provider>
    );
};

// Custom hook to use the notification context
export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};