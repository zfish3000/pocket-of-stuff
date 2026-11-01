import { CONFIG } from './config.js';
import { packSessionForStorage } from './storage.js';

const PENDING_KEY = 'latency-path-study-pending-uploads';
const RETRY_DELAYS_MS = [2000, 5000];

// Everything the receiving script needs: the full session (motion data packed by column to save space)
// plus a flag that says whether it counts as study data.
export function buildUploadPayload(session, study) {
  const official = session.mode === 'participant' && session.interfaceVersion === study.interfaceVersion;
  return {
    kind: 'session',
    schemaVersion: CONFIG.schemaVersion,
    configVersion: session.configVersion,
    sessionId: session.sessionId,
    participantId: session.participantId,
    official,
    uploadedAt: new Date().toISOString(),
    session: packSessionForStorage(session),
  };
}

export function buildTestPayload() {
  return {
    kind: 'test',
    schemaVersion: CONFIG.schemaVersion,
    configVersion: CONFIG.configVersion,
    sentAt: new Date().toISOString(),
    userAgent: globalThis.navigator?.userAgent ?? '',
  };
}

// Sends one payload. A text/plain body avoids a browser preflight request, which Apps Script cannot answer.
export async function postPayload(url, payload, { fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
  const result = await response.json();
  if (!result?.ok) throw new Error(result?.error ?? 'The receiving script rejected the upload.');
  return result;
}

export async function postWithRetries(url, payload, { fetchImpl, wait = delay, retryDelaysMs = RETRY_DELAYS_MS } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      return await postPayload(url, payload, { fetchImpl });
    } catch (error) {
      lastError = error;
      if (attempt < retryDelaysMs.length) await wait(retryDelaysMs[attempt]);
    }
  }
  throw lastError;
}

// Uploads wait in browser storage until the receiving script confirms them, so a closed tab or a lost
// connection does not lose data. Pending uploads are retried the next time the site opens.
export class UploadQueue {
  constructor({ storage = globalThis.localStorage, fetchImpl = globalThis.fetch?.bind(globalThis), wait = delay } = {}) {
    this.storage = storage;
    this.fetchImpl = fetchImpl;
    this.wait = wait;
  }

  list() {
    try {
      return JSON.parse(this.storage.getItem(PENDING_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  get(sessionId) {
    try {
      const text = this.storage.getItem(`${PENDING_KEY}:${sessionId}`);
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  // Returns false if the browser has no room; the caller should then offer a download.
  add(payload) {
    try {
      this.storage.setItem(`${PENDING_KEY}:${payload.sessionId}`, JSON.stringify(payload));
      const ids = this.list().filter((id) => id !== payload.sessionId);
      this.storage.setItem(PENDING_KEY, JSON.stringify([...ids, payload.sessionId]));
      return true;
    } catch {
      return false;
    }
  }

  remove(sessionId) {
    try {
      this.storage.removeItem(`${PENDING_KEY}:${sessionId}`);
      this.storage.setItem(PENDING_KEY, JSON.stringify(this.list().filter((id) => id !== sessionId)));
    } catch {
      // Nothing else to clean up.
    }
  }

  async send(url, payload, options = {}) {
    const result = await postWithRetries(url, payload, { fetchImpl: this.fetchImpl, wait: this.wait, ...options });
    this.remove(payload.sessionId);
    return result;
  }

  // Tries every pending upload once. Returns the session IDs that were confirmed.
  async retryAll(url) {
    const sent = [];
    for (const sessionId of this.list()) {
      const payload = this.get(sessionId);
      if (!payload) {
        this.remove(sessionId);
        continue;
      }
      try {
        await this.send(url, payload, { retryDelaysMs: [] });
        sent.push(sessionId);
      } catch {
        // Leave it pending for the next attempt.
      }
    }
    return sent;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
