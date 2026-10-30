import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface AlgorithmDB extends DBSchema {
  settings: {
    key: string;
    value: {
      key: string;
      value: unknown;
      timestamp: number;
    };
  };
  cache: {
    key: string;
    value: {
      key: string;
      data: unknown;
      timestamp: number;
      expiry: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<AlgorithmDB>> | null = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<AlgorithmDB>('algorithm-visualizer', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

// 保存设置
export const saveSetting = async (key: string, value: unknown): Promise<void> => {
  const db = await getDB();
  await db.put('settings', {
    key,
    value,
    timestamp: Date.now(),
  });
};

// 获取设置
export const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const db = await getDB();
    const result = await db.get('settings', key);
    return result ? (result.value as T) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// 保存缓存（带过期时间）
export const saveCache = async (key: string, data: unknown, expiryMs: number): Promise<void> => {
  const db = await getDB();
  await db.put('cache', {
    key,
    data,
    timestamp: Date.now(),
    expiry: expiryMs,
  });
};

// 获取缓存
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await getDB();
    const result = await db.get('cache', key);
    if (!result) return null;
    
    const now = Date.now();
    if (now - result.timestamp > result.expiry) {
      return null; // 缓存已过期
    }
    return result.data as T;
  } catch {
    return null;
  }
};

// 获取GitHub Star数（带缓存）
export const getGitHubStars = async (owner: string, repo: string): Promise<number> => {
  const cacheKey = `github-stars-${owner}-${repo}`;
  const ONE_HOUR = 60 * 60 * 1000;
  
  // 尝试从缓存获取
  const cached = await getCache<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
    const data = await response.json();
    const stars = data.stargazers_count || 0;
    await saveCache(cacheKey, stars, ONE_HOUR);
    return stars;
  } catch {
    // 获取失败，尝试返回过期缓存
    try {
      const db = await getDB();
      const result = await db.get('cache', cacheKey);
      if (result) return result.data as number;
    } catch {
      // IndexedDB unavailable; fall through to the empty-state value.
    }
  }

  return 0;
};
