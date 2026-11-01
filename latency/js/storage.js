import { CONFIG } from './config.js';

export function createBrowserStorageAdapter(storage = globalThis.localStorage) {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
  };
}

export function createMemoryStorageAdapter() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

export function saveSession(session, adapter = createBrowserStorageAdapter()) {
  adapter.setItem(CONFIG.storageKey, JSON.stringify(packSessionForStorage(session)));
}

export function loadSession(adapter = createBrowserStorageAdapter()) {
  const text = adapter.getItem(CONFIG.storageKey);
  return text ? unpackStoredSession(JSON.parse(text)) : null;
}

export function clearSession(adapter = createBrowserStorageAdapter()) {
  adapter.removeItem(CONFIG.storageKey);
}

export function packSessionForStorage(session) {
  if (!Array.isArray(session.motionData)) {
    return session;
  }
  const { motionData, ...metadata } = session;
  const columns = [...new Set(motionData.flatMap((row) => Object.keys(row)))];
  return {
    ...metadata,
    motionDataEncoding: 'columns-v1',
    motionDataColumns: columns,
    motionDataRows: motionData.map((row) => columns.map((column) => row[column] ?? null)),
  };
}

function unpackStoredSession(stored) {
  if (stored.motionDataEncoding !== 'columns-v1') {
    return stored;
  }
  const {
    motionDataEncoding: _encoding,
    motionDataColumns: columns,
    motionDataRows: rows,
    ...metadata
  } = stored;
  return {
    ...metadata,
    motionData: rows.map((values) => Object.fromEntries(columns.map((column, index) => [column, values[index]]))),
  };
}
