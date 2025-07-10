// src/storage.js
export default class NXStorage {
  static async get(key) {
    // Ensure key is a string or an array of strings
    const result = await chrome.storage.sync.get(key);
    if (result && Object.prototype.hasOwnProperty.call(result, key) && typeof key === 'string') {
      return result[key];
    }
    // Fallback to local if sync didn't have it or if key was an object/array for multiple gets
    const localResult = await chrome.storage.local.get(key);
    return (typeof key === 'string') ? localResult[key] : {...result, ...localResult};
  }

  static async set(key, value) {
    try {
      await chrome.storage.sync.set({ [key]: value });
    } catch (error) {
      if (error && error.message &&
          (error.message.includes('QUOTA_BYTES_PER_ITEM') || error.message.includes('QUOTA_BYTES'))) {
        // If sync quota is exceeded, try to store in local storage
        console.warn(`NXStorage: Sync quota exceeded for key "${key}". Falling back to local storage.`);
        await chrome.storage.local.set({ [key]: value });
      } else {
        console.error('NXStorage: Failed to set value', error);
        throw error;
      }
    }
  }

  static async getMultiple(keys) {
    // keys should be an array of strings or an object
    const syncResult = await chrome.storage.sync.get(keys);
    const localResult = await chrome.storage.local.get(keys);
    // Merge, giving syncResult precedence for any common keys
    return { ...localResult, ...syncResult };
  }

  static async remove(keyOrKeys) {
    // keyOrKeys can be a single key (string) or an array of keys
    await chrome.storage.sync.remove(keyOrKeys);
    await chrome.storage.local.remove(keyOrKeys); // Attempt to remove from local as well
    console.log(`NXStorage: Removed key(s):`, keyOrKeys);
  }

  static async clearAll() {
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    console.log('NXStorage: All sync and local storage cleared.');
  }

  // Listener for storage changes
  static onChanged(callback) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      callback(changes, areaName);
    });
  }
}
