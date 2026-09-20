/**
 * The storage layer.
 *
 * One module with load/save, so the rest of the app never touches
 * localStorage directly. When sync arrives later, only this file changes.
 *
 * Every call is guarded: in a private window, or with site data blocked,
 * localStorage throws rather than returning null.
 */

const PREFIX = 'rootless:';

export function load(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // nothing to do
  }
}

/**
 * Asks the browser to keep this data. iOS clears storage for sites that go
 * unused for about a week, unless the app is installed and storage is
 * persisted. Phase 4 calls this at first start.
 */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
