import { PGlite } from '@electric-sql/pglite';
import { PrismaPGlite } from 'pglite-prisma-adapter';

function unwrap<T>(res: { ok: boolean; value?: T; error?: unknown }): T {
  if (!res.ok) {
    const errObj = res.error as Record<string, unknown> | undefined;
    const msg =
      typeof errObj?.message === 'string'
        ? errObj.message
        : JSON.stringify(res.error);
    const error = new Error(msg) as Error & Record<string, unknown>;
    if (errObj) {
      Object.assign(error, errObj);
    }
    throw error;
  }
  return res.value as T;
}

export function createPrismaPGliteAdapter(pg: PGlite) {
  const legacy = new PrismaPGlite(pg);

  const adapter = {
    provider: 'postgres' as const,
    adapterName: 'pglite-prisma6-adapter',

    async queryRaw(params: { sql: string; args: unknown[]; argTypes?: unknown[] }) {
      const res = await legacy.queryRaw(params as never);
      return unwrap(res as never);
    },

    async executeRaw(params: { sql: string; args: unknown[]; argTypes?: unknown[] }) {
      const res = await legacy.executeRaw(params as never);
      return unwrap(res as never);
    },

    async executeScript(script: string) {
      await pg.exec(script);
    },

    getConnectionInfo() {
      return {
        schemaName: 'public',
        supportsRelationJoins: true,
      };
    },

    async startTransaction() {
      const txRes = await legacy.startTransaction();
      const legacyTx = unwrap(txRes as never) as {
        options: { usePhantomQuery: boolean };
        queryRaw: (q: unknown) => Promise<{ ok: boolean; value?: unknown; error?: unknown }>;
        executeRaw: (q: unknown) => Promise<{ ok: boolean; value?: number; error?: unknown }>;
        commit: () => Promise<{ ok: boolean; value?: void; error?: unknown }>;
        rollback: () => Promise<{ ok: boolean; value?: void; error?: unknown }>;
      };

      return {
        provider: 'postgres' as const,
        adapterName: 'pglite-prisma6-adapter',
        options: legacyTx.options ?? { usePhantomQuery: false },
        async queryRaw(params: { sql: string; args: unknown[] }) {
          return unwrap(await legacyTx.queryRaw(params));
        },
        async executeRaw(params: { sql: string; args: unknown[] }) {
          return unwrap(await legacyTx.executeRaw(params));
        },
        async commit() {
          unwrap(await legacyTx.commit());
        },
        async rollback() {
          unwrap(await legacyTx.rollback());
        },
      };
    },

    async dispose() {
      // Keep embedded PGlite instance alive across requests
    },
  };

  return {
    provider: 'postgres' as const,
    adapterName: 'pglite-prisma6-adapter',
    async connect() {
      return adapter;
    },
  };
}
