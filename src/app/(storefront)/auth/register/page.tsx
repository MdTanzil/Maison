'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import { registerAction } from '@/actions/auth-actions';
import { useStore } from '@/components/storefront/store-provider';

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await registerAction({ name, email, phone, password });
    setLoading(false);

    if (!res.ok) {
      setError(res.error || 'Registration failed');
      showToast('Registration Error', res.error, 'error');
      return;
    }

    showToast('Welcome to Maison Beige', 'Your patron account has been created.', 'success');
    router.push(res.redirectTo || '/account');
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury space-y-6">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Patron Membership
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
            Create Your Account
          </h1>
          <p className="text-xs text-[#52606D] mt-1">
            Enjoy order tracking, saved addresses, and complimentary loyalty points.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#2F4156] mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="h-4 w-4 text-[#8A949E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Samira Chowdhury"
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] pl-10 pr-4 py-2.5 text-sm"
              />
            </div>
          </div>

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
                placeholder="name@example.com"
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] pl-10 pr-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#2F4156] mb-1">
              Mobile Phone Number
            </label>
            <div className="relative">
              <Phone className="h-4 w-4 text-[#8A949E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+88017..."
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] pl-10 pr-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#2F4156] mb-1">
              Password (minimum 6 characters)
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-[#8A949E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] pl-10 pr-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#567C8D] py-3 text-sm font-semibold text-white hover:bg-[#486878] disabled:opacity-50"
          >
            <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="border-t border-[#E8E0D9] pt-4 text-center text-xs text-[#52606D]">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-[#567C8D] hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
