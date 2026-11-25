'use server';

import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/session';

export type MyNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
};

function serialize(n: {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: Date;
}): MyNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function getMyNotificationsAction(): Promise<{
  ok: boolean;
  notifications?: MyNotification[];
  unreadCount?: number;
  error?: string;
}> {
  await ensureDatabaseReady();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Please sign in to continue.' };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return { ok: true, notifications: notifications.map(serialize), unreadCount };
}

export async function markNotificationReadAction(id: string) {
  await ensureDatabaseReady();
  const user = await requireAuth();

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== user.id) {
    return { ok: false, error: 'Notification not found.' };
  }

  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return { ok: true };
}

export async function markAllNotificationsReadAction() {
  await ensureDatabaseReady();
  const user = await requireAuth();

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  return { ok: true };
}
