'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import {
  getMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type MyNotification,
} from '@/actions/notification-actions';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<MyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const res = await getMyNotificationsAction();
    if (res.ok) {
      setNotifications(res.notifications ?? []);
      setUnreadCount(res.unreadCount ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  // Poll for new notifications every 30 seconds so the badge and list
  // update without a page reload. Pauses while the tab is hidden, and
  // refreshes immediately when the tab becomes visible again.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') refresh();
    }
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 30000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open ]);

  async function handleOpenNotification(n: MyNotification) {
    if (!n.isRead) {
      await markNotificationReadAction(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) refresh();
        }}
        aria-label="Notifications"
        className="relative rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] p-2.5 text-[#2F4156] hover:border-[#567C8D] transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#E8E0D9] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#E8E0D9] px-4 py-3">
            <p className="text-sm font-semibold text-[#2F4156]">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#567C8D] hover:text-[#2F4156]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-[#52606D]">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#52606D]">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleOpenNotification(n)}
                  className={`block w-full border-b border-[#F5F1EE] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#F5F1EE]/60 ${
                    !n.isRead ? 'bg-[#C8D9E6]/25' : ''
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[#2F4156]">{n.title}</span>
                    <span className="shrink-0 text-[10px] text-[#52606D]">{formatTime(n.createdAt)}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#52606D]">{n.message}</span>
                  {!n.isRead && (
                    <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-[#567C8D]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
