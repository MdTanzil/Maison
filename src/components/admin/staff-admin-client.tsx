'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Shield,
  KeyRound,
  Activity,
  CheckCircle2,
  Power,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  upsertStaffMemberAction,
  toggleStaffActiveAction,
  resetStaffPasswordAction,
  upsertRolePermissionsAction,
} from '@/actions/admin-actions';
import { useStore } from '@/components/storefront/store-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingButton } from '@/components/ui/loading-button';

type PendingConfirm = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
};

export function StaffAdminClient({
  staff,
  roles,
  permissions,
  activityLogs,
  canManageRoles,
}: {
  staff: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    isActive: boolean;
    roleId: string;
    roleName: string;
    employeeCode: string;
    department: string;
    designation: string;
    ordersAssigned: number;
    ordersCompleted: number;
    ordersCancelled: number;
    cashCollected: number;
  }>;
  roles: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    isSystem: boolean;
    permissionCodes: string[];
  }>;
  permissions: Array<{ code: string; name: string; module: string }>;
  activityLogs: Array<{
    id: string;
    staffName: string;
    roleName: string;
    action: string;
    module: string;
    targetId: string | null;
    description: string;
    createdAt: string;
  }>;
  canManageRoles: boolean;
}) {
  const router = useRouter();
  const { showToast } = useStore();
  const [tab, setTab] = useState<'staff' | 'roles' | 'logs'>('staff');
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  const runConfirmed = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await confirm.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirm(null);
    }
  };

  // New Staff Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Staff@123');
  const [roleId, setRoleId] = useState(
    roles.find((r) => r.slug === 'MODERATOR')?.id || roles[0]?.id || ''
  );
  const [employeeCode, setEmployeeCode] = useState(
    `MB-EMP-00${staff.length + 1}`
  );
  const [department, setDepartment] = useState('Order Desk');
  const [designation, setDesignation] = useState('Order Moderator');

  // Custom Role Form State
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPermCodes, setSelectedPermCodes] = useState<string[]>([
    'dashboard.view',
    'orders.view',
    'orders.confirm',
    'orders.print_memo',
  ]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStaff(true);
    try {
      const res = await upsertStaffMemberAction({
        name,
        email,
        phone,
        password,
        roleId,
        employeeCode,
        department,
        designation,
        customPermissions: [],
      });
      if (!res.ok) {
        showToast('Error', res.error, 'error');
        return;
      }
      showToast('Staff Created', `Created staff account for ${name}.`, 'success');
      setName('');
      setEmail('');
      setPhone('');
      router.refresh();
    } finally {
      setSavingStaff(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    const res = await toggleStaffActiveAction(id);
    if (!res.ok) {
      showToast('Action Denied', res.error, 'error');
      return;
    }
    showToast('Status Updated', 'Updated staff account active state.', 'info');
    router.refresh();
  };

  const handleResetPassword = async (id: string, staffName: string) => {
    const res = await resetStaffPasswordAction(id, 'Staff@123');
    if (res.ok) {
      showToast(
        'Password Reset',
        `Password for ${staffName} reset to default (Staff@123).`,
        'success'
      );
    }
  };

  const togglePermCode = (code: string) => {
    setSelectedPermCodes((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRole(true);
    try {
      const res = await upsertRolePermissionsAction({
        roleId: selectedRoleId || undefined,
        name: roleName,
        description: roleDesc,
        permissionCodes: selectedPermCodes,
      });
      if (res.ok) {
        showToast('Role Saved', `Configured role "${roleName}" with granular permissions.`);
        setRoleName('');
        setRoleDesc('');
        setSelectedRoleId('');
        router.refresh();
      }
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Governance &amp; Security
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
            Staff, Custom RBAC Roles &amp; Audit Logs
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('staff')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold ${
              tab === 'staff'
                ? 'bg-[#567C8D] text-white'
                : 'bg-[#F5F1EE] text-[#2F4156]'
            }`}
          >
            Staff &amp; Performance ({staff.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('roles')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold ${
              tab === 'roles'
                ? 'bg-[#567C8D] text-white'
                : 'bg-[#F5F1EE] text-[#2F4156]'
            }`}
          >
            Roles &amp; Permissions ({roles.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('logs')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold ${
              tab === 'logs'
                ? 'bg-[#567C8D] text-white'
                : 'bg-[#F5F1EE] text-[#2F4156]'
            }`}
          >
            Staff Activity Log ({activityLogs.length})
          </button>
        </div>
      </div>

      {tab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
            <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
              Staff Directory &amp; Order Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                    <th className="py-3 px-3 font-semibold">Employee / Role</th>
                    <th className="py-3 px-3 font-semibold">Assigned / Completed</th>
                    <th className="py-3 px-3 font-semibold hidden lg:table-cell">Cash Collected</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E0D9]">
                  {staff.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F5F1EE]/50">
                      <td className="py-3 px-3">
                        <p className="font-bold text-[#2F4156]">{s.name}</p>
                        <p className="text-[11px] text-[#52606D] break-all">
                          {s.employeeCode} • {s.email}
                        </p>
                        <span className="inline-block rounded bg-[#C8D9E6] px-2 py-0.5 text-[10px] font-semibold text-[#2F4156] mt-0.5">
                          {s.roleName}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <p className="font-semibold text-[#2F4156]">
                          {s.ordersCompleted} / {s.ordersAssigned} Completed
                        </p>
                        <p className="text-[11px] text-rose-700">
                          {s.ordersCancelled} Cancelled
                        </p>
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-700 hidden lg:table-cell whitespace-nowrap">
                        {formatCurrency(s.cashCollected)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            s.isActive
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {s.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({
                                title: 'Reset Password',
                                message: `Reset the password for ${s.name} to the default (Staff@123)? They should change it after signing in.`,
                                confirmLabel: 'Reset Password',
                                onConfirm: () => handleResetPassword(s.id, s.name),
                              })
                            }
                            className="rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-2.5 py-1 text-[11px] font-medium text-[#2F4156] hover:border-[#567C8D]"
                            title="Reset Password"
                          >
                            <KeyRound className="h-3.5 w-3.5 inline mr-1 text-[#567C8D]" />
                            Reset PW
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({
                                title: s.isActive ? 'Deactivate Staff' : 'Reactivate Staff',
                                message: s.isActive
                                  ? `Deactivate ${s.name}? They will no longer be able to sign in to the admin panel.`
                                  : `Reactivate ${s.name}? They will be able to sign in to the admin panel again.`,
                                confirmLabel: s.isActive ? 'Deactivate' : 'Reactivate',
                                destructive: s.isActive,
                                onConfirm: () => handleToggleActive(s.id),
                              })
                            }
                            className="rounded-lg border border-[#E8E0D9] bg-white px-2.5 py-1 text-[11px] font-medium text-[#2F4156] hover:border-[#567C8D]"
                          >
                            <Power className="h-3.5 w-3.5 inline" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Staff Form */}
          <form
            onSubmit={handleCreateStaff}
            className="lg:col-span-4 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-3.5 text-xs"
          >
            <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
              Create Staff Account
            </h3>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Staff Full Name *"
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Staff Email Address *"
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile Number *"
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="Employee Code"
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 font-mono"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Initial Password"
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
            </div>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 font-semibold text-[#2F4156]"
            >
              {roles
                .filter((r) => r.slug !== 'CUSTOMER')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    Role: {r.name}
                  </option>
                ))}
            </select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Department"
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Designation"
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
            </div>
            <LoadingButton
              type="submit"
              loading={savingStaff}
              loadingText="Creating..."
              className="h-auto w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#567C8D] py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Staff Account</span>
            </LoadingButton>
          </form>
        </div>
      )}

      {tab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            {roles.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#2F4156]">{r.name}</span>
                    <span className="ml-2 rounded bg-[#F5F1EE] px-2 py-0.5 font-mono text-[10px] text-[#567C8D]">
                      {r.slug}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleId(r.id);
                      setRoleName(r.name);
                      setRoleDesc(r.description);
                      setSelectedPermCodes(r.permissionCodes);
                    }}
                    className="text-xs font-semibold text-[#567C8D] hover:underline"
                  >
                    Load Permissions
                  </button>
                </div>
                <p className="text-xs text-[#52606D]">{r.description}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {r.permissionCodes.map((code) => (
                    <span
                      key={code}
                      className="rounded bg-[#C8D9E6]/50 px-2 py-0.5 font-mono text-[10px] text-[#2F4156]"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {canManageRoles && (
            <form
              onSubmit={handleSaveRole}
              className="lg:col-span-6 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4 text-xs"
            >
              <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
                {selectedRoleId ? `Edit Role: ${roleName}` : 'Create Custom Role & Assign Permissions'}
              </h3>

              <input
                type="text"
                required
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Role Name (e.g. Senior Warehouse Supervisor)"
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
              />
              <input
                type="text"
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
                placeholder="Role description..."
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
              />

              <div>
                <p className="font-semibold text-[#2F4156] mb-2">
                  Granular Server-Enforced Permissions ({selectedPermCodes.length} selected)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] p-3">
                  {permissions.map((perm) => (
                    <label
                      key={perm.code}
                      className="flex items-start gap-2 cursor-pointer rounded-lg bg-white p-2 border border-[#E8E0D9]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermCodes.includes(perm.code)}
                        onChange={() => togglePermCode(perm.code)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-semibold text-[#2F4156]">{perm.name}</p>
                        <p className="font-mono text-[10px] text-[#567C8D]">{perm.code}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <LoadingButton
                type="submit"
                loading={savingRole}
                loadingText="Saving..."
                className="h-auto w-full rounded-xl bg-[#567C8D] py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
              >
                Save Role &amp; Permission Matrix
              </LoadingButton>
            </form>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
          <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
            Dedicated Staff Activity &amp; Security Audit Log
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                  <th className="py-3 px-3 font-semibold">Timestamp</th>
                  <th className="py-3 px-3 font-semibold">Staff Member</th>
                  <th className="py-3 px-3 font-semibold">Role</th>
                  <th className="py-3 px-3 font-semibold">Module / Action</th>
                  <th className="py-3 px-3 font-semibold hidden lg:table-cell">Target</th>
                  <th className="py-3 px-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D9]">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F5F1EE]/50">
                    <td className="py-2.5 px-3 text-[#52606D] whitespace-nowrap">
                      {formatDate(log.createdAt, true)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#2F4156] whitespace-nowrap">
                      {log.staffName}
                    </td>
                    <td className="py-2.5 px-3 text-[#567C8D] font-medium whitespace-nowrap">
                      {log.roleName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="rounded bg-[#C8D9E6]/60 px-2 py-0.5 font-mono text-[10px] font-bold text-[#2F4156]">
                        {log.module} • {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#52606D] hidden lg:table-cell whitespace-nowrap">
                      {log.targetId || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-[#2F4156]">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        destructive={confirm?.destructive}
        loading={confirmLoading}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
