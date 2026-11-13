/**
 * In-memory cache with AsyncStorage persistence.
 * Hydrate via `hydratePlatformStorage()` before importing mock repositories.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const memory = new Map<string, string>();

export async function hydratePlatformStorage(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length === 0) return;
  const pairs = await AsyncStorage.multiGet(keys);
  for (const [key, value] of pairs) {
    if (key && value != null) memory.set(key, value);
  }
}

export const platformStorage = {
  getItem(key: string): string | null {
    return memory.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    memory.set(key, value);
    void AsyncStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    memory.delete(key);
    void AsyncStorage.removeItem(key);
  },
};
