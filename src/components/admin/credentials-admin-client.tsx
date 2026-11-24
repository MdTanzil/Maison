'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, KeyRound } from 'lucide-react';
import { updateIntegrationCredentialsAction } from '@/actions/admin-actions';
import { useStore } from '@/components/storefront/store-provider';

export type CredentialsInitial = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
  smtpPasswordConfigured: boolean;
  bkashAppKey: string;
  bkashUsername: string;
  bkashSandbox: boolean;
  bkashAppSecretConfigured: boolean;
  bkashPasswordConfigured: boolean;
  nagadMerchantId: string;
  nagadPgPublicKey: string;
  nagadPrivateKeyConfigured: boolean;
  rocketMerchantId: string;
  rocketApiUser: string;
  rocketSandbox: boolean;
  rocketPasswordConfigured: boolean;
};

function ConfiguredBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
      Configured
    </span>
  ) : (
    <span className="rounded-full bg-[#E8E0D9] px-2 py-0.5 text-[10px] font-semibold text-[#52606D]">
      Not set
    </span>
  );
}

export function CredentialsAdminClient({
  initialCredentials,
}: {
  initialCredentials: CredentialsInitial;
}) {
  const router = useRouter();
  const { showToast } = useStore();
  const [form, setForm] = useState({
    smtpHost: initialCredentials.smtpHost,
    smtpPort: initialCredentials.smtpPort,
    smtpUser: initialCredentials.smtpUser,
    smtpPassword: '',
    smtpSecure: initialCredentials.smtpSecure,
    fromEmail: initialCredentials.fromEmail,
    fromName: initialCredentials.fromName,
    bkashAppKey: initialCredentials.bkashAppKey,
    bkashAppSecret: '',
    bkashUsername: initialCredentials.bkashUsername,
    bkashPassword: '',
    bkashSandbox: initialCredentials.bkashSandbox,
    nagadMerchantId: initialCredentials.nagadMerchantId,
    nagadMerchantPrivateKey: '',
    nagadPgPublicKey: initialCredentials.nagadPgPublicKey,
    rocketMerchantId: initialCredentials.rocketMerchantId,
    rocketApiUser: initialCredentials.rocketApiUser,
    rocketApiPassword: '',
    rocketSandbox: initialCredentials.rocketSandbox,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateIntegrationCredentialsAction(form);
    setSaving(false);

    if (res.ok) {
      showToast(
        'Credentials Saved',
        'Email and payment credentials were updated.',
        'success'
      );
      setForm((prev) => ({
        ...prev,
        smtpPassword: '',
        bkashAppSecret: '',
        bkashPassword: '',
        nagadMerchantPrivateKey: '',
        rocketApiPassword: '',
      }));
      router.refresh();
    }
  };

  const inputCls =
    'w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2';
  const labelCls = 'block font-medium text-[#2F4156] mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Super Admin Configuration
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
            Email &amp; Payment Credentials
          </h1>
          <p className="text-xs text-[#52606D] mt-1">
            Stored encrypted in the database. Leave a password field blank to keep
            the currently stored value. Secrets are never shown once saved.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#567C8D] px-6 py-3 text-xs font-semibold text-white hover:bg-[#486878]"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving Credentials...' : 'Save Credentials'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Email (SMTP) */}
        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#2F4156] flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#567C8D]" /> Email (SMTP)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>SMTP Host</label>
              <input type="text" value={form.smtpHost} placeholder="smtp.gmail.com"
                onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>SMTP Port</label>
              <input type="number" value={form.smtpPort}
                onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>SMTP Username</label>
              <input type="text" value={form.smtpUser}
                onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                SMTP Password <ConfiguredBadge configured={initialCredentials.smtpPasswordConfigured} />
              </label>
              <input type="password" value={form.smtpPassword} placeholder="Leave blank to keep current"
                onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>From Email</label>
              <input type="email" value={form.fromEmail}
                onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>From Name</label>
              <input type="text" value={form.fromName}
                onChange={(e) => setForm({ ...form, fromName: e.target.value })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.smtpSecure}
              onChange={(e) => setForm({ ...form, smtpSecure: e.target.checked })} />
            <span className="font-semibold text-[#2F4156]">Use SSL/TLS (port 465)</span>
          </label>
        </div>

        {/* bKash */}
        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#2F4156] flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#567C8D]" /> bKash Merchant
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>App Key</label>
              <input type="text" value={form.bkashAppKey}
                onChange={(e) => setForm({ ...form, bkashAppKey: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                App Secret <ConfiguredBadge configured={initialCredentials.bkashAppSecretConfigured} />
              </label>
              <input type="password" value={form.bkashAppSecret} placeholder="Leave blank to keep current"
                onChange={(e) => setForm({ ...form, bkashAppSecret: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Username</label>
              <input type="text" value={form.bkashUsername}
                onChange={(e) => setForm({ ...form, bkashUsername: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                Password <ConfiguredBadge configured={initialCredentials.bkashPasswordConfigured} />
              </label>
              <input type="password" value={form.bkashPassword} placeholder="Leave blank to keep current"
                onChange={(e) => setForm({ ...form, bkashPassword: e.target.value })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.bkashSandbox}
              onChange={(e) => setForm({ ...form, bkashSandbox: e.target.checked })} />
            <span className="font-semibold text-[#2F4156]">Sandbox mode</span>
          </label>
        </div>

        {/* Nagad */}
        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#2F4156] flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#567C8D]" /> Nagad Merchant
          </h2>
          <div>
            <label className={labelCls}>Merchant ID</label>
            <input type="text" value={form.nagadMerchantId}
              onChange={(e) => setForm({ ...form, nagadMerchantId: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>
              Merchant Private Key <ConfiguredBadge configured={initialCredentials.nagadPrivateKeyConfigured} />
            </label>
            <textarea rows={3} value={form.nagadMerchantPrivateKey} placeholder="Leave blank to keep current"
              onChange={(e) => setForm({ ...form, nagadMerchantPrivateKey: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nagad PG Public Key</label>
            <textarea rows={3} value={form.nagadPgPublicKey}
              onChange={(e) => setForm({ ...form, nagadPgPublicKey: e.target.value })} className={inputCls} />
          </div>
        </div>

        {/* Rocket */}
        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#2F4156] flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#567C8D]" /> Rocket Merchant
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Merchant ID</label>
              <input type="text" value={form.rocketMerchantId}
                onChange={(e) => setForm({ ...form, rocketMerchantId: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>API User</label>
              <input type="text" value={form.rocketApiUser}
                onChange={(e) => setForm({ ...form, rocketApiUser: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>
              API Password <ConfiguredBadge configured={initialCredentials.rocketPasswordConfigured} />
            </label>
            <input type="password" value={form.rocketApiPassword} placeholder="Leave blank to keep current"
              onChange={(e) => setForm({ ...form, rocketApiPassword: e.target.value })} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.rocketSandbox}
              onChange={(e) => setForm({ ...form, rocketSandbox: e.target.checked })} />
            <span className="font-semibold text-[#2F4156]">Sandbox mode</span>
          </label>
        </div>
      </div>
    </form>
  );
}
