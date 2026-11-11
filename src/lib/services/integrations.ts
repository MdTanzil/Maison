/**
 * Integration-Ready Payment Gateway & Courier Service Layer
 * Strictly enforces server-side verification and environment variable checks.
 */

export interface GatewayStatus {
  code: string;
  name: string;
  type: 'PAYMENT' | 'COURIER';
  isConfigured: boolean;
  mode: 'LIVE' | 'SANDBOX' | 'MANUAL_VERIFICATION_READY';
  requiredEnvVars: string[];
  description: string;
}

export function getIntegrationsStatus(): GatewayStatus[] {
  return [
    {
      code: 'SSLCOMMERZ',
      name: 'SSLCommerz Payment Gateway',
      type: 'PAYMENT',
      isConfigured: Boolean(
        process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD
      ),
      mode:
        process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_IS_LIVE === 'true'
          ? 'LIVE'
          : process.env.SSLCOMMERZ_STORE_ID
          ? 'SANDBOX'
          : 'MANUAL_VERIFICATION_READY',
      requiredEnvVars: ['SSLCOMMERZ_STORE_ID', 'SSLCOMMERZ_STORE_PASSWORD', 'SSLCOMMERZ_IS_LIVE'],
      description: 'Cards, Mobile Banking & Net Banking across Bangladesh with IPN validation.',
    },
    {
      code: 'BKASH',
      name: 'bKash Tokenized Checkout',
      type: 'PAYMENT',
      isConfigured: Boolean(process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET),
      mode: process.env.BKASH_APP_KEY ? 'SANDBOX' : 'MANUAL_VERIFICATION_READY',
      requiredEnvVars: ['BKASH_APP_KEY', 'BKASH_APP_SECRET', 'BKASH_USERNAME', 'BKASH_PASSWORD'],
      description: 'Supports both Manual Merchant TrxID verification and Tokenized API checkout.',
    },
    {
      code: 'NAGAD',
      name: 'Nagad Merchant Gateway',
      type: 'PAYMENT',
      isConfigured: Boolean(
        process.env.NAGAD_MERCHANT_ID && process.env.NAGAD_MERCHANT_PRIVATE_KEY
      ),
      mode: process.env.NAGAD_MERCHANT_ID ? 'SANDBOX' : 'MANUAL_VERIFICATION_READY',
      requiredEnvVars: ['NAGAD_MERCHANT_ID', 'NAGAD_MERCHANT_PRIVATE_KEY', 'NAGAD_PG_PUBLIC_KEY'],
      description: 'Supports Manual TrxID verification and asymmetric RSA-signed API checkout.',
    },
    {
      code: 'STRIPE',
      name: 'Stripe International Payments',
      type: 'PAYMENT',
      isConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live')
        ? 'LIVE'
        : process.env.STRIPE_SECRET_KEY
        ? 'SANDBOX'
        : 'MANUAL_VERIFICATION_READY',
      requiredEnvVars: [
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      ],
      description: 'International Visa, Mastercard, Amex & Apple Pay with webhook signature checks.',
    },
    {
      code: 'STEADFAST',
      name: 'Steadfast Courier API',
      type: 'COURIER',
      isConfigured: Boolean(process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY),
      mode: process.env.STEADFAST_API_KEY ? 'LIVE' : 'MANUAL_VERIFICATION_READY',
      requiredEnvVars: ['STEADFAST_API_KEY', 'STEADFAST_SECRET_KEY', 'STEADFAST_BASE_URL'],
      description: 'Automated parcel booking, consignment ID generation, and COD status sync.',
    },
    {
      code: 'PATHAO',
      name: 'Pathao Courier Hermes API',
      type: 'COURIER',
      isConfigured: Boolean(process.env.PATHAO_CLIENT_ID && process.env.PATHAO_CLIENT_SECRET),
      mode: process.env.PATHAO_CLIENT_ID ? 'LIVE' : 'MANUAL_VERIFICATION_READY',
      requiredEnvVars: [
        'PATHAO_CLIENT_ID',
        'PATHAO_CLIENT_SECRET',
        'PATHAO_USERNAME',
        'PATHAO_PASSWORD',
      ],
      description: 'City & nationwide express delivery with OAuth2 token exchange.',
    },
    {
      code: 'REDX',
      name: 'RedX Logistics OpenAPI',
      type: 'COURIER',
      isConfigured: Boolean(process.env.REDX_ACCESS_TOKEN),
      mode: process.env.REDX_ACCESS_TOKEN ? 'LIVE' : 'MANUAL_VERIFICATION_READY',
      requiredEnvVars: ['REDX_ACCESS_TOKEN', 'REDX_BASE_URL'],
      description: 'Nationwide parcel dispatch, area lookup, and webhook tracking updates.',
    },
  ];
}
