import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStore } from './key-value';

/**
 * Native storage, backed by AsyncStorage.
 *
 * The web build never loads this file — Metro resolves `key-value-store.web.ts`
 * instead.
 */
export const keyValueStore: KeyValueStore = {
  async read(key) {
    return AsyncStorage.getItem(key);
  },

  async write(key, value) {
    await AsyncStorage.setItem(key, value);
  },

  async remove(key) {
    await AsyncStorage.removeItem(key);
  },

  async keys(prefix) {
    const all = await AsyncStorage.getAllKeys();
    return all.filter((key) => key.startsWith(prefix));
  },
};
