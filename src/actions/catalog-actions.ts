'use server';

import { revalidatePath } from 'next/cache';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { requirePermission, requireAuth } from '@/lib/auth/session';
import { productSchema, stockAdjustmentSchema } from '@/lib/validations/schemas';
import { slugify } from '@/lib/utils';
import { logStaffActivity } from '@/lib/services/audit';

export async function upsertProductAction(rawInput: Record<string, unknown>) {
  await ensureDatabaseReady();
  const isEdit = Boolean(rawInput.id);
  const user = await requirePermission(isEdit ? 'products.edit' : 'products.create');

  const parsed = productSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  const data = parsed.data;
  const slug = data.slug ? slugify(data.slug) : slugify(data.title);

  // Check duplicate SKU
  const duplicateSku = await prisma.product.findFirst({
    where: {
      sku: data.sku.trim(),
      ...(data.id ? { NOT: { id: data.id } } : {}),
    },
  });
  if (duplicateSku) {
    return { ok: false, error: `SKU "${data.sku}" is already assigned to another product.` };
  }

  let parsedVariants: Array<{
    sku: string;
    title: string;
    size?: string;
    color?: string;
    colorHex?: string;
    stock: number;
  }> = [];

  if (data.variantsJson) {
    try {
      parsedVariants = JSON.parse(data.variantsJson);
    } catch {
      parsedVariants = [];
    }
  }

  if (isEdit && data.id) {
    const existing = await prisma.product.findUnique({ where: { id: data.id } });
    if (!existing) {
      return { ok: false, error: 'Product not found' };
    }

    await prisma.product.update({
      where: { id: data.id },
      data: {
        title: data.title.trim(),
        slug,
        sku: data.sku.trim(),
        barcode: data.barcode || null,
        shortDescription: data.shortDescription || null,
        description: data.description,
        regularPrice: data.regularPrice,
        salePrice: data.salePrice ?? data.regularPrice,
        costPrice: data.costPrice,
        categoryId: data.categoryId,
        brandId: data.brandId || null,
        stockQuantity: data.stockQuantity,
        lowStockThreshold: data.lowStockThreshold,
        status: data.status,
        isFeatured: data.isFeatured,
        isNewArrival: data.isNewArrival,
        isBestSeller: data.isBestSeller,
        seoTitle: data.seoTitle || data.title,
        seoDescription: data.seoDescription || data.shortDescription || '',
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: data.id } });
    const imagesToCreate = [data.imageUrl, data.secondaryImageUrl].filter(Boolean) as string[];
    for (let i = 0; i < imagesToCreate.length; i++) {
      await prisma.productImage.create({
        data: {
          productId: data.id,
          url: imagesToCreate[i],
          altText: data.title,
          isPrimary: i === 0,
          sortOrder: i,
        },
      });
    }

    await prisma.inventory.upsert({
      where: { productId: data.id },
      update: {
        availableStock: data.stockQuantity,
        lowStockThreshold: data.lowStockThreshold,
      },
      create: {
        productId: data.id,
        availableStock: data.stockQuantity,
        lowStockThreshold: data.lowStockThreshold,
      },
    });

    if (existing.stockQuantity !== data.stockQuantity) {
      await prisma.inventoryTransaction.create({
        data: {
          productId: data.id,
          type: 'ADJUSTMENT',
          quantity: Math.abs(data.stockQuantity - existing.stockQuantity),
          previousStock: existing.stockQuantity,
          newStock: data.stockQuantity,
          reason: 'Product edit stock sync',
          performedById: user.id,
        },
      });
    }

    await logStaffActivity({
      user,
      action: 'PRODUCT_UPDATED',
      module: 'Products',
      targetId: data.sku,
      description: `Updated product "${data.title}" (SKU: ${data.sku})`,
    });
  } else {
    const created = await prisma.product.create({
      data: {
        title: data.title.trim(),
        slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
        sku: data.sku.trim(),
        barcode: data.barcode || null,
        shortDescription: data.shortDescription || null,
        description: data.description,
        regularPrice: data.regularPrice,
        salePrice: data.salePrice ?? data.regularPrice,
        costPrice: data.costPrice,
        categoryId: data.categoryId,
        brandId: data.brandId || null,
        stockQuantity: data.stockQuantity,
        lowStockThreshold: data.lowStockThreshold,
        status: data.status,
        isFeatured: data.isFeatured,
        isNewArrival: data.isNewArrival,
        isBestSeller: data.isBestSeller,
        seoTitle: data.seoTitle || data.title,
        seoDescription: data.seoDescription || data.shortDescription || '',
        images: {
          create: [data.imageUrl, data.secondaryImageUrl]
            .filter(Boolean)
            .map((url, idx) => ({
              url: url as string,
              altText: data.title,
              isPrimary: idx === 0,
              sortOrder: idx,
            })),
        },
        inventory: {
          create: {
            availableStock: data.stockQuantity,
            reservedStock: 0,
            lowStockThreshold: data.lowStockThreshold,
          },
        },
      },
    });

    if (parsedVariants.length > 0) {
      for (const v of parsedVariants) {
        await prisma.productVariant.create({
          data: {
            productId: created.id,
            sku: v.sku || `${data.sku}-${v.size || 'STD'}`,
            title: v.title || `${v.size || 'Standard'} / ${v.color || 'Beige'}`,
            size: v.size || 'Standard',
            color: v.color || 'Beige',
            colorHex: v.colorHex || '#F5F1EE',
            regularPrice: data.regularPrice,
            salePrice: data.salePrice ?? data.regularPrice,
            costPrice: data.costPrice,
            stockQuantity: Number(v.stock || data.stockQuantity),
          },
        });
      }
    } else {
      await prisma.productVariant.create({
        data: {
          productId: created.id,
          sku: `${data.sku}-STD`,
          title: 'Standard Edition',
          size: 'Standard',
          color: 'Warm Beige',
          colorHex: '#F5F1EE',
          regularPrice: data.regularPrice,
          salePrice: data.salePrice ?? data.regularPrice,
          costPrice: data.costPrice,
          stockQuantity: data.stockQuantity,
        },
      });
    }

    await prisma.inventoryTransaction.create({
      data: {
        productId: created.id,
        type: 'STOCK_IN',
        quantity: data.stockQuantity,
        previousStock: 0,
        newStock: data.stockQuantity,
        reason: 'Initial product creation stock',
        performedById: user.id,
      },
    });

    await logStaffActivity({
      user,
      action: 'PRODUCT_CREATED',
      module: 'Products',
      targetId: created.sku,
      description: `Created new product "${created.title}" (SKU: ${created.sku})`,
    });
  }

  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/admin/products');
  revalidatePath('/admin/inventory');
  return { ok: true };
}

export async function bulkProductOperationAction(params: {
  productIds: string[];
  operation: 'PUBLISH' | 'ARCHIVE' | 'DELETE' | 'DISCOUNT_10' | 'RESTOCK_10';
}) {
  await ensureDatabaseReady();
  const user = await requirePermission('products.edit');

  if (!params.productIds.length) {
    return { ok: false, error: 'No products selected' };
  }

  if (params.operation === 'DELETE') {
    await requirePermission('products.delete');
    await prisma.product.deleteMany({
      where: { id: { in: params.productIds } },
    });
  } else if (params.operation === 'PUBLISH') {
    await prisma.product.updateMany({
      where: { id: { in: params.productIds } },
      data: { status: 'PUBLISHED' },
    });
  } else if (params.operation === 'ARCHIVE') {
    await prisma.product.updateMany({
      where: { id: { in: params.productIds } },
      data: { status: 'ARCHIVED' },
    });
  } else if (params.operation === 'DISCOUNT_10') {
    const prods = await prisma.product.findMany({
      where: { id: { in: params.productIds } },
    });
    for (const p of prods) {
      const reg = Number(p.regularPrice);
      const discounted = Math.round(reg * 0.9);
      await prisma.product.update({
        where: { id: p.id },
        data: { salePrice: discounted },
      });
    }
  } else if (params.operation === 'RESTOCK_10') {
    const prods = await prisma.product.findMany({
      where: { id: { in: params.productIds } },
    });
    for (const p of prods) {
      const nextStock = p.stockQuantity + 10;
      await prisma.product.update({
        where: { id: p.id },
        data: { stockQuantity: nextStock },
      });
      await prisma.inventory.upsert({
        where: { productId: p.id },
        update: { availableStock: nextStock },
        create: { productId: p.id, availableStock: nextStock },
      });
      await prisma.inventoryTransaction.create({
        data: {
          productId: p.id,
          type: 'STOCK_IN',
          quantity: 10,
          previousStock: p.stockQuantity,
          newStock: nextStock,
          reason: 'Bulk +10 Stock Replenishment',
          performedById: user.id,
        },
      });
    }
  }

  await logStaffActivity({
    user,
    action: `BULK_PRODUCT_${params.operation}`,
    module: 'Products',
    description: `Executed ${params.operation} on ${params.productIds.length} products`,
  });

  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/admin/products');
  revalidatePath('/admin/inventory');
  return { ok: true };
}

export async function importProductsCsvAction(
  rows: Array<{
    title: string;
    sku: string;
    regularPrice: number;
    salePrice?: number;
    costPrice?: number;
    stockQuantity: number;
    categorySlug?: string;
    description?: string;
    imageUrl?: string;
  }>
) {
  await ensureDatabaseReady();
  const user = await requirePermission('products.create');

  const defaultCategory = await prisma.category.findFirst();
  if (!defaultCategory) {
    return { ok: false, error: 'Create at least one category before importing products.' };
  }

  let importedCount = 0;
  for (const row of rows) {
    if (!row.title || !row.sku) continue;
    const sku = String(row.sku).trim();
    const regularPrice = Number(row.regularPrice) || 2500;
    const salePrice = Number(row.salePrice) || regularPrice;
    const costPrice = Number(row.costPrice) || Math.round(regularPrice * 0.6);
    const stockQuantity = Math.max(0, Number(row.stockQuantity) || 10);

    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          title: row.title.trim(),
          regularPrice,
          salePrice,
          costPrice,
          stockQuantity,
        },
      });
      await prisma.inventory.upsert({
        where: { productId: existing.id },
        update: { availableStock: stockQuantity },
        create: { productId: existing.id, availableStock: stockQuantity },
      });
    } else {
      const p = await prisma.product.create({
        data: {
          title: row.title.trim(),
          slug: `${slugify(row.title)}-${Math.floor(1000 + Math.random() * 9000)}`,
          sku,
          description: row.description || `${row.title} — Imported via Maison Beige Catalog CSV`,
          shortDescription: row.title,
          regularPrice,
          salePrice,
          costPrice,
          stockQuantity,
          categoryId: defaultCategory.id,
          status: 'PUBLISHED',
          images: {
            create: {
              url:
                row.imageUrl ||
                'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
              altText: row.title,
              isPrimary: true,
            },
          },
          inventory: {
            create: {
              availableStock: stockQuantity,
              lowStockThreshold: 5,
            },
          },
        },
      });
      await prisma.inventoryTransaction.create({
        data: {
          productId: p.id,
          type: 'STOCK_IN',
          quantity: stockQuantity,
          previousStock: 0,
          newStock: stockQuantity,
          reason: 'CSV Batch Import',
          performedById: user.id,
        },
      });
    }
    importedCount++;
  }

  await logStaffActivity({
    user,
    action: 'PRODUCTS_CSV_IMPORT',
    module: 'Products',
    description: `Imported/updated ${importedCount} products via CSV upload.`,
  });

  revalidatePath('/admin/products');
  revalidatePath('/admin/inventory');
  revalidatePath('/shop');
  return { ok: true, importedCount };
}

export async function adjustInventoryAction(rawInput: Record<string, unknown>) {
  await ensureDatabaseReady();
  const user = await requirePermission('inventory.manage');

  const parsed = stockAdjustmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid adjustment data' };
  }

  const { productId, variantId, type, quantity, reason, referenceId } = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return { ok: false, error: 'Product not found' };
  }

  const previousStock = product.stockQuantity;
  let newStock = previousStock;

  if (type === 'STOCK_IN') {
    newStock = previousStock + quantity;
  } else if (type === 'STOCK_OUT') {
    if (previousStock < quantity) {
      return {
        ok: false,
        error: `Insufficient stock (${previousStock} available, cannot deduct ${quantity}).`,
      };
    }
    newStock = previousStock - quantity;
  } else {
    newStock = quantity;
  }

  await prisma.product.update({
    where: { id: productId },
    data: { stockQuantity: newStock },
  });

  await prisma.inventory.upsert({
    where: { productId },
    update: { availableStock: newStock },
    create: {
      productId,
      availableStock: newStock,
      lowStockThreshold: product.lowStockThreshold,
    },
  });

  if (variantId) {
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (variant) {
      const nextVarStock =
        type === 'STOCK_IN'
          ? variant.stockQuantity + quantity
          : type === 'STOCK_OUT'
          ? Math.max(0, variant.stockQuantity - quantity)
          : quantity;
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: nextVarStock },
      });
    }
  }

  await prisma.inventoryTransaction.create({
    data: {
      productId,
      variantId: variantId || null,
      type,
      quantity,
      previousStock,
      newStock,
      reason,
      referenceId: referenceId || null,
      performedById: user.id,
    },
  });

  await logStaffActivity({
    user,
    action: `INVENTORY_${type}`,
    module: 'Inventory',
    targetId: product.sku,
    description: `${type}: ${product.title} (${previousStock} → ${newStock}). Reason: ${reason}`,
  });

  revalidatePath('/admin/inventory');
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  return { ok: true, newStock };
}

export async function upsertCategoryAction(data: {
  id?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  isActive?: boolean;
}) {
  await ensureDatabaseReady();
  const user = await requirePermission('categories.manage');

  const slug = slugify(data.name);
  let saved;
  if (data.id) {
    saved = await prisma.category.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        parentId: data.parentId || null,
        seoTitle: data.seoTitle || data.name,
        seoDescription: data.seoDescription || data.description || null,
        isActive: data.isActive ?? true,
      },
    });
  } else {
    saved = await prisma.category.create({
      data: {
        name: data.name.trim(),
        slug: `${slug}-${Math.floor(10 + Math.random() * 89)}`,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        parentId: data.parentId || null,
        seoTitle: data.seoTitle || data.name,
        seoDescription: data.seoDescription || data.description || null,
        isActive: data.isActive ?? true,
      },
    });
  }

  await logStaffActivity({
    user,
    action: data.id ? 'CATEGORY_UPDATED' : 'CATEGORY_CREATED',
    module: 'Catalog',
    description: `${data.id ? 'Updated' : 'Created'} category "${data.name}"`,
  });

  const productCount = data.id
    ? await prisma.product.count({ where: { categoryId: saved.id } })
    : 0;

  revalidatePath('/admin/categories');
  revalidatePath('/shop');
  revalidatePath('/');
  return {
    ok: true,
    category: {
      id: saved.id,
      name: saved.name,
      slug: saved.slug,
      description: saved.description || '',
      parentId: saved.parentId,
      isActive: saved.isActive,
      productCount,
    },
  };
}

export async function deleteCategoryAction(categoryId: string) {
  await ensureDatabaseReady();
  const user = await requirePermission('categories.manage');

  const count = await prisma.product.count({ where: { categoryId } });
  if (count > 0) {
    return {
      ok: false,
      error: `Cannot delete category with ${count} linked products. Reassign products first.`,
    };
  }

  await prisma.category.delete({ where: { id: categoryId } });
  await logStaffActivity({
    user,
    action: 'CATEGORY_DELETED',
    module: 'Catalog',
    targetId: categoryId,
    description: `Deleted category ID ${categoryId}`,
  });

  revalidatePath('/admin/categories');
  revalidatePath('/shop');
  return { ok: true };
}

export async function upsertBrandAction(data: {
  id?: string;
  name: string;
  description?: string;
  logoUrl?: string;
  isActive?: boolean;
}) {
  await ensureDatabaseReady();
  const user = await requirePermission('categories.manage');

  const slug = slugify(data.name);
  let saved;
  if (data.id) {
    saved = await prisma.brand.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        description: data.description || null,
        logoUrl: data.logoUrl || null,
        isActive: data.isActive ?? true,
      },
    });
  } else {
    saved = await prisma.brand.create({
      data: {
        name: data.name.trim(),
        slug: `${slug}-${Math.floor(10 + Math.random() * 89)}`,
        description: data.description || null,
        logoUrl: data.logoUrl || null,
        isActive: data.isActive ?? true,
      },
    });
  }

  await logStaffActivity({
    user,
    action: 'BRAND_SAVED',
    module: 'Catalog',
    description: `Saved brand "${data.name}"`,
  });

  const productCount = data.id
    ? await prisma.product.count({ where: { brandId: saved.id } })
    : 0;

  revalidatePath('/admin/categories');
  revalidatePath('/shop');
  return {
    ok: true,
    brand: {
      id: saved.id,
      name: saved.name,
      slug: saved.slug,
      description: saved.description || '',
      isActive: saved.isActive,
      productCount,
    },
  };
}

export async function submitProductReviewAction(data: {
  productId: string;
  rating: number;
  title?: string;
  comment: string;
  customerName?: string;
}) {
  await ensureDatabaseReady();
  const sessionUser = await getCurrentUser().catch(() => null);
  const name = sessionUser?.name || data.customerName?.trim() || 'Verified Patron';

  if (!data.comment || data.comment.trim().length < 5) {
    return { ok: false, error: 'Please write a brief review of at least 5 characters.' };
  }

  const rating = Math.min(5, Math.max(1, Number(data.rating) || 5));

  await prisma.review.create({
    data: {
      productId: data.productId,
      userId: sessionUser?.id ?? null,
      customerName: name,
      rating,
      title: data.title?.trim() || 'Verified Purchase Review',
      comment: data.comment.trim(),
      isVerifiedPurchase: true,
      isApproved: true,
    },
  });

  const allReviews = await prisma.review.findMany({
    where: { productId: data.productId, isApproved: true },
  });

  const avg =
    allReviews.reduce((acc, r) => acc + r.rating, 0) / Math.max(1, allReviews.length);

  await prisma.product.update({
    where: { id: data.productId },
    data: {
      ratingAverage: Number(avg.toFixed(2)),
      ratingCount: allReviews.length,
    },
  });

  revalidatePath('/product/[slug]', 'page');
  return { ok: true };
}

async function getCurrentUser() {
  const { getCurrentUser: getSession } = await import('@/lib/auth/session');
  return getSession();
}

export async function toggleWishlistDatabaseAction(productId: string) {
  await ensureDatabaseReady();
  const user = await requireAuth();

  let wishlist = await prisma.wishlist.findUnique({
    where: { userId: user.id },
  });

  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: { userId: user.id },
    });
  }

  const existingItem = await prisma.wishlistItem.findUnique({
    where: {
      wishlistId_productId: {
        wishlistId: wishlist.id,
        productId,
      },
    },
  });

  if (existingItem) {
    await prisma.wishlistItem.delete({ where: { id: existingItem.id } });
    revalidatePath('/wishlist');
    revalidatePath('/account');
    return { ok: true, added: false };
  } else {
    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      },
    });
    revalidatePath('/wishlist');
    revalidatePath('/account');
    return { ok: true, added: true };
  }
}
