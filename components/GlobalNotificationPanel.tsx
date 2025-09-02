"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Bell, X, Trash2 } from 'lucide-react';
import { useNotificationPanel } from '@/contexts/notification-context';
import { toast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

export default function GlobalNotificationPanel() {
  const { data: session } = useSession();
  const { isNotificationPanelOpen, closeNotificationPanel } = useNotificationPanel();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isNotificationPanelOpen) {
      fetchNotifications();
    }
  }, [isNotificationPanelOpen]);

  const fetchNotifications = async () => {
    try {
      setNotificationLoading(true);
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      } else {
        console.error('Failed to fetch notifications');
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setNotificationLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        toast({ title: 'Success', description: 'All notifications marked as read' });
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast({ title: 'Error', description: 'Failed to mark notifications as read', variant: 'destructive' });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        toast({ title: 'Success', description: 'Notification deleted successfully' });
      } else {
        toast({ title: 'Error', description: 'Failed to delete notification', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({ title: 'Error', description: 'Failed to delete notification', variant: 'destructive' });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Always mark as read when clicked (even if already read)
    await markAsRead(notification.id);

    // Handle notification actions based on type
    if (notification.data?.requestId) {
      closeNotificationPanel();
      // Use window.location.href for better navigation
      window.location.href = `/requests/view/${notification.data.requestId}`;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!isNotificationPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={closeNotificationPanel}
      />
      
      {/* Sliding Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Panel Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeNotificationPanel}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto min-h-0 notification-panel-scroll">
          {notificationLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group p-4 transition-colors relative ${
                    !notification.read 
                      ? 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100' 
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Read/Unread Indicator */}
                    <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                      !notification.read ? 'bg-blue-500 shadow-md' : 'bg-gray-300'
                    }`} />
                    
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-sm font-medium truncate ${
                          !notification.read ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {notification.title}
                        </h4>
                        {/* Unread badge */}
                        {!notification.read && (
                          <div className="flex-shrink-0 ml-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                      <p className={`text-sm mb-2 leading-relaxed ${
                        !notification.read ? 'text-gray-800' : 'text-gray-500'
                      }`}>
                        {notification.message}
                      </p>
                      <p className={`text-xs ${
                        !notification.read ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    
                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
