import { Injectable } from '@angular/core';

interface CacheEntry<T> {
  value: T;
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  /** Reads a value saved with {@link set}; returns null if missing, unreadable or storage is blocked. */
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as CacheEntry<T>).value : null;
    } catch {
      this.remove(key);
      return null;
    }
  }

  /** Persists a JSON-serialisable value to localStorage, ignoring quota or private-mode failures. */
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify({ value } satisfies CacheEntry<T>));
    } catch {
      // Storage can be full or disabled; persisting is a convenience, not a requirement.
    }
  }

  /** Deletes a stored value. */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // See set().
    }
  }
}
