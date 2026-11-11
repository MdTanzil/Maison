'use client';

import React, { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { useStore } from './store-provider';

export function NewsletterForm() {
  const { showToast } = useStore();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      showToast('Invalid Email', 'Please enter a valid email address.', 'error');
      return;
    }
    setSubscribed(true);
    showToast(
      'Welcome to Maison Beige',
      'You are now subscribed to private archive releases and privileges.',
      'success'
    );
    setEmail('');
  };

  return (
    <div className="rounded-2xl border border-[#E8E0D9] bg-white p-8 sm:p-12 shadow-luxury text-center max-w-4xl mx-auto">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#567C8D]">
        The Private Journal
      </span>
      <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-2">
        Receive Invitations to Private Archive Releases
      </h2>
      <p className="text-sm text-[#52606D] max-w-lg mx-auto mt-2">
        Join our list for early access to seasonal linen capsules, stoneware editions, and complimentary concierge privileges.
      </p>

      {subscribed ? (
        <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F5F1EE] border border-[#E8E0D9] px-5 py-3 text-sm font-medium text-[#2F4156]">
          <CheckCircle2 className="h-4 w-4 text-[#567C8D]" />
          <span>Thank you for joining the Maison Beige Private Journal.</span>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
        >
          <div className="relative w-full">
            <Mail className="h-4 w-4 text-[#8A949E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] pl-10 pr-4 py-2.5 text-sm text-[#1F2933] focus:outline-none focus:border-[#567C8D] focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto rounded-xl bg-[#567C8D] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#486878] transition-colors shrink-0"
          >
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
}
