import { prisma } from '@/lib/db/prisma';
import { SessionUser } from '@/lib/auth/session';

export async function logStaffActivity(params: {
  user: SessionUser | null;
  action: string;
  module: string;
  targetId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.staffActivityLog.create({
      data: {
        userId: params.user?.id ?? null,
        staffName: params.user?.name ?? 'System',
        roleName: params.user?.roleNames?.[0] ?? 'System',
        action: params.action,
        module: params.module,
        targetId: params.targetId ?? null,
        description: params.description,
        metadataJson: params.metadata ? (params.metadata as object) : undefined,
      },
    });
  } catch (err) {
    console.error('Failed to record staff activity log:', err);
  }
}
