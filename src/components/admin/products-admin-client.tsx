'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import {
  Plus,
  Search,
  Download,
  Upload,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  upsertProductAction,
  bulkProductOperationAction,
  importProductsCsvAction,
} from '@/actions/catalog-actions';
import { useStore } from '@/components/storefront/store-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingButton } from '@/components/ui/loading-button';

interface AdminProductRow {
  id: string;
  title: string;
  slug: string;
  sku: string;
  barcode: string | null;
  shortDescription: string | null;
  description: string;
  regularPrice: number;
  salePrice: number | null;
  costPrice: number;
  categoryId: string;
  categoryName: string;
  brandId: string | null;
  brandName: string;
  stockQuantity: number;
  lowStockThreshold: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  imageUrl: string;
  secondaryImageUrl: string;
  variantCount: number;
  soldCount: number;
}

type PendingConfirm = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
};

export function ProductsAdminClient({
  products,
  categories,
  brands,
  canCreate,
  canEdit,
  canDelete,
  canViewCost,
}: {
  products: AdminProductRow[];
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewCost: boolean;
}) {
  const router = useRouter();
  const { showToast } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
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

  // Product Form State
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [regularPrice, setRegularPrice] = useState('6500');
  const [salePrice, setSalePrice] = useState('5800');
  const [costPrice, setCostPrice] = useState('3400');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [brandId, setBrandId] = useState(brands[0]?.id || '');
  const [stockQuantity, setStockQuantity] = useState('20');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');
  const [isFeatured, setIsFeatured] = useState(true);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80'
  );
  const [secondaryImageUrl, setSecondaryImageUrl] = useState('');

  const filtered = products.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !p.title.toLowerCase().includes(q) &&
        !p.sku.toLowerCase().includes(q) &&
        !p.categoryName.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  const openNewProductModal = () => {
    setEditId(undefined);
    setTitle('');
    setSku(`MB-NEW-${Math.floor(100 + Math.random() * 900)}`);
    setBarcode(`89011${Math.floor(1000000 + Math.random() * 9000000)}`);
    setShortDescription('');
    setDescription('');
    setRegularPrice('6500');
    setSalePrice('5800');
    setCostPrice('3400');
    setCategoryId(categories[0]?.id || '');
    setBrandId(brands[0]?.id || '');
    setStockQuantity('20');
    setLowStockThreshold('5');
    setStatus('PUBLISHED');
    setIsFeatured(true);
    setIsNewArrival(true);
    setImageUrl(
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80'
    );
    setSecondaryImageUrl('');
    setModalOpen(true);
  };

  const openEditModal = (p: AdminProductRow) => {
    setEditId(p.id);
    setTitle(p.title);
    setSku(p.sku);
    setBarcode(p.barcode || '');
    setShortDescription(p.shortDescription || '');
    setDescription(p.description);
    setRegularPrice(String(p.regularPrice));
    setSalePrice(String(p.salePrice ?? p.regularPrice));
    setCostPrice(String(p.costPrice));
    setCategoryId(p.categoryId);
    setBrandId(p.brandId || '');
    setStockQuantity(String(p.stockQuantity));
    setLowStockThreshold(String(p.lowStockThreshold));
    setStatus(p.status);
    setIsFeatured(p.isFeatured);
    setIsNewArrival(p.isNewArrival);
    setImageUrl(p.imageUrl);
    setSecondaryImageUrl(p.secondaryImageUrl);
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await upsertProductAction({
      id: editId,
      title,
      sku,
      barcode,
      shortDescription,
      description,
      regularPrice: Number(regularPrice),
      salePrice: salePrice ? Number(salePrice) : null,
      costPrice: Number(costPrice),
      categoryId,
      brandId: brandId || null,
      stockQuantity: Number(stockQuantity),
      lowStockThreshold: Number(lowStockThreshold),
      status,
      isFeatured,
      isNewArrival,
      isBestSeller: false,
      imageUrl,
      secondaryImageUrl: secondaryImageUrl || null,
    });
    setSaving(false);

    if (!res.ok) {
      showToast('Validation Error', res.error, 'error');
      return;
    }

    showToast(
      editId ? 'Product Updated' : 'Product Created',
      `${title} (${sku}) saved to catalog.`,
      'success'
    );
    setModalOpen(false);
    router.refresh();
  };

  const handleBulkAction = (
    operation: 'PUBLISH' | 'ARCHIVE' | 'DELETE' | 'DISCOUNT_10' | 'RESTOCK_10'
  ) => {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    const noun = count === 1 ? 'product' : 'products';
    const meta: Record<
      typeof operation,
      { title: string; message: string; confirmLabel: string; destructive?: boolean }
    > = {
      PUBLISH: {
        title: 'Publish Products',
        message: `Publish ${count} selected ${noun} to the storefront?`,
        confirmLabel: 'Publish',
      },
      ARCHIVE: {
        title: 'Archive Products',
        message: `Archive ${count} selected ${noun}? Archived products are hidden from the storefront.`,
        confirmLabel: 'Archive',
      },
      DELETE: {
        title: 'Delete Products',
        message: `Permanently delete ${count} selected ${noun}? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
      DISCOUNT_10: {
        title: 'Apply 10% Sale Price',
        message: `Apply a 10% sale price to ${count} selected ${noun}?`,
        confirmLabel: 'Apply Discount',
      },
      RESTOCK_10: {
        title: 'Replenish Stock',
        message: `Add 10 units of stock to each of the ${count} selected ${noun}?`,
        confirmLabel: 'Replenish Stock',
      },
    };
    const m = meta[operation];
    setConfirm({
      title: m.title,
      message: m.message,
      confirmLabel: m.confirmLabel,
      destructive: m.destructive,
      onConfirm: async () => {
        const res = await bulkProductOperationAction({
          productIds: selectedIds,
          operation,
        });
        if (res.ok) {
          showToast('Bulk Action Complete', `Applied ${operation} to ${selectedIds.length} products.`);
          setSelectedIds([]);
          router.refresh();
        } else {
          showToast('Bulk Error', res.error, 'error');
        }
      },
    });
  };

  const handleDeleteProduct = (p: AdminProductRow) => {
    setConfirm({
      title: 'Delete Product',
      message: `Permanently delete "${p.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        const res = await bulkProductOperationAction({
          productIds: [p.id],
          operation: 'DELETE',
        });
        if (res.ok) {
          showToast('Product Deleted', `"${p.title}" was permanently deleted.`, 'success');
          setSelectedIds((prev) => prev.filter((x) => x !== p.id));
          router.refresh();
        } else {
          showToast('Delete Failed', res.error, 'error');
        }
      },
    });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = (results.data as Array<Record<string, string>>).map((r) => ({
            title: r.Title || r.title || '',
            sku: r.SKU || r.sku || '',
            regularPrice: Number(r.RegularPrice || r.regularPrice || 3500),
            salePrice: Number(r.SalePrice || r.salePrice || 3200),
            stockQuantity: Number(r.StockQuantity || r.stockQuantity || 15),
          }));
          const res = await importProductsCsvAction(rows);
          if (res.ok) {
            showToast(
              'CSV Import Complete',
              `Imported/updated ${res.importedCount} products.`,
              'success'
            );
            router.refresh();
          } else {
            showToast('Import Failed', res.error, 'error');
          }
        } finally {
          setCsvImporting(false);
        }
      },
      error: (err) => {
        setCsvImporting(false);
        showToast('Import Failed', err.message, 'error');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Merchandising &amp; Catalog
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
            Products &amp; Pricing ({filtered.length})
          </h1>
          <p className="text-xs text-[#52606D] mt-0.5">
            Manage SKUs, regular/sale/cost prices, stock quantities, CSV imports, and bulk price updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/export/products"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-4 py-2.5 text-xs font-semibold text-[#2F4156] hover:border-[#567C8D]"
          >
            <Download className="h-4 w-4 text-[#567C8D]" />
            <span>Export CSV</span>
          </a>

          {canCreate && (
            <label
              className={`inline-flex items-center gap-1.5 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-4 py-2.5 text-xs font-semibold text-[#2F4156] hover:border-[#567C8D] ${
                csvImporting ? 'pointer-events-none opacity-50' : 'cursor-pointer'
              }`}
            >
              {csvImporting ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#567C8D]" />
              ) : (
                <Upload className="h-4 w-4 text-[#567C8D]" />
              )}
              <span>{csvImporting ? 'Importing...' : 'Import CSV'}</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </label>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={openNewProductModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#567C8D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Bulk Actions */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-[#8A949E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product title, SKU, or category..."
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] pl-10 pr-4 py-2 text-xs text-[#2F4156]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-4 py-2 text-xs text-[#2F4156]"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>

        {selectedIds.length > 0 && canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#567C8D]/30 bg-[#C8D9E6]/35 px-4 py-2.5">
            <span className="text-xs font-semibold text-[#2F4156]">
              {selectedIds.length} products selected
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleBulkAction('PUBLISH')}
                className="rounded-lg bg-[#567C8D] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Bulk Publish
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction('ARCHIVE')}
                className="rounded-lg border border-[#E8E0D9] bg-white px-3 py-1.5 text-xs font-semibold text-[#2F4156]"
              >
                Bulk Archive
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction('DISCOUNT_10')}
                className="rounded-lg border border-[#E8E0D9] bg-white px-3 py-1.5 text-xs font-semibold text-[#567C8D]"
              >
                Apply 10% Sale Price
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction('RESTOCK_10')}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
              >
                +10 Stock Replenish
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleBulkAction('DELETE')}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white overflow-hidden shadow-luxury">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds(
                        selectedIds.length === filtered.length
                          ? []
                          : filtered.map((p) => p.id)
                      )
                    }
                    className="text-[#567C8D]"
                  >
                    {selectedIds.length === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-3 font-semibold">Piece / SKU</th>
                <th className="py-3.5 px-3 font-semibold hidden lg:table-cell">Department</th>
                <th className="py-3.5 px-3 font-semibold">Regular / Sale Price</th>
                {canViewCost && (
                  <th className="py-3.5 px-3 font-semibold hidden xl:table-cell">Cost Price</th>
                )}
                <th className="py-3.5 px-3 font-semibold">Stock</th>
                <th className="py-3.5 px-3 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E0D9]">
              {filtered.map((p) => {
                const selected = selectedIds.includes(p.id);
                const isLow = p.stockQuantity <= p.lowStockThreshold;
                return (
                  <tr key={p.id} className="hover:bg-[#F5F1EE]/50">
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIds((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((x) => x !== p.id)
                              : [...prev, p.id]
                          )
                        }
                        className="text-[#567C8D]"
                      >
                        {selected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="h-12 w-10 shrink-0 rounded-lg object-cover border border-[#E8E0D9]"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#2F4156]">{p.title}</p>
                          <p className="font-mono text-[11px] text-[#567C8D]">
                            SKU: {p.sku} • {p.variantCount} Variants
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 hidden lg:table-cell">
                      <p className="font-medium text-[#2F4156]">{p.categoryName}</p>
                      <p className="text-[11px] text-[#52606D]">{p.brandName}</p>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <p className="font-bold text-[#2F4156]">
                        {formatCurrency(p.salePrice ?? p.regularPrice)}
                      </p>
                      {p.salePrice && p.salePrice < p.regularPrice && (
                        <p className="text-[11px] text-[#8A949E] line-through">
                          {formatCurrency(p.regularPrice)}
                        </p>
                      )}
                    </td>

                    {canViewCost && (
                      <td className="py-3.5 px-3 font-medium text-[#52606D] hidden xl:table-cell whitespace-nowrap">
                        {formatCurrency(p.costPrice)}
                      </td>
                    )}

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isLow
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {isLow && <AlertTriangle className="h-3 w-3" />}
                        {p.stockQuantity} in stock
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          p.status === 'PUBLISHED'
                            ? 'bg-[#C8D9E6] text-[#2F4156]'
                            : 'bg-[#F5F1EE] text-[#52606D]'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-1.5 text-xs font-semibold text-[#2F4156] hover:border-[#567C8D]"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#567C8D]" />
                            <span>Edit</span>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury-md space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E0D9] pb-3">
              <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
                {editId ? 'Edit Product' : 'Create New Atelier Product'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-[#52606D] hover:bg-[#F5F1EE]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#2F4156] mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2F4156] mb-1">
                    SKU (Unique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#2F4156] mb-1">
                    Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#2F4156] mb-1">
                    Brand
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                  >
                    <option value="">Default Atelier</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#2F4156] mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED')
                    }
                    className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                  >
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block font-semibold text-[#2F4156] mb-1">
                    Regular (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    value={regularPrice}
                    onChange={(e) => setRegularPrice(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2F4156] mb-1">
                    Sale Price (৳)
                  </label>
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                  />
                </div>
                {canViewCost && (
                  <div>
                    <label className="block font-semibold text-[#2F4156] mb-1">
                      Cost Price (৳)
                    </label>
                    <input
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-[#2F4156] mb-1">
                    Stock Qty *
                  </label>
                  <input
                    type="number"
                    required
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2F4156] mb-1">
                    Low Alert
                  </label>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#2F4156] mb-1">
                    Primary Image URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2F4156] mb-1">
                    Secondary Image URL
                  </label>
                  <input
                    type="text"
                    value={secondaryImageUrl}
                    onChange={(e) => setSecondaryImageUrl(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2F4156] mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2F4156] mb-1">
                  Full Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                  />
                  <span className="font-medium text-[#2F4156]">Featured Product</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => setIsNewArrival(e.target.checked)}
                  />
                  <span className="font-medium text-[#2F4156]">New Arrival Badge</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E8E0D9]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-5 py-2.5 font-semibold text-[#2F4156]"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={saving}
                  loadingText="Saving..."
                  className="h-auto rounded-xl bg-[#567C8D] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
                >
                  Save Product
                </LoadingButton>
              </div>
            </form>
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
