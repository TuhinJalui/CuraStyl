"use client";

import { useEffect, useCallback } from "react";
import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/useAuth";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoaded: boolean;
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (notification: Notification) => void;
}

const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoaded: false,
  setNotifications: (notifications, unreadCount) =>
    set({ notifications, unreadCount, isLoaded: true }),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: !notification.is_read ? state.unreadCount + 1 : state.unreadCount,
    })),
}));

export function useNotifications() {
  const store = useNotificationStore();
  const { profile } = useAuth();
  const supabase = (() => {
    try { return createClient(); } catch { return null; }
  })();

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id || !supabase) return;
    
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) {
        // Silently handle errors - table might not exist yet or user doesn't have access
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          // Table doesn't exist - this is okay during development
          if (!store.isLoaded) {
            store.setNotifications([], 0);
          }
        } else {
          // Log other errors for debugging
          console.warn("Notification fetch error:", error.message || error);
          if (!store.isLoaded) {
            store.setNotifications([], 0);
          }
        }
      } else if (data) {
        const unreadCount = data.filter((n: any) => !n.is_read).length;
        store.setNotifications(data as Notification[], unreadCount);
      }
    } catch (err: any) {
      // Silently handle exceptions - don't spam the console
      if (err?.message && !err.message.includes('does not exist')) {
        console.warn("Notifications unavailable:", err.message);
      }
      if (!store.isLoaded) {
        store.setNotifications([], 0);
      }
    }
  }, [profile?.id, supabase, store]);

  // Initial fetch
  useEffect(() => {
    if (profile?.id && !store.isLoaded) {
      fetchNotifications();
    }
  }, [profile?.id, store.isLoaded, fetchNotifications]);

  // 🔥 FREE POLLING (No Realtime subscription needed!)
  // Checks for new notifications every 15 seconds
  useEffect(() => {
    if (!profile?.id) return;

    // Poll every 15 seconds for new notifications
    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 15000); // 15 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [profile?.id, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!profile?.id || !supabase) return;
    
    store.markRead(notificationId);
    
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", profile.id);
    } catch (error: any) {
      if (error?.message && !error.message.includes('does not exist')) {
        console.warn("Could not mark notification as read:", error.message);
      }
    }
  }, [profile?.id, supabase, store]);

  const markAllAsRead = useCallback(async () => {
    if (!profile?.id || !supabase) return;
    
    store.markAllRead();
    
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);
    } catch (error: any) {
      if (error?.message && !error.message.includes('does not exist')) {
        console.warn("Could not mark all notifications as read:", error.message);
      }
    }
  }, [profile?.id, supabase, store]);

  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    isLoaded: store.isLoaded,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
