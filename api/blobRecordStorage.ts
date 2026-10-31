import type { Store } from '@netlify/blobs';
import { Collection, CollectionTypes, RecordStorage, recordKey } from './dbHandler.ts';

/**
 * Netlify Blobs storage: ONE BLOB PER RECORD (e.g. "games/<gameId>").
 * Devices never write the same key, so many simultaneous saves can't overwrite each other
 * (no read-modify-write of a shared file).
 *
 * Reading a collection = one list() + a cached snapshot ("_snapshot/<collection>") that remembers
 * each record with its etag, so only new/changed records are downloaded. The snapshot is only a
 * cache: it is always validated against list(), so a stale snapshot can never hide or revive data.
 */
type Snapshot = Record<string, { etag: string; rec: unknown }>;

const PARALLEL = 20;

async function inChunks<T>(items: T[], fn: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += PARALLEL) {
    await Promise.all(items.slice(i, i + PARALLEL).map(fn));
  }
}

// FNV-1a hash, keeps sanitized keys unique
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Blob keys are URL-encoded by the SDK and listed back encoded, so only use URL-safe characters.
// The full record lives inside the blob; the key only has to be unique and stable.
const blobKey = (c: Collection, key: string) => `${c}/${key.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120)}-${hash(key)}`;

export function createBlobRecordStorage(store: Store): RecordStorage {
  return {
    async list<C extends Collection>(c: C): Promise<CollectionTypes[C][]> {
      const [{ blobs }, snapshot] = await Promise.all([
        store.list({ prefix: `${c}/` }),
        store.get(`_snapshot/${c}`, { type: 'json' }) as Promise<Snapshot | null>
      ]);
      const snap = snapshot || {};
      const next: Snapshot = {};
      const missing: { key: string; etag: string }[] = [];

      for (const b of blobs) {
        // Our keys never start with "." (local emulators can list temporary ".xyz" files)
        if (b.key.slice(c.length + 1).startsWith('.')) continue;
        const cached = snap[b.key];
        if (cached && cached.etag === b.etag) next[b.key] = cached;
        else missing.push(b);
      }

      await inChunks(missing, async (b) => {
        const rec = await store.get(b.key, { type: 'json', consistency: 'strong' });
        if (rec) next[b.key] = { etag: b.etag, rec };
      });

      const changed = missing.length > 0 || Object.keys(snap).length !== Object.keys(next).length;
      if (changed) {
        // Best effort: concurrent snapshot writes are harmless because entries are re-validated
        await store.setJSON(`_snapshot/${c}`, next).catch(() => {});
      }
      return Object.values(next).map((e) => e.rec as CollectionTypes[C]);
    },

    async put(c, records, mode) {
      const keyOf = recordKey[c] as (r: unknown) => string;
      await inChunks(records, async (r) => {
        const k = blobKey(c, keyOf(r));
        // 'insert' keeps the first copy (e.g. both players' devices send the same match rows)
        if (mode === 'insert') await store.setJSON(k, r, { onlyIfNew: true });
        else await store.setJSON(k, r);
      });
    },

    async remove(c, keys) {
      await inChunks(keys, (k) => store.delete(blobKey(c, k)));
    }
  };
}
