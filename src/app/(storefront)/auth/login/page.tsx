'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { loginAction } from '@/actions/auth-actions';
import { useStore } from '@/components/storefront/store-provider';

const DEMO_ROLES = [
  {
    role: 'Super Admin',
    email: 'admin@maisonbeige.com',
    pass: 'Admin@123',
    desc: 'Full system access, financials, roles, staff, settings',
  },
  {
    role: 'Admin / Manager',
    email: 'manager@maisonbeige.com',
    pass: 'Staff@123',
    desc: 'Catalog, inventory, orders, order assignment, reports',
  },
  {
    role: 'Moderator',
    email: 'moderator@maisonbeige.com',
    pass: 'Staff@123',
    desc: 'Assigned orders, customer confirmation, memos (no financials)',
  },
  {
    role: 'Order Processing',
    email: 'processor@maisonbeige.com',
    pass: 'Staff@123',
    desc: 'Fulfillment, packaging, invoice & 80mm receipt printing',
  },
  {
    role: 'Delivery Staff',
    email: 'delivery@maisonbeige.com',
    pass: 'Staff@123',
    desc: 'Assigned deliveries, mark delivered/returned, cash collection',
  },
  {
    role: 'Customer Account',
    email: 'customer@maisonbeige.com',
    pass: 'Customer@123',
    desc: 'Customer dashboard, order history, addresses & wishlist',
  },
];

export default function LoginPage() {
  const { showToast } = useStore();
  const [email, setEmail] = useState('admin@maisonbeige.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await loginAction({ email, password });
    setLoading(false);

    if (!res.ok) {
      setError(res.error || 'Authentication failed');
      showToast('Sign-In Failed', res.error, 'error');
      return;
    }

    showToast('Welcome Back', `Signed in as ${res.user?.name}`, 'success');
    window.location.href = res.redirectTo || '/';
  };

  const handleQuickRoleSignIn = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    setError('');
    const res = await loginAction({ email: demoEmail, password: demoPass });
    setLoading(false);

    if (res.ok) {
      showToast('Role Session Active', `Signed in as ${res.user?.name}`, 'success');
      window.location.href = res.redirectTo || '/';
    } else {
      setError(res.error || 'Sign-in failed');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sign-In Form */}
        <div className="lg:col-span-5 rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
              Authenticated Access
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
              Sign In to Maison Beige
            </h1>
            <p className="text-xs text-[#52606D] mt-1">
              Access your patron account or role-based staff management console.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#2F4156] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-[#8A949E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] pl-10 pr-4 py-2.5 text-sm text-[#2F4156]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2F4156] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-[#8A949E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] pl-10 pr-4 py-2.5 text-sm text-[#2F4156]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#567C8D] py-3 text-sm font-semibold text-white hover:bg-[#486878] disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In Securely'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="border-t border-[#E8E0D9] pt-4 text-center text-xs text-[#52606D]">
            New to Maison Beige?{' '}
            <Link href="/auth/register" className="font-semibold text-[#567C8D] hover:underline">
              Create a Patron Account
            </Link>
          </div>
        </div>

        {/* One-Click Multi-Role RBAC Verification Panel */}
        <div className="lg:col-span-7 rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#E8E0D9] pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C8D9E6] px-3 py-0.5 text-[11px] font-semibold text-[#2F4156]">
                <KeyRound className="h-3 w-3 text-[#567C8D]" />
                <span>Multi-Role RBAC Evaluation Accounts</span>
              </span>
              <h2 className="font-serif text-xl font-semibold text-[#2F4156] mt-2">
                Instant Role-Based Access Switcher
              </h2>
              <p className="text-xs text-[#52606D] mt-0.5">
                Click any role below to sign in with real database credentials and verify role-specific dashboards and server-enforced permissions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {DEMO_ROLES.map((item) => (
              <div
                key={item.email}
                className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] p-4 flex flex-col justify-between hover:border-[#567C8D] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2F4156]">{item.role}</span>
                    <span className="rounded bg-white px-2 py-0.5 font-mono text-[10px] text-[#567C8D] border border-[#E8E0D9]">
                      {item.pass}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-[#567C8D] mt-1">{item.email}</p>
                  <p className="text-xs text-[#52606D] mt-1.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickRoleSignIn(item.email, item.pass)}
                  className="mt-3 w-full rounded-lg bg-[#567C8D] py-2 text-xs font-semibold text-white hover:bg-[#486878] transition-colors"
                >
                  Sign In as {item.role}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#52606D] pt-2">
            <ShieldCheck className="h-4 w-4 text-[#567C8D] shrink-0" />
            <span>
              All role permissions are enforced on the server in Server Actions and Route Handlers.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
