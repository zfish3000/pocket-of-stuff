const COMPLETED_KEY = 'latency-path-study-completed';
const SHARED_COMPUTER_KEY = 'latency-path-study-shared-computer';

// Problems that stop a participant from taking part on this computer. Each has a plain-language message.
export function findBlockingProblems(env = globalThis) {
  const problems = [];
  const finePointer = env.matchMedia?.('(pointer: fine)')?.matches ?? true;
  if (!finePointer) {
    problems.push('This study needs a computer with a mouse or trackpad. Phones and tablets cannot be used.');
  }
  const hasPointerLock = Boolean(env.Element?.prototype && 'requestPointerLock' in env.Element.prototype);
  if (!hasPointerLock) {
    problems.push('This browser cannot hide and lock the mouse pointer. Please use a recent version of Chrome, Edge, or Firefox.');
  }
  const width = env.screen?.width ?? 0;
  const height = env.screen?.height ?? 0;
  if (width < 1024 || height < 600) {
    problems.push('The screen is too small. Please use a screen at least 1024 by 600 pixels.');
  }
  return problems;
}

// Remembers the last session finished in this browser and how many have finished in total. When a browser
// was used before, the next person confirms they have not taken part, and the count goes into the data.
export function readCompletedRecord(storage = globalThis.localStorage) {
  try {
    const record = JSON.parse(storage.getItem(COMPLETED_KEY) ?? 'null');
    return record ? { ...record, count: record.count ?? 1 } : null;
  } catch {
    return null;
  }
}

export function writeCompletedRecord(record, storage = globalThis.localStorage) {
  try {
    const count = (readCompletedRecord(storage)?.count ?? 0) + 1;
    storage.setItem(COMPLETED_KEY, JSON.stringify({ ...record, count }));
  } catch {
    // The record is a convenience; the session data is unaffected.
  }
}

export function clearCompletedRecord(storage = globalThis.localStorage) {
  try {
    storage.removeItem(COMPLETED_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function isSharedComputer(storage = globalThis.localStorage) {
  try {
    return storage.getItem(SHARED_COMPUTER_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSharedComputer(shared, storage = globalThis.localStorage) {
  try {
    if (shared) storage.setItem(SHARED_COMPUTER_KEY, 'true');
    else storage.removeItem(SHARED_COMPUTER_KEY);
  } catch {
    // Storage is blocked; the computer is treated as personal.
  }
}
