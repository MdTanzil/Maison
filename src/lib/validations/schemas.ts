import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(7, 'Please enter a valid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, 'Product title is required'),
  slug: z.string().optional(),
  sku: z.string().min(2, 'SKU is required'),
  barcode: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  regularPrice: z.coerce.number().positive('Regular price must be greater than 0'),
  salePrice: z.coerce.number().nonnegative().optional().nullable(),
  costPrice: z.coerce.number().nonnegative().default(0),
  categoryId: z.string().min(1, 'Category is required'),
  brandId: z.string().optional().nullable(),
  stockQuantity: z.coerce.number().int().nonnegative('Stock cannot be negative'),
  lowStockThreshold: z.coerce.number().int().nonnegative().default(5),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  imageUrl: z.string().url('Primary image URL must be valid'),
  secondaryImageUrl: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  variantsJson: z.string().optional(),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  reason: z.string().min(3, 'Please specify a reason for this stock adjustment'),
  referenceId: z.string().optional(),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Full name is required'),
  customerPhone: z.string().min(7, 'Valid phone number is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  shippingAddressLine: z.string().min(5, 'Detailed delivery address is required'),
  shippingArea: z.string().optional(),
  shippingCity: z.string().min(2, 'City is required'),
  shippingPostalCode: z.string().optional(),
  shippingZone: z.enum(['INSIDE_CITY', 'SUB_AREA', 'OUTSIDE_CITY']).default('INSIDE_CITY'),
  paymentMethod: z
    .enum([
      'COD',
      'BANK_TRANSFER',
      'BKASH_MANUAL',
      'NAGAD_MANUAL',
      'SSLCOMMERZ',
      'BKASH_ONLINE',
      'NAGAD_ONLINE',
      'STRIPE',
    ])
    .default('COD'),
  transactionRef: z.string().optional(),
  senderPhone: z.string().optional(),
  couponCode: z.string().optional(),
  customerNotes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional().nullable(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'Your shopping bag cannot be empty'),
});

export const couponSchema = z.object({
  code: z.string().min(3, 'Coupon code must be at least 3 characters').toUpperCase(),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.coerce.number().positive('Discount value must be positive'),
  minOrderAmount: z.coerce.number().nonnegative().default(0),
  maxDiscountAmount: z.coerce.number().positive().optional().nullable(),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  usageLimit: z.coerce.number().int().positive().optional().nullable(),
  perCustomerLimit: z.coerce.number().int().positive().default(1),
  isActive: z.boolean().default(true),
});

export const staffSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Staff name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Phone number is required'),
  password: z.string().min(6).optional(),
  roleId: z.string().min(1, 'Role is required'),
  employeeCode: z.string().min(2, 'Employee code is required'),
  department: z.string().optional(),
  designation: z.string().optional(),
  assignedZone: z.string().optional(),
  customPermissions: z.array(z.string()).default([]),
});
