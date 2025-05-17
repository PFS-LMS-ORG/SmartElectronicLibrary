import { useEffect } from 'react';
import { Bell, Check, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { Notification } from '@/api/notificationApi';

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  // Get notification data and functions from context
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    fetchNotifications,
    loading,
    showAllNotifications,
    setShowAllNotifications
  } = useNotifications();
  
  // Fetch notifications when dropdown opens
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  
  // Handle clicking on a notification
  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
    // Uncomment if you want to close after clicking
    // onClose();
  };
  
  // Handle toggling between all and unread notifications
  const toggleShowAll = () => {
    setShowAllNotifications(!showAllNotifications);
  };
  
  // Get appropriate icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'borrow-accepted':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'borrow-rejected':
        return <X className="w-5 h-5 text-red-500" />;
      case 'info':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  // Format timestamp to relative time, handling timezone issues
  const formatDate = (dateString: string) => {
    try {
      // Parse the ISO date string and get UTC time values to avoid timezone issues
      const date = new Date(dateString);
      const now = new Date();
      
      // For debugging - log both timestamps
      console.log("Notification timestamp:", date.toISOString());
      console.log("Current timestamp:", now.toISOString());
      
      // Calculate the time difference in milliseconds
      const diffMs = Math.max(0, now.getTime() - date.getTime());
      
      // Convert to appropriate units
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      // For very recent notifications (less than a minute)
      if (diffSecs < 60) {
        return diffSecs <= 5 ? "just now" : `${diffSecs} sec${diffSecs !== 1 ? 's' : ''} ago`;
      } 
      // Less than an hour
      else if (diffMins < 60) {
        return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
      } 
      // Less than a day
      else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } 
      // Days
      else {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "unknown time";
    }
  };

  return (
    <div className="absolute py-2 w-80 max-h-96 bg-gray-800 rounded-md shadow-xl z-[9999] border border-gray-700 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-500 scrollbar-track-gray-800 scrollbar-thumb-rounded-full">
      {/* Header with title and mark all as read button */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-200">Notifications</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={() => markAllAsRead()}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Mark all as read
            </button>
          )}
          <button 
            onClick={toggleShowAll}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            title={showAllNotifications ? "Show unread only" : "Show all notifications"}
          >
            {showAllNotifications ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Loading state */}
      {loading && notifications.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-400 text-sm">
          Loading notifications...
        </div>
      ) : notifications.length > 0 ? (
        // List of notifications
        <div>
          {notifications.map((notification: Notification) => (
            <div 
              key={notification.id}
              className={`px-4 py-3 border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 transition-colors cursor-pointer ${!notification.read ? 'bg-gray-700/30' : ''}`}
              onClick={() => handleMarkAsRead(notification.id)}
            >
              <div className="flex gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                {/* Content */}
                <div className="flex-1">
                  <p className={`text-sm ${!notification.read ? 'text-gray-100' : 'text-gray-300'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(notification.created_at)}
                  </p>
                </div>
                {/* Unread indicator */}
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty state
        <div className="px-4 py-6 text-center text-gray-400 text-sm">
          {showAllNotifications 
            ? "No notifications" 
            : "No unread notifications"}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;