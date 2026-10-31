import fs from 'fs';
import path from 'path';
import {
  DB_FILES,
  avatarsFromCSV,
  avatarsToCSV,
  gamesFromCSV,
  gamesToCSV,
  multiFromCSV,
  multiToCSV
} from '../src/game/database.ts';
import { Collection, CollectionTypes, RecordStorage, recordKey } from './dbHandler.ts';

/**
 * Local database: real CSV files (data/avatars.csv, data/games.csv, data/multiplayer.csv).
 * Uses synchronous fs calls, so each read-modify-write runs in a single event-loop tick and
 * simultaneous requests can never overwrite each other.
 */
export function createCsvFileStorage(dir: string): RecordStorage {
  const codecs: { [C in Collection]: { file: string; parse: (t: string) => CollectionTypes[C][]; serialize: (r: CollectionTypes[C][]) => string } } = {
    avatars: { file: DB_FILES.avatars, parse: avatarsFromCSV, serialize: avatarsToCSV },
    games: { file: DB_FILES.games, parse: gamesFromCSV, serialize: gamesToCSV },
    multi: { file: DB_FILES.multi, parse: multiFromCSV, serialize: multiToCSV }
  };

  const readSync = <C extends Collection>(c: C): CollectionTypes[C][] => {
    const p = path.join(dir, codecs[c].file);
    return fs.existsSync(p) ? codecs[c].parse(fs.readFileSync(p, 'utf8')) : [];
  };

  const writeSync = <C extends Collection>(c: C, rows: CollectionTypes[C][]) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, codecs[c].file), codecs[c].serialize(rows), 'utf8');
  };

  const keyOf = <C extends Collection>(c: C, r: CollectionTypes[C]) => (recordKey[c] as (r: CollectionTypes[C]) => string)(r);

  return {
    async list(c) {
      return readSync(c);
    },
    async put(c, records, mode) {
      const map = new Map(readSync(c).map((r) => [keyOf(c, r), r]));
      for (const r of records) {
        const k = keyOf(c, r);
        if (mode === 'upsert' || !map.has(k)) map.set(k, r);
      }
      writeSync(c, Array.from(map.values()));
    },
    async remove(c, keys) {
      if (!keys.length) return;
      const drop = new Set(keys);
      writeSync(c, readSync(c).filter((r) => !drop.has(keyOf(c, r))));
    }
  };
}
