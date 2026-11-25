'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package,
  MapPin,
  User as UserIcon,
  Award,
  Printer,
  Truck,
  Plus,
  Trash2,
  LayoutDashboard,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  updateCustomerProfileAction,
  saveCustomerAddressAction,
  deleteCustomerAddressAction,
} from '@/actions/auth-actions';
import { useStore } from './store-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingButton } from '@/components/ui/loading-button';

type PendingConfirm = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
};

export function CustomerAccountClient({
  user,
  addresses,
  orders,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    roles: string[];
    isStaff: boolean;
    loyaltyPoints: number;
    totalOrders: number;
    totalSpent: number;
  };
  addresses: Array<{
    id: string;
    label: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    area: string;
    city: string;
    postalCode: string;
    zoneType: string;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    grandTotal: number;
    shippingAddress: string;
    trackingNumber: string | null;
    courierProvider: string;
    createdAt: string;
    items: Array<{
      id: string;
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }>;
}) {
  const router = useRouter();
  const { showToast } = useStore();
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile'>('orders');

  // Profile form state
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Address form state
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrName, setAddrName] = useState(user.name);
  const [addrPhone, setAddrPhone] = useState(user.phone);
  const [addrLine1, setAddrLine1] = useState('');
  const [addrArea, setAddrArea] = useState('');
  const [addrCity, setAddrCity] = useState('Dhaka');
  const [addrZone, setAddrZone] = useState('INSIDE_CITY');
  const [savingAddr, setSavingAddr] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

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

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const res = await updateCustomerProfileAction({
      name,
      phone,
      currentPassword: currentPassword || undefined,
      newPassword: newPassword || undefined,
    });
    setSavingProfile(false);
    if (!res.ok) {
      showToast('Update Failed', res.error, 'error');
      return;
    }
    showToast('Profile Updated', 'Your account details have been saved.', 'success');
    setCurrentPassword('');
    setNewPassword('');
    router.refresh();
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddr(true);
    const res = await saveCustomerAddressAction({
      label: addrLabel,
      fullName: addrName,
      phone: addrPhone,
      addressLine1: addrLine1,
      area: addrArea,
      city: addrCity,
      zoneType: addrZone,
      isDefault: true,
    });
    setSavingAddr(false);
    if (res.ok) {
      showToast('Address Saved', 'Added to your address book.', 'success');
      setAddrLine1('');
      setAddrArea('');
      router.refresh();
    }
  };

  const handleDeleteAddress = async (id: string) => {
    await deleteCustomerAddressAction(id);
    showToast('Address Removed', 'Deleted from your address book.', 'info');
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* Top Patron Summary Header */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Patron Account • {user.roles.join(', ')}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
            Welcome, {user.name}
          </h1>
          <p className="text-xs text-[#52606D] mt-1">
            {user.email} • {user.phone}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-xl bg-[#F5F1EE] p-3.5 border border-[#E8E0D9] text-center min-w-0">
            <p className="text-xs text-[#52606D]">Total Orders</p>
            <p className="text-lg font-bold text-[#2F4156] mt-0.5 break-words">{user.totalOrders}</p>
          </div>
          <div className="rounded-xl bg-[#F5F1EE] p-3.5 border border-[#E8E0D9] text-center min-w-0">
            <p className="text-xs text-[#52606D]">Lifetime Spent</p>
            <p className="text-lg font-bold text-[#2F4156] mt-0.5 break-words">
              {formatCurrency(user.totalSpent)}
            </p>
          </div>
          <div className="rounded-xl bg-[#C8D9E6]/60 p-3.5 border border-[#E8E0D9] text-center min-w-0">
            <p className="text-xs text-[#2F4156]">Privilege Points</p>
            <p className="text-lg font-bold text-[#2F4156] mt-0.5 break-words">{user.loyaltyPoints}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'orders'
                ? 'bg-[#567C8D] text-white shadow-sm'
                : 'bg-white text-[#2F4156] border border-[#E8E0D9] hover:border-[#567C8D]'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Order History &amp; Invoices ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'addresses'
                ? 'bg-[#567C8D] text-white shadow-sm'
                : 'bg-white text-[#2F4156] border border-[#E8E0D9] hover:border-[#567C8D]'
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Address Book ({addresses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-[#567C8D] text-white shadow-sm'
                : 'bg-white text-[#2F4156] border border-[#E8E0D9] hover:border-[#567C8D]'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>Profile &amp; Password</span>
          </button>
        </div>

        {user.isStaff && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2F4156] px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Switch to Staff Admin Console</span>
          </Link>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-[#E8E0D9] bg-white p-12 text-center shadow-luxury">
              <p className="text-base font-semibold text-[#2F4156]">
                You haven&apos;t placed any orders yet.
              </p>
              <Link
                href="/shop"
                className="mt-4 inline-flex rounded-xl bg-[#567C8D] px-5 py-2.5 text-xs font-semibold text-white"
              >
                Explore the Catalog
              </Link>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E0D9] pb-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <p className="text-xs text-[#52606D]">Order Number</p>
                      <p className="text-sm font-mono font-bold text-[#2F4156]">
                        {order.orderNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#52606D]">Placed Date</p>
                      <p className="text-xs font-medium text-[#2F4156]">
                        {formatDate(order.createdAt, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#52606D]">Order Status</p>
                      <span className="inline-flex rounded-full bg-[#C8D9E6] px-2.5 py-0.5 text-xs font-semibold text-[#2F4156]">
                        {order.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-[#52606D]">Payment</p>
                      <span className="text-xs font-semibold text-[#567C8D]">
                        {order.paymentMethod} ({order.paymentStatus})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/track-order?q=${order.orderNumber}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-1.5 text-xs font-medium text-[#2F4156] hover:border-[#567C8D]"
                    >
                      <Truck className="h-3.5 w-3.5 text-[#567C8D]" />
                      <span>Track</span>
                    </Link>
                    <Link
                      href={`/account/orders/${order.id}/print?format=a4`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#567C8D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#486878]"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Invoice / Memo</span>
                    </Link>
                  </div>
                </div>

                <div className="divide-y divide-[#E8E0D9]">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="py-2 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-[#2F4156]">
                          {item.productName}
                        </span>
                        {item.variantName && (
                          <span className="text-[#52606D] ml-1.5">
                            ({item.variantName})
                          </span>
                        )}
                        <span className="text-[#52606D] ml-2">× {item.quantity}</span>
                      </div>
                      <span className="font-semibold text-[#2F4156] shrink-0">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E8E0D9] text-xs">
                  <span className="text-[#52606D]">
                    Delivery Address: {order.shippingAddress}
                  </span>
                  <span className="text-sm font-bold text-[#2F4156]">
                    Grand Total: {formatCurrency(order.grandTotal)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'addresses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="rounded-xl border border-[#E8E0D9] bg-white p-5 shadow-luxury flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#2F4156]">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="rounded-full bg-[#C8D9E6] px-2.5 py-0.5 text-[10px] font-semibold text-[#2F4156]">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#2F4156] mt-1">
                    {addr.fullName} • {addr.phone}
                  </p>
                  <p className="text-xs text-[#52606D] mt-0.5">
                    {addr.addressLine1}, {addr.area ? `${addr.area}, ` : ''}
                    {addr.city} ({addr.zoneType})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfirm({
                      title: 'Remove Address',
                      message: `Remove the "${addr.label}" address from your address book?`,
                      confirmLabel: 'Remove',
                      destructive: true,
                      onConfirm: () => handleDeleteAddress(addr.id),
                    })
                  }
                  className="text-[#8A949E] hover:text-rose-600 p-1.5 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury">
            <h3 className="font-serif text-lg font-semibold text-[#2F4156] mb-4">
              Add Delivery Address
            </h3>
            <form onSubmit={handleAddAddress} className="space-y-3">
              <input
                type="text"
                required
                value={addrLabel}
                onChange={(e) => setAddrLabel(e.target.value)}
                placeholder="Label (Home, Office)"
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                value={addrName}
                onChange={(e) => setAddrName(e.target.value)}
                placeholder="Recipient Full Name"
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                value={addrPhone}
                onChange={(e) => setAddrPhone(e.target.value)}
                placeholder="Recipient Phone"
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                value={addrLine1}
                onChange={(e) => setAddrLine1(e.target.value)}
                placeholder="House, Road, Apartment Details"
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={addrArea}
                  onChange={(e) => setAddrArea(e.target.value)}
                  placeholder="Area (e.g. Banani)"
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  placeholder="City"
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
                />
              </div>
              <select
                value={addrZone}
                onChange={(e) => setAddrZone(e.target.value)}
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
              >
                <option value="INSIDE_CITY">Inside Dhaka City</option>
                <option value="SUB_AREA">Dhaka Sub-Area</option>
                <option value="OUTSIDE_CITY">Outside Dhaka</option>
              </select>
              <LoadingButton
                type="submit"
                loading={savingAddr}
                loadingText="Saving..."
                className="h-auto w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#567C8D] py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
              >
                <Plus className="h-4 w-4" />
                <span>Save Address</span>
              </LoadingButton>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="max-w-xl rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury">
          <h3 className="font-serif text-xl font-semibold text-[#2F4156] mb-4">
            Update Personal Information &amp; Password
          </h3>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#2F4156] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2F4156] mb-1">
                Phone Number
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-sm"
              />
            </div>
            <div className="border-t border-[#E8E0D9] pt-4 space-y-3">
              <p className="text-xs font-semibold text-[#2F4156]">
                Change Password (Optional)
              </p>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current Password"
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-sm"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password (min 6 chars)"
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-sm"
              />
            </div>
            <LoadingButton
              type="submit"
              loading={savingProfile}
              loadingText="Saving..."
              className="h-auto rounded-xl bg-[#567C8D] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
            >
              Save Changes
            </LoadingButton>
          </form>
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
