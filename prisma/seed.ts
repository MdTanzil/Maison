import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

export const ALL_PERMISSIONS = [
  { code: 'dashboard.view', name: 'View Dashboard', module: 'Dashboard' },
  { code: 'products.view', name: 'View Products', module: 'Products' },
  { code: 'products.create', name: 'Create Products', module: 'Products' },
  { code: 'products.edit', name: 'Edit Products', module: 'Products' },
  { code: 'products.delete', name: 'Delete Products', module: 'Products' },
  { code: 'products.cost_view', name: 'View Cost/Purchase Price', module: 'Products' },
  { code: 'categories.manage', name: 'Manage Categories & Brands', module: 'Catalog' },
  { code: 'inventory.view', name: 'View Inventory', module: 'Inventory' },
  { code: 'inventory.manage', name: 'Adjust & Manage Stock', module: 'Inventory' },
  { code: 'orders.view', name: 'View Orders', module: 'Orders' },
  { code: 'orders.confirm', name: 'Confirm Orders', module: 'Orders' },
  { code: 'orders.update_status', name: 'Update Order Status', module: 'Orders' },
  { code: 'orders.assign', name: 'Assign Orders to Staff', module: 'Orders' },
  { code: 'orders.cancel', name: 'Cancel & Return Orders', module: 'Orders' },
  { code: 'orders.print_memo', name: 'Print Order Memo & Invoice', module: 'Orders' },
  { code: 'customers.view', name: 'View Customers', module: 'Customers' },
  { code: 'customers.manage', name: 'Manage & Block Customers', module: 'Customers' },
  { code: 'coupons.manage', name: 'Manage Coupons & Promotions', module: 'Marketing' },
  { code: 'payments.view', name: 'View Payments', module: 'Finance' },
  { code: 'payments.verify', name: 'Verify Payments & Refunds', module: 'Finance' },
  { code: 'shipping.manage', name: 'Manage Shipping & Couriers', module: 'Shipping' },
  { code: 'delivery.update', name: 'Update Assigned Deliveries & Cash', module: 'Shipping' },
  { code: 'staff.manage', name: 'Manage Staff Accounts', module: 'Administration' },
  { code: 'roles.manage', name: 'Manage Roles & Permissions', module: 'Administration' },
  { code: 'reports.view', name: 'View Financial Reports & Analytics', module: 'Reports' },
  { code: 'settings.manage', name: 'Configure Website Settings', module: 'Administration' },
];

export async function seedDatabase(prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? (await import('../src/lib/db/prisma')).prisma;

  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    return;
  }

  console.log('Seeding MAISON BEIGE PostgreSQL database...');

  // 1. Create Permissions
  const permissionMap: Record<string, string> = {};
  for (const perm of ALL_PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { code: perm.code },
      update: perm,
      create: perm,
    });
    permissionMap[perm.code] = created.id;
  }

  // 2. Create Roles
  const rolesConfig = [
    {
      name: 'Super Admin',
      slug: 'SUPER_ADMIN',
      description: 'Full unrestricted access to all system modules, financials, staff, and settings.',
      isSystem: true,
      perms: ALL_PERMISSIONS.map((p) => p.code),
    },
    {
      name: 'Admin / Manager',
      slug: 'ADMIN_MANAGER',
      description: 'Manages catalog, inventory, orders, customers, order assignment, and operational reports.',
      isSystem: true,
      perms: [
        'dashboard.view',
        'products.view',
        'products.create',
        'products.edit',
        'products.cost_view',
        'categories.manage',
        'inventory.view',
        'inventory.manage',
        'orders.view',
        'orders.confirm',
        'orders.update_status',
        'orders.assign',
        'orders.cancel',
        'orders.print_memo',
        'customers.view',
        'customers.manage',
        'coupons.manage',
        'payments.view',
        'payments.verify',
        'shipping.manage',
        'reports.view',
      ],
    },
    {
      name: 'Moderator',
      slug: 'MODERATOR',
      description: 'Views assigned orders, confirms customer orders, adds notes, updates statuses, and prints memos.',
      isSystem: true,
      perms: [
        'dashboard.view',
        'products.view',
        'inventory.view',
        'orders.view',
        'orders.confirm',
        'orders.update_status',
        'orders.print_memo',
        'customers.view',
      ],
    },
    {
      name: 'Order Processing Staff',
      slug: 'ORDER_PROCESSING',
      description: 'Processes confirmed orders, prepares packaging, updates statuses, and prints invoices/thermal receipts.',
      isSystem: true,
      perms: [
        'dashboard.view',
        'inventory.view',
        'orders.view',
        'orders.confirm',
        'orders.update_status',
        'orders.print_memo',
      ],
    },
    {
      name: 'Delivery Staff',
      slug: 'DELIVERY_STAFF',
      description: 'Accesses assigned deliveries, customer delivery details, marks delivered/returned, and records collected cash.',
      isSystem: true,
      perms: ['dashboard.view', 'orders.view', 'delivery.update', 'orders.print_memo'],
    },
    {
      name: 'Customer',
      slug: 'CUSTOMER',
      description: 'Storefront customer account with order tracking, wishlist, reviews, and address book.',
      isSystem: true,
      perms: [],
    },
  ];

  const roleMap: Record<string, string> = {};
  for (const rc of rolesConfig) {
    const role = await prisma.role.upsert({
      where: { slug: rc.slug },
      update: { name: rc.name, description: rc.description, isSystem: rc.isSystem },
      create: {
        name: rc.name,
        slug: rc.slug,
        description: rc.description,
        isSystem: rc.isSystem,
      },
    });
    roleMap[rc.slug] = role.id;

    for (const code of rc.perms) {
      const permId = permissionMap[code];
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permId,
          },
        });
      }
    }
  }

  // 3. Create Staff & Customer Users
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const staffHash = await bcrypt.hash('Staff@123', 10);
  const customerHash = await bcrypt.hash('Customer@123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Aarav Rahman (Super Admin)',
      email: 'admin@maisonbeige.com',
      phone: '+8801711000001',
      passwordHash: adminHash,
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: roleMap.SUPER_ADMIN } },
      staffProfile: {
        create: {
          employeeCode: 'MB-EMP-001',
          department: 'Executive Management',
          designation: 'Chief Executive & Systems Architect',
          ordersAssigned: 12,
          ordersCompleted: 11,
        },
      },
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      name: 'Nadia Islam (Store Manager)',
      email: 'manager@maisonbeige.com',
      phone: '+8801711000002',
      passwordHash: staffHash,
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: roleMap.ADMIN_MANAGER } },
      staffProfile: {
        create: {
          employeeCode: 'MB-EMP-002',
          department: 'Operations & Merchandising',
          designation: 'Senior Operations Manager',
          ordersAssigned: 28,
          ordersCompleted: 26,
        },
      },
    },
  });

  const moderatorUser = await prisma.user.create({
    data: {
      name: 'Tanvir Hossain (Moderator)',
      email: 'moderator@maisonbeige.com',
      phone: '+8801711000003',
      passwordHash: staffHash,
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: roleMap.MODERATOR } },
      staffProfile: {
        create: {
          employeeCode: 'MB-EMP-003',
          department: 'Customer Experience & Order Desk',
          designation: 'Lead Order Moderator',
          ordersAssigned: 45,
          ordersCompleted: 41,
          ordersCancelled: 2,
        },
      },
    },
  });

  const processorUser = await prisma.user.create({
    data: {
      name: 'Farhana Karim (Fulfillment)',
      email: 'processor@maisonbeige.com',
      phone: '+8801711000004',
      passwordHash: staffHash,
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: roleMap.ORDER_PROCESSING } },
      staffProfile: {
        create: {
          employeeCode: 'MB-EMP-004',
          department: 'Atelier Fulfillment & Packaging',
          designation: 'Order Processing Specialist',
          ordersAssigned: 39,
          ordersCompleted: 36,
        },
      },
    },
  });

  const deliveryUser = await prisma.user.create({
    data: {
      name: 'Kamrul Hasan (Delivery Rider)',
      email: 'delivery@maisonbeige.com',
      phone: '+8801711000005',
      passwordHash: staffHash,
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: roleMap.DELIVERY_STAFF } },
      staffProfile: {
        create: {
          employeeCode: 'MB-EMP-005',
          department: 'Logistics & Last-Mile Concierge',
          designation: 'Senior Delivery Executive',
          assignedZone: 'Dhaka North (Banani, Gulshan, Uttara)',
          ordersAssigned: 54,
          ordersCompleted: 50,
          cashCollected: 84500,
        },
      },
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      name: 'Samira Chowdhury',
      email: 'customer@maisonbeige.com',
      phone: '+8801819223344',
      passwordHash: customerHash,
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: roleMap.CUSTOMER } },
      customerProfile: {
        create: {
          loyaltyPoints: 420,
          totalOrders: 3,
          totalSpent: 28950,
          internalNotes: 'VIP client — prefers afternoon delivery in Banani.',
        },
      },
      addresses: {
        create: [
          {
            label: 'Home Residence',
            fullName: 'Samira Chowdhury',
            phone: '+8801819223344',
            addressLine1: 'Apt 5B, House 18, Road 27, Banani',
            area: 'Banani',
            city: 'Dhaka',
            postalCode: '1213',
            zoneType: 'INSIDE_CITY',
            isDefault: true,
          },
        ],
      },
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      name: 'Rafiq Ahmed',
      email: 'rafiq.ahmed@example.com',
      phone: '+8801911556677',
      passwordHash: customerHash,
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: roleMap.CUSTOMER } },
      customerProfile: {
        create: {
          loyaltyPoints: 180,
          totalOrders: 2,
          totalSpent: 14600,
          internalNotes: 'Corporate client from Chattogram.',
        },
      },
      addresses: {
        create: [
          {
            label: 'Office',
            fullName: 'Rafiq Ahmed',
            phone: '+8801911556677',
            addressLine1: 'Level 4, Peninsula Tower, Khulshi',
            area: 'Khulshi',
            city: 'Chattogram',
            postalCode: '4225',
            zoneType: 'OUTSIDE_CITY',
            isDefault: true,
          },
        ],
      },
    },
  });

  // 4. Website Settings
  await prisma.websiteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      storeName: 'MAISON BEIGE',
      tagline: 'Quiet Luxury & Timeless Essentials',
      contactEmail: 'concierge@maisonbeige.com',
      contactPhone: '+880 1711-000001',
      secondaryPhone: '+880 1819-223344',
      address: 'House 42, Road 11, Banani, Dhaka 1213, Bangladesh',
      city: 'Dhaka',
      country: 'Bangladesh',
      currencyCode: 'BDT',
      currencySymbol: '৳',
      taxRate: 5.0,
      insideCityShipping: 80.0,
      subAreaShipping: 110.0,
      outsideCityShipping: 150.0,
      freeShippingThreshold: 10000.0,
      allowGuestCheckout: true,
      autoDeductStockOnConfirm: true,
      announcementText:
        'Complimentary Express Delivery on Orders Above ৳10,000 • Use Code LUXURY10 for 10% Off Your First Order',
      announcementActive: true,
      socialLinksJson: {
        instagram: 'https://instagram.com/maisonbeige',
        facebook: 'https://facebook.com/maisonbeige',
        pinterest: 'https://pinterest.com/maisonbeige',
      },
      paymentSettingsJson: {
        codEnabled: true,
        bankTransferEnabled: true,
        bankDetails: 'City Bank PLC • A/C Name: MAISON BEIGE LTD • A/C No: 1402938475001 • Branch: Gulshan Avenue',
        bkashManualEnabled: true,
        bkashMerchantNumber: '01711-000001 (bKash Merchant)',
        nagadManualEnabled: true,
        nagadMerchantNumber: '01811-000002 (Nagad Merchant)',
        sslcommerzConfigured: Boolean(process.env.SSLCOMMERZ_STORE_ID),
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      },
      courierSettingsJson: {
        steadfastConfigured: Boolean(process.env.STEADFAST_API_KEY),
        pathaoConfigured: Boolean(process.env.PATHAO_CLIENT_ID),
        redxConfigured: Boolean(process.env.REDX_ACCESS_TOKEN),
      },
    },
  });

  // 5. Shipping Methods
  const insideCityShipping = await prisma.shippingMethod.create({
    data: {
      name: 'Dhaka Metro Concierge Delivery',
      code: 'INSIDE_CITY',
      zoneType: 'INSIDE_CITY',
      charge: 80,
      estimatedDays: '24 - 48 Hours',
      isActive: true,
    },
  });

  await prisma.shippingMethod.create({
    data: {
      name: 'Dhaka Sub-Urban Delivery (Savar, Gazipur, Narayanganj)',
      code: 'SUB_AREA',
      zoneType: 'SUB_AREA',
      charge: 110,
      estimatedDays: '2 - 3 Business Days',
      isActive: true,
    },
  });

  const outsideCityShipping = await prisma.shippingMethod.create({
    data: {
      name: 'Nationwide Express Courier (Outside Dhaka)',
      code: 'OUTSIDE_CITY',
      zoneType: 'OUTSIDE_CITY',
      charge: 150,
      estimatedDays: '3 - 5 Business Days',
      isActive: true,
    },
  });

  // 6. Categories & Brands
  const catApparel = await prisma.category.create({
    data: {
      name: 'Apparel & Tailoring',
      slug: 'apparel-tailoring',
      description: 'Breathable Belgian linen, mulberry silk, and relaxed architectural silhouettes.',
      imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=80',
      seoTitle: 'Luxury Linen & Tailored Apparel | Maison Beige',
      sortOrder: 1,
    },
  });

  const catLeather = await prisma.category.create({
    data: {
      name: 'Fine Leather & Bags',
      slug: 'fine-leather-bags',
      description: 'Hand-stitched full-grain calfskin totes, weekender bags, and small leather goods.',
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80',
      seoTitle: 'Artisanal Leather Bags & Accessories | Maison Beige',
      sortOrder: 2,
    },
  });

  const catHome = await prisma.category.create({
    data: {
      name: 'Home & Living Sanctuary',
      slug: 'home-living-sanctuary',
      description: 'Hand-thrown stoneware ceramics, organic cashmere throws, and botanical room fragrances.',
      imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80',
      seoTitle: 'Minimalist Home Decor & Ceramics | Maison Beige',
      sortOrder: 3,
    },
  });

  const catAccents = await prisma.category.create({
    data: {
      name: 'Timepieces & Accents',
      slug: 'timepieces-accents',
      description: 'Minimalist dress watches, cashmere scarves, and sculptural eyewear.',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
      seoTitle: 'Minimalist Watches & Luxury Accents | Maison Beige',
      sortOrder: 4,
    },
  });

  // Subcategories
  await prisma.category.create({
    data: {
      name: 'Linen Outerwear',
      slug: 'linen-outerwear',
      parentId: catApparel.id,
      description: 'Unstructured blazers and trench coats.',
      sortOrder: 5,
    },
  });

  const brandMaison = await prisma.brand.create({
    data: {
      name: 'Maison Beige Atelier',
      slug: 'maison-beige-atelier',
      description: 'Signature in-house line crafted with sustainable natural fibers.',
    },
  });

  const brandAurelia = await prisma.brand.create({
    data: {
      name: 'Aurelia Linen',
      slug: 'aurelia-linen',
      description: 'European flax linen garments tailored for warm climates.',
    },
  });

  const brandVelluto = await prisma.brand.create({
    data: {
      name: 'Velluto Leatherworks',
      slug: 'velluto-leatherworks',
      description: 'Vegetable-tanned leather goods handcrafted by master artisans.',
    },
  });

  const brandSera = await prisma.brand.create({
    data: {
      name: 'Sera Living',
      slug: 'sera-living',
      description: 'Tactile ceramic vessels, diffusers, and woven textiles.',
    },
  });

  // 7. Products with Variants, Images & Inventory
  const productsData = [
    {
      title: 'The Siena Unstructured Belgian Linen Blazer',
      slug: 'siena-unstructured-belgian-linen-blazer',
      sku: 'MB-APR-101',
      barcode: '8901122334401',
      shortDescription: 'Breathable 100% Belgian flax linen blazer in warm oat beige with horn buttons.',
      description:
        'Tailored with a relaxed, unstructured shoulder for effortless drape, the Siena Blazer is woven from certified European flax linen. Naturally thermoregulating and half-lined in cupro twill, it transitions seamlessly from daytime meetings to evening gatherings.',
      regularPrice: 9800,
      salePrice: 8450,
      costPrice: 5200,
      categoryId: catApparel.id,
      brandId: brandAurelia.id,
      stockQuantity: 28,
      lowStockThreshold: 6,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      ratingAverage: 4.9,
      ratingCount: 18,
      soldCount: 42,
      specifications: {
        Material: '100% Certified Belgian Flax Linen',
        Lining: 'Breathable Bemberg Cupro',
        Buttons: 'Natural Ethical Horn Buttons',
        Fit: 'Relaxed Tailored Fit',
        Care: 'Dry clean or gentle cold steam',
      },
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=85',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=85',
      ],
      variants: [
        { sku: 'MB-APR-101-S-OAT', title: 'Small / Warm Oat', size: 'S', color: 'Warm Oat', colorHex: '#E5DDD3', stock: 8 },
        { sku: 'MB-APR-101-M-OAT', title: 'Medium / Warm Oat', size: 'M', color: 'Warm Oat', colorHex: '#E5DDD3', stock: 12 },
        { sku: 'MB-APR-101-L-SLATE', title: 'Large / Muted Slate', size: 'L', color: 'Muted Slate', colorHex: '#567C8D', stock: 8 },
      ],
    },
    {
      title: 'Palazzo Full-Grain Calfskin Structured Tote',
      slug: 'palazzo-full-grain-calfskin-structured-tote',
      sku: 'MB-BAG-201',
      barcode: '8901122334402',
      shortDescription: 'Architectural everyday tote in vegetable-tanned taupe leather with suede interior.',
      description:
        'Handcrafted from supple full-grain vegetable-tanned calfskin, the Palazzo Tote features a generous interior compartment that accommodates a 15-inch laptop, accompanied by a detachable zippered pochette and brushed champagne hardware.',
      regularPrice: 14500,
      salePrice: 12900,
      costPrice: 7800,
      categoryId: catLeather.id,
      brandId: brandVelluto.id,
      stockQuantity: 15,
      lowStockThreshold: 5,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: true,
      ratingAverage: 4.95,
      ratingCount: 24,
      soldCount: 38,
      specifications: {
        Exterior: '100% Vegetable-Tanned Full-Grain Calfskin',
        Interior: 'Micro-suede lining with laptop sleeve',
        Dimensions: '38cm × 29cm × 15cm',
        Hardware: 'Brushed Anti-Tarnish Brass',
      },
      images: [
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85',
        'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1000&q=85',
      ],
      variants: [
        { sku: 'MB-BAG-201-SAND', title: 'Sandstone Beige', size: 'One Size', color: 'Sandstone', colorHex: '#D8C8B8', stock: 9 },
        { sku: 'MB-BAG-201-ESPR', title: 'Deep Espresso', size: 'One Size', color: 'Espresso', colorHex: '#4A3728', stock: 6 },
      ],
    },
    {
      title: 'Kyoto Artisanal Stoneware Vessel & Diffuser Set',
      slug: 'kyoto-artisanal-stoneware-vessel-diffuser-set',
      sku: 'MB-HOM-301',
      barcode: '8901122334403',
      shortDescription: 'Wheel-thrown matte ceramic vase paired with White Tea & Cedarwood botanical reed diffuser.',
      description:
        'Each Kyoto stoneware vessel is individually thrown on the wheel and finished in a raw travertine-inspired glaze. Accompanied by our signature 200ml White Tea, Bergamot, and Atlas Cedarwood diffuser oil.',
      regularPrice: 4600,
      salePrice: 3950,
      costPrice: 2100,
      categoryId: catHome.id,
      brandId: brandSera.id,
      stockQuantity: 34,
      lowStockThreshold: 8,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      ratingAverage: 4.85,
      ratingCount: 14,
      soldCount: 29,
      specifications: {
        Material: 'High-fired stoneware ceramic & essential oil blend',
        ScentNotes: 'White Tea, Calabrian Bergamot, Warm Amber, Cedar',
        Volume: '200ml Diffuser + 24cm Sculptural Vase',
      },
      images: [
        'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=1000&q=85',
        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=85',
      ],
      variants: [
        { sku: 'MB-HOM-301-TRAV', title: 'Travertine Cream', size: 'Standard Set', color: 'Travertine', colorHex: '#EFEAE2', stock: 34 },
      ],
    },
    {
      title: 'Chronographe Minimaliste 38mm Sapphire Watch',
      slug: 'chronographe-minimaliste-38mm-sapphire-watch',
      sku: 'MB-ACC-401',
      barcode: '8901122334404',
      shortDescription: 'Ultra-thin 38mm ivory dial timepiece with domed sapphire crystal and Italian calfskin strap.',
      description:
        'Designed for understated distinction, the Chronographe Minimaliste pairs a warm eggshell dial and blued steel hands with a Swiss quartz movement and quick-release Italian nubuck leather strap.',
      regularPrice: 16500,
      salePrice: 14800,
      costPrice: 8900,
      categoryId: catAccents.id,
      brandId: brandMaison.id,
      stockQuantity: 4,
      lowStockThreshold: 5,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      ratingAverage: 4.92,
      ratingCount: 31,
      soldCount: 51,
      specifications: {
        CaseDiameter: '38mm 316L Surgical Stainless Steel',
        Crystal: 'Scratch-resistant Domed Sapphire with AR coating',
        WaterResistance: '5 ATM (50 Meters)',
        Strap: '20mm Italian Stitchless Nubuck Leather',
      },
      images: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85',
        'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1000&q=85',
      ],
      variants: [
        { sku: 'MB-ACC-401-IVORY', title: 'Ivory Dial / Camel Strap', size: '38mm', color: 'Camel', colorHex: '#C19A6B', stock: 4 },
      ],
    },
    {
      title: 'Como Mulberry Silk & Cashmere Resort Shirt',
      slug: 'como-mulberry-silk-cashmere-resort-shirt',
      sku: 'MB-APR-102',
      barcode: '8901122334405',
      shortDescription: 'Fluid fine-gauge knit resort collar shirt spun from 70% mulberry silk and 30% Mongolian cashmere.',
      description:
        'Featherlight and lustrous against the skin, the Como Resort Shirt features mother-of-pearl buttons, rib-knit cuffs, and a relaxed drape suited for coastal evenings and refined layering.',
      regularPrice: 7800,
      salePrice: 6900,
      costPrice: 4100,
      categoryId: catApparel.id,
      brandId: brandMaison.id,
      stockQuantity: 22,
      lowStockThreshold: 5,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: true,
      ratingAverage: 4.88,
      ratingCount: 15,
      soldCount: 27,
      specifications: {
        Composition: '70% Grade-6A Mulberry Silk, 30% Cashmere',
        Buttons: 'Genuine Trochus Mother-of-Pearl',
        Collar: 'Open Resort Camp Collar',
      },
      images: [
        'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1000&q=85',
      ],
      variants: [
        { sku: 'MB-APR-102-M-PEARL', title: 'Medium / Pearl Beige', size: 'M', color: 'Pearl Beige', colorHex: '#F3ECE3', stock: 12 },
        { sku: 'MB-APR-102-L-TEAL', title: 'Large / Muted Teal', size: 'L', color: 'Muted Teal', colorHex: '#567C8D', stock: 10 },
      ],
    },
    {
      title: 'Nordic Organic Alpaca & Merino Sofa Throw Blanket',
      slug: 'nordic-organic-alpaca-merino-sofa-throw',
      sku: 'MB-HOM-302',
      barcode: '8901122334406',
      shortDescription: 'Herringbone-weave throw blanket in undyed warm oatmeal Peruvian alpaca wool.',
      description:
        'Woven in small batches from undyed baby alpaca and extra-fine merino wool, this generously sized throw brings warmth and quiet texture to living spaces and reading sanctuaries.',
      regularPrice: 6400,
      salePrice: 5600,
      costPrice: 3200,
      categoryId: catHome.id,
      brandId: brandSera.id,
      stockQuantity: 3,
      lowStockThreshold: 5,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      ratingAverage: 4.9,
      ratingCount: 11,
      soldCount: 19,
      specifications: {
        Dimensions: '140cm × 200cm including twisted fringes',
        Material: '60% Peruvian Baby Alpaca, 40% Merino Wool',
        Certification: 'OEKO-TEX Standard 100 Certified',
      },
      images: [
        'https://images.unsplash.com/photo-1731404247714-f19f610b32d4?auto=format&fit=crop&w=1000&q=85',
      ],
      variants: [
        { sku: 'MB-HOM-302-OAT', title: 'Undyed Oatmeal', size: '140x200cm', color: 'Oatmeal', colorHex: '#E6DEC8', stock: 3 },
      ],
    },
    {
      title: 'Verona Hand-Stitched Weekender Duffle Bag',
      slug: 'verona-hand-stitched-weekender-duffle-bag',
      sku: 'MB-BAG-202',
      barcode: '8901122334407',
      shortDescription: 'Cabin-approved luxury travel holdall in pebbled cognac leather and heavy Belgian canvas.',
      description:
        'Built for effortless weekend escapes, the Verona Weekender combines water-repellent heavy linen canvas with full-grain leather trim, protective brass feet, and an ergonomic padded shoulder strap.',
      regularPrice: 18500,
      salePrice: 16200,
      costPrice: 9800,
      categoryId: catLeather.id,
      brandId: brandVelluto.id,
      stockQuantity: 11,
      lowStockThreshold: 4,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      ratingAverage: 4.94,
      ratingCount: 19,
      soldCount: 23,
      specifications: {
        Dimensions: '52cm × 28cm × 25cm (International Carry-On Size)',
        Capacity: '40 Liters',
        Materials: '18oz Waxed Belgian Linen Canvas & Full-Grain Calfskin',
      },
      images: [
        'https://images.unsplash.com/photo-1525103504173-8dc1582c7430?auto=format&fit=crop&w=1000&q=85',
      ],
      variants: [
        { sku: 'MB-BAG-202-CANV', title: 'Sand Canvas & Cognac Leather', size: '40L Cabin', color: 'Sand / Cognac', colorHex: '#C2A886', stock: 11 },
      ],
    },
    {
      title: 'Riviera Wide-Leg Pleated Linen Trousers',
      slug: 'riviera-wide-leg-pleated-linen-trousers',
      sku: 'MB-APR-103',
      barcode: '8901122334408',
      shortDescription: 'High-waisted double-pleated trousers with side adjusters in crisp ivory linen.',
      description:
        'Featuring sartorial side-tab adjusters, deep front pleats, and a fluid wide-leg silhouette, the Riviera Trousers pair effortlessly with our Siena Blazer or Como Resort Shirt.',
      regularPrice: 6200,
      salePrice: 5400,
      costPrice: 3100,
      categoryId: catApparel.id,
      brandId: brandAurelia.id,
      stockQuantity: 19,
      lowStockThreshold: 5,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: true,
      ratingAverage: 4.82,
      ratingCount: 12,
      soldCount: 31,
      specifications: {
        Fabric: '100% Heavyweight Irish Linen (240 GSM)',
        Waist: 'High-rise with brass side-tab adjusters',
        Hem: '4cm tailored turn-up cuff',
      },
      images: [
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1000&q=85',
      ],
      variants: [
        { sku: 'MB-APR-103-S-IVR', title: 'Small (30) / Warm Ivory', size: 'S', color: 'Warm Ivory', colorHex: '#F5F1EE', stock: 9 },
        { sku: 'MB-APR-103-M-IVR', title: 'Medium (32) / Warm Ivory', size: 'M', color: 'Warm Ivory', colorHex: '#F5F1EE', stock: 10 },
      ],
    },
  ];

  const createdProducts: Array<{
    id: string;
    title: string;
    sku: string;
    salePrice: number;
    costPrice: number;
    imageUrl: string;
    variantId: string;
    variantTitle: string;
  }> = [];

  for (const prod of productsData) {
    const p = await prisma.product.create({
      data: {
        title: prod.title,
        slug: prod.slug,
        sku: prod.sku,
        barcode: prod.barcode,
        shortDescription: prod.shortDescription,
        description: prod.description,
        regularPrice: prod.regularPrice,
        salePrice: prod.salePrice,
        costPrice: prod.costPrice,
        categoryId: prod.categoryId,
        brandId: prod.brandId,
        stockQuantity: prod.stockQuantity,
        lowStockThreshold: prod.lowStockThreshold,
        status: 'PUBLISHED',
        isFeatured: prod.isFeatured,
        isBestSeller: prod.isBestSeller,
        isNewArrival: prod.isNewArrival,
        ratingAverage: prod.ratingAverage,
        ratingCount: prod.ratingCount,
        soldCount: prod.soldCount,
        specifications: prod.specifications,
        images: {
          create: prod.images.map((url, idx) => ({
            url,
            altText: prod.title,
            isPrimary: idx === 0,
            sortOrder: idx,
          })),
        },
        inventory: {
          create: {
            availableStock: prod.stockQuantity,
            reservedStock: 0,
            lowStockThreshold: prod.lowStockThreshold,
            warehouseLocation: 'Main Archive - Dhaka',
          },
        },
      },
    });

    let firstVariantId = '';
    let firstVariantTitle = '';
    for (const v of prod.variants) {
      const createdVar = await prisma.productVariant.create({
        data: {
          productId: p.id,
          sku: v.sku,
          title: v.title,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          regularPrice: prod.regularPrice,
          salePrice: prod.salePrice,
          costPrice: prod.costPrice,
          stockQuantity: v.stock,
          lowStockThreshold: 3,
        },
      });
      if (!firstVariantId) {
        firstVariantId = createdVar.id;
        firstVariantTitle = createdVar.title;
      }
    }

    await prisma.inventoryTransaction.create({
      data: {
        productId: p.id,
        type: 'STOCK_IN',
        quantity: prod.stockQuantity,
        previousStock: 0,
        newStock: prod.stockQuantity,
        reason: 'Initial Seasonal Atelier Stock Allocation',
        referenceId: 'INIT-BATCH-2026',
        performedById: superAdmin.id,
      },
    });

    await prisma.review.create({
      data: {
        productId: p.id,
        userId: customer1.id,
        customerName: 'Samira Chowdhury',
        rating: 5,
        title: 'Exquisite craftsmanship and material quality',
        comment:
          'The texture, stitching, and packaging feel genuinely world-class. The warm beige aesthetic matches our wardrobe effortlessly.',
        isVerifiedPurchase: true,
        isApproved: true,
      },
    });

    createdProducts.push({
      id: p.id,
      title: p.title,
      sku: p.sku,
      salePrice: prod.salePrice,
      costPrice: prod.costPrice,
      imageUrl: prod.images[0],
      variantId: firstVariantId,
      variantTitle: firstVariantTitle,
    });
  }

  // 8. Create Coupons
  await prisma.coupon.createMany({
    data: [
      {
        code: 'LUXURY10',
        description: '10% privilege discount on orders above ৳2,500',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderAmount: 2500,
        maxDiscountAmount: 2500,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        usageLimit: 500,
        perCustomerLimit: 3,
        usedCount: 14,
        isActive: true,
      },
      {
        code: 'WELCOME500',
        description: 'Flat ৳500 off on purchases of ৳4,000 or more',
        discountType: 'FIXED',
        discountValue: 500,
        minOrderAmount: 4000,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        usageLimit: 200,
        perCustomerLimit: 1,
        usedCount: 9,
        isActive: true,
      },
      {
        code: 'ATELIER15',
        description: '15% VIP seasonal discount on orders above ৳12,000',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        minOrderAmount: 12000,
        maxDiscountAmount: 4000,
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        perCustomerLimit: 2,
        usedCount: 4,
        isActive: true,
      },
    ],
  });

  // 9. Create Sample Orders with Full History, Assignments, Payments & Shipments
  const now = Date.now();
  const sampleOrders = [
    {
      orderNumber: 'MB-261109-1041',
      customerId: customer1.id,
      customerName: 'Samira Chowdhury',
      customerPhone: '+8801819223344',
      customerEmail: 'customer@maisonbeige.com',
      shippingAddressLine: 'Apt 5B, House 18, Road 27, Banani',
      shippingArea: 'Banani',
      shippingCity: 'Dhaka',
      shippingPostalCode: '1213',
      shippingZone: 'INSIDE_CITY',
      status: 'DELIVERED' as const,
      paymentMethod: 'COD' as const,
      paymentStatus: 'VERIFIED' as const,
      discountAmount: 845,
      shippingCharge: 0,
      couponCode: 'LUXURY10',
      daysAgo: 4,
      items: [createdProducts[0], createdProducts[2]],
      internalNotes: 'Delivered on time by Kamrul. Cash collected and verified.',
      customerNotes: 'Please call before arriving at the gate.',
      courier: 'INTERNAL_DELIVERY' as const,
      trackingNumber: 'MB-TRK-900101',
    },
    {
      orderNumber: 'MB-261110-1042',
      customerId: customer2.id,
      customerName: 'Rafiq Ahmed',
      customerPhone: '+8801911556677',
      customerEmail: 'rafiq.ahmed@example.com',
      shippingAddressLine: 'Level 4, Peninsula Tower, Khulshi',
      shippingArea: 'Khulshi',
      shippingCity: 'Chattogram',
      shippingPostalCode: '4225',
      shippingZone: 'OUTSIDE_CITY',
      status: 'SHIPPED' as const,
      paymentMethod: 'BKASH_MANUAL' as const,
      paymentStatus: 'VERIFIED' as const,
      discountAmount: 500,
      shippingCharge: 150,
      couponCode: 'WELCOME500',
      daysAgo: 2,
      items: [createdProducts[1]],
      internalNotes: 'bKash TrxID BKA9928374 verified. Dispatched via Steadfast Courier.',
      customerNotes: 'Deliver during office hours (10 AM - 6 PM).',
      courier: 'STEADFAST' as const,
      trackingNumber: 'SF-BD-8827341',
    },
    {
      orderNumber: 'MB-261111-1043',
      customerId: customer1.id,
      customerName: 'Samira Chowdhury',
      customerPhone: '+8801819223344',
      customerEmail: 'customer@maisonbeige.com',
      shippingAddressLine: 'Apt 5B, House 18, Road 27, Banani',
      shippingArea: 'Banani',
      shippingCity: 'Dhaka',
      shippingPostalCode: '1213',
      shippingZone: 'INSIDE_CITY',
      status: 'PROCESSING' as const,
      paymentMethod: 'COD' as const,
      paymentStatus: 'PENDING' as const,
      discountAmount: 0,
      shippingCharge: 0,
      couponCode: null,
      daysAgo: 1,
      items: [createdProducts[3]],
      internalNotes: 'Confirmed by Moderator Tanvir. Assigned to Farhana for luxury gift wrapping.',
      customerNotes: 'Complimentary gift note: Happy Anniversary.',
      courier: 'INTERNAL_DELIVERY' as const,
      trackingNumber: 'MB-TRK-900103',
    },
    {
      orderNumber: 'MB-261111-1044',
      customerId: null,
      customerName: 'Zayan Mahmud',
      customerPhone: '+8801755889900',
      customerEmail: 'zayan.m@example.com',
      shippingAddressLine: 'House 12, Road 90, Gulshan 2',
      shippingArea: 'Gulshan',
      shippingCity: 'Dhaka',
      shippingPostalCode: '1212',
      shippingZone: 'INSIDE_CITY',
      status: 'PENDING' as const,
      paymentMethod: 'COD' as const,
      paymentStatus: 'PENDING' as const,
      discountAmount: 0,
      shippingCharge: 80,
      couponCode: null,
      daysAgo: 0,
      items: [createdProducts[4], createdProducts[7]],
      internalNotes: 'Assigned to Moderator Tanvir for phone confirmation.',
      customerNotes: 'Call before dispatch.',
      courier: 'INTERNAL_DELIVERY' as const,
      trackingNumber: 'MB-TRK-900104',
    },
    {
      orderNumber: 'MB-261108-1040',
      customerId: customer2.id,
      customerName: 'Rafiq Ahmed',
      customerPhone: '+8801911556677',
      customerEmail: 'rafiq.ahmed@example.com',
      shippingAddressLine: 'Level 4, Peninsula Tower, Khulshi',
      shippingArea: 'Khulshi',
      shippingCity: 'Chattogram',
      shippingPostalCode: '4225',
      shippingZone: 'OUTSIDE_CITY',
      status: 'DELIVERED' as const,
      paymentMethod: 'BANK_TRANSFER' as const,
      paymentStatus: 'VERIFIED' as const,
      discountAmount: 0,
      shippingCharge: 0,
      couponCode: null,
      daysAgo: 6,
      items: [createdProducts[6]],
      internalNotes: 'City Bank transfer verified. Delivered cleanly.',
      customerNotes: '',
      courier: 'PATHAO' as const,
      trackingNumber: 'PTH-9920182',
    },
  ];

  for (const so of sampleOrders) {
    const subtotal = so.items.reduce((acc, item) => acc + item.salePrice, 0);
    const grandTotal = subtotal - so.discountAmount + so.shippingCharge;
    const createdAt = new Date(now - so.daysAgo * 24 * 60 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        orderNumber: so.orderNumber,
        customerId: so.customerId,
        customerName: so.customerName,
        customerPhone: so.customerPhone,
        customerEmail: so.customerEmail,
        shippingAddressLine: so.shippingAddressLine,
        shippingArea: so.shippingArea,
        shippingCity: so.shippingCity,
        shippingPostalCode: so.shippingPostalCode,
        shippingZone: so.shippingZone,
        subtotal,
        discountAmount: so.discountAmount,
        shippingCharge: so.shippingCharge,
        taxAmount: 0,
        grandTotal,
        couponCode: so.couponCode,
        paymentMethod: so.paymentMethod,
        paymentStatus: so.paymentStatus,
        status: so.status,
        stockDeducted: so.status !== 'PENDING',
        internalNotes: so.internalNotes,
        customerNotes: so.customerNotes,
        confirmedById: so.status !== 'PENDING' ? moderatorUser.id : null,
        confirmedAt: so.status !== 'PENDING' ? createdAt : null,
        deliveredAt: so.status === 'DELIVERED' ? new Date(createdAt.getTime() + 36 * 3600 * 1000) : null,
        createdAt,
        items: {
          create: so.items.map((it) => ({
            productId: it.id,
            variantId: it.variantId,
            productName: it.title,
            variantName: it.variantTitle,
            sku: it.sku,
            imageUrl: it.imageUrl,
            quantity: 1,
            unitPrice: it.salePrice,
            costPrice: it.costPrice,
            discount: 0,
            totalPrice: it.salePrice,
          })),
        },
        statusHistory: {
          create: [
            {
              status: 'PENDING',
              note: 'Order placed via Maison Beige Storefront',
              changedByName: so.customerName,
              createdAt,
            },
            ...(so.status !== 'PENDING'
              ? [
                  {
                    status: so.status,
                    previousStatus: 'PENDING' as const,
                    note: `Order moved to ${so.status}`,
                    changedById: moderatorUser.id,
                    changedByName: moderatorUser.name,
                    createdAt: new Date(createdAt.getTime() + 2 * 3600 * 1000),
                  },
                ]
              : []),
          ],
        },
        assignments: {
          create: [
            {
              staffId: moderatorUser.id,
              roleType: 'MODERATOR',
              assignedById: managerUser.id,
              status: so.status === 'PENDING' ? 'ASSIGNED' : 'COMPLETED',
              notes: 'Verify customer address and confirm order.',
            },
            {
              staffId: processorUser.id,
              roleType: 'ORDER_PROCESSING',
              assignedById: managerUser.id,
              status: ['DELIVERED', 'SHIPPED'].includes(so.status) ? 'COMPLETED' : 'ASSIGNED',
              notes: 'Quality check and luxury packaging.',
            },
            {
              staffId: deliveryUser.id,
              roleType: 'DELIVERY_STAFF',
              assignedById: managerUser.id,
              status: so.status === 'DELIVERED' ? 'COMPLETED' : 'ASSIGNED',
              notes: 'Handle with care and collect COD if applicable.',
            },
          ],
        },
        payments: {
          create: {
            paymentMethod: so.paymentMethod,
            status: so.paymentStatus,
            amount: grandTotal,
            transactionRef:
              so.paymentMethod === 'BKASH_MANUAL'
                ? 'BKA9928374'
                : so.paymentMethod === 'BANK_TRANSFER'
                ? 'CITY-TRX-77412'
                : `COD-${so.orderNumber}`,
            verifiedById: so.paymentStatus === 'VERIFIED' ? superAdmin.id : null,
            verifiedAt: so.paymentStatus === 'VERIFIED' ? new Date() : null,
            collectedCashAmount:
              so.status === 'DELIVERED' && so.paymentMethod === 'COD' ? grandTotal : 0,
            collectedById:
              so.status === 'DELIVERED' && so.paymentMethod === 'COD' ? deliveryUser.id : null,
          },
        },
        shipment: {
          create: {
            shippingMethodId:
              so.shippingZone === 'INSIDE_CITY' ? insideCityShipping.id : outsideCityShipping.id,
            courierProvider: so.courier,
            trackingNumber: so.trackingNumber,
            deliveryStaffId: deliveryUser.id,
            status:
              so.status === 'DELIVERED'
                ? 'DELIVERED'
                : so.status === 'SHIPPED'
                ? 'IN_TRANSIT'
                : 'PENDING_PICKUP',
            deliveryCharge: so.shippingCharge,
            codAmount: so.paymentMethod === 'COD' ? grandTotal : 0,
            collectedCash:
              so.status === 'DELIVERED' && so.paymentMethod === 'COD' ? grandTotal : 0,
            deliveryAddress: `${so.shippingAddressLine}, ${so.shippingCity}`,
            recipientName: so.customerName,
            recipientPhone: so.customerPhone,
            deliveredAt: so.status === 'DELIVERED' ? new Date() : null,
          },
        },
      },
    });

    await prisma.staffActivityLog.create({
      data: {
        userId: moderatorUser.id,
        staffName: moderatorUser.name,
        roleName: 'Moderator',
        action: 'ORDER_REVIEWED',
        module: 'Orders',
        targetId: order.orderNumber,
        description: `Processed order ${order.orderNumber} (${so.status}) for ${so.customerName}`,
      },
    });
  }

  console.log('MAISON BEIGE database seeded successfully.');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
