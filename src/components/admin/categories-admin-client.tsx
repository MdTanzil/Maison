'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Trash2 } from 'lucide-react';
import {
  upsertCategoryAction,
  deleteCategoryAction,
  upsertBrandAction,
} from '@/actions/catalog-actions';
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

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  parentName: string | null;
  isActive: boolean;
  productCount: number;
};

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  productCount: number;
};

export function CategoriesAdminClient({
  categories,
  brands,
}: {
  categories: CategoryRow[];
  brands: BrandRow[];
}) {
  const router = useRouter();
  const { showToast } = useStore();

  // Local copies of the lists so create/delete update the UI immediately —
  // router.refresh() reconciles with the server afterwards, but its RSC
  // round-trip can take seconds on a cold serverless function.
  const [categoryRows, setCategoryRows] = useState(categories);
  const [brandRows, setBrandRows] = useState(brands);

  useEffect(() => {
    setCategoryRows(categories);
  }, [categories]);

  useEffect(() => {
    setBrandRows(brands);
  }, [brands]);

  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);

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

  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catParentId, setCatParentId] = useState('');

  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCategory(true);
    try {
      const res = await upsertCategoryAction({
        name: catName,
        description: catDesc,
        parentId: catParentId || null,
      });
      if (res.ok) {
        showToast('Category Saved', `Added "${catName}" to catalog hierarchy.`);
        setCatName('');
        setCatDesc('');
        const saved = res.category;
        if (saved) {
          setCategoryRows((rows) => {
            const row: CategoryRow = {
              ...saved,
              parentName: saved.parentId
                ? rows.find((r) => r.id === saved.parentId)?.name ?? null
                : null,
            };
            return rows.some((r) => r.id === row.id)
              ? rows.map((r) => (r.id === row.id ? row : r))
              : [...rows, row];
          });
        }
        router.refresh();
      }
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await deleteCategoryAction(id);
    if (!res.ok) {
      showToast('Cannot Delete', res.error, 'error');
      return;
    }
    showToast('Category Deleted', 'Removed category from catalog.', 'info');
    setCategoryRows((rows) => rows.filter((c) => c.id !== id));
    router.refresh();
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    try {
      const res = await upsertBrandAction({
        name: brandName,
        description: brandDesc,
      });
      if (res.ok) {
        showToast('Brand Saved', `Added "${brandName}" to brands.`);
        setBrandName('');
        setBrandDesc('');
        const saved = res.brand;
        if (saved) {
          setBrandRows((rows) =>
            rows.some((r) => r.id === saved.id)
              ? rows.map((r) => (r.id === saved.id ? saved : r))
              : [...rows, saved]
          );
        }
        router.refresh();
      }
    } finally {
      setSavingBrand(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
          Taxonomy &amp; Hierarchy
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
          Categories &amp; Brands Management
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Categories List & Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#2F4156]">
              Hierarchical Categories ({categoryRows.length})
            </h2>
            <div className="divide-y divide-[#E8E0D9] text-xs">
              {categoryRows.map((c) => (
                <div
                  key={c.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#2F4156]">{c.name}</span>
                      {c.parentName && (
                        <span className="rounded bg-[#C8D9E6] px-2 py-0.5 text-[10px] font-semibold text-[#2F4156]">
                          Child of {c.parentName}
                        </span>
                      )}
                      <span className="text-[#52606D]">
                        ({c.productCount} products)
                      </span>
                    </div>
                    <p className="text-[#52606D] mt-0.5">{c.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirm({
                        title: 'Delete Category',
                        message: `Delete "${c.name}" from the catalog? This cannot be undone.`,
                        confirmLabel: 'Delete',
                        destructive: true,
                        onConfirm: () => handleDeleteCategory(c.id),
                      })
                    }
                    className="text-[#8A949E] hover:text-rose-600 p-1.5 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#2F4156]">
              Atelier Brands ({brandRows.length})
            </h2>
            <div className="divide-y divide-[#E8E0D9] text-xs">
              {brandRows.map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#2F4156]">{b.name}</p>
                    <p className="text-[#52606D]">{b.description}</p>
                  </div>
                  <span className="rounded-full bg-[#F5F1EE] px-2.5 py-1 font-semibold text-[#567C8D] shrink-0 whitespace-nowrap">
                    {b.productCount} pieces
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleCreateCategory}
            className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4 text-xs"
          >
            <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
              Create Category / Subcategory
            </h3>
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Cashmere Knitwear"
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Parent Category (Optional for Subcategory)
              </label>
              <select
                value={catParentId}
                onChange={(e) => setCatParentId(e.target.value)}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
              >
                <option value="">None (Top-Level Department)</option>
                {categoryRows.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
              />
            </div>
            <LoadingButton
              type="submit"
              loading={savingCategory}
              loadingText="Saving..."
              className="h-auto w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#567C8D] py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
            >
              <Plus className="h-4 w-4" />
              <span>Save Category</span>
            </LoadingButton>
          </form>

          <form
            onSubmit={handleCreateBrand}
            className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4 text-xs"
          >
            <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
              Create Brand
            </h3>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Brand Name"
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
            <textarea
              rows={2}
              value={brandDesc}
              onChange={(e) => setBrandDesc(e.target.value)}
              placeholder="Brand heritage & notes"
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
            <LoadingButton
              type="submit"
              loading={savingBrand}
              loadingText="Saving..."
              className="h-auto w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2F4156] py-2.5 text-xs font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              <span>Save Brand</span>
            </LoadingButton>
          </form>
        </div>
      </div>
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
