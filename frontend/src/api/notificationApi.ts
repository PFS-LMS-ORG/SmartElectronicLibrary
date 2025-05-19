import axios from 'axios';

export interface Notification {
  id: string;
  type: 'welcome' | 'borrow-accepted' | 'borrow-rejected' | 'info';
  message: string;
  read: boolean;
  created_at: string;  // ISO date string
}

const API_BASE_URL = '/api';

// Helper to get the auth token
const getAuthToken = () => {
    return localStorage.getItem('token');
};

// Create axios instance with auth headers
const createAuthenticatedRequest = () => {
    const token = getAuthToken();
    
    return {
        headers: {
        'Authorization': `Bearer ${token}`
        }
    };
};

export const notificationApi = {
    getNotifications: async (unreadOnly = true) => {
        const response = await axios.get(
        `${API_BASE_URL}/notifications?unread_only=${unreadOnly ? 'true' : 'false'}`, 
        createAuthenticatedRequest()
        );
        return response.data;
    },
    
    getUnreadCount: async () => {
        const response = await axios.get(
        `${API_BASE_URL}/notifications/unread-count`, 
        createAuthenticatedRequest()
        );
        return response.data.unread_count;
    },
    
    markAsRead: async (notificationId: string) => {
        const response = await axios.put(
        `${API_BASE_URL}/notifications/${notificationId}/read`, 
        {}, // Empty body
        createAuthenticatedRequest()
        );
        return response.data;
    },
    
    markAllAsRead: async () => {
        const response = await axios.put(
        `${API_BASE_URL}/notifications/mark-all-read`, 
        {}, // Empty body
        createAuthenticatedRequest()
        );
        return response.data;
    }
};