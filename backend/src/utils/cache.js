
import { supabaseAdmin } from '../config/supabase.js';
import { LRUCache } from 'lru-cache';

// Initialize in-memory cache
// Options: max items 500, TTL 1 hour (default)
const memoryCache = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 60, // 1 hour
    allowStale: false,
});

export const cache = {
    /**
     * Retrieve a value from the cache.
     * Strategies: Memory -> Supabase DB -> Null
     * @param {string} key 
     * @returns {Promise<any|null>} The cached value or null if missed/expired.
     */
    async get(key) {
        try {
            // 1. Check Memory Cache (L1)
            const memValue = memoryCache.get(key);
            if (memValue !== undefined) {
                return memValue;
            }

            // 2. Check Supabase Cache (L2)
            const { data, error } = await supabaseAdmin
                .from('functionality_cache')
                .select('value, expires_at')
                .eq('key', key)
                .single();

            if (error || !data) return null;

            if (new Date(data.expires_at) < new Date()) {
                // Expired in DB
                return null;
            }

            // Populate L1 from L2
            // Calculate remaining TTL
            const remainingTTL = new Date(data.expires_at).getTime() - Date.now();
            if (remainingTTL > 0) {
                memoryCache.set(key, data.value, { ttl: remainingTTL });
            }

            return data.value;
        } catch (err) {
            console.error('Cache Get Error:', err);
            return null;
        }
    },

    /**
     * Set a value in the cache.
     * Updates both Memory (L1) and Supabase (L2).
     * @param {string} key 
     * @param {any} value - Must be JSON serializable
     * @param {number} ttlSeconds - Time to live in seconds
     */
    async set(key, value, ttlSeconds = 600) {
        try {
            // 1. Set Memory Cache
            memoryCache.set(key, value, { ttl: ttlSeconds * 1000 });

            // 2. Set Supabase Cache
            const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

            // We do this asynchronously to not block the response if possible,
            // but usually we want to await to ensure persistence.
            const { error } = await supabaseAdmin
                .from('functionality_cache')
                .upsert({
                    key,
                    value,
                    expires_at: expiresAt
                });

            if (error) {
                console.error('Cache Set Error (Supabase):', error);
            }
        } catch (err) {
            console.error('Cache Set Error:', err);
        }
    },

    /**
     * Invalidate a specific key.
     * @param {string} key 
     */
    async invalidate(key) {
        try {
            // 1. Invalidate Memory
            memoryCache.delete(key);

            // 2. Invalidate Supabase
            await supabaseAdmin
                .from('functionality_cache')
                .delete()
                .eq('key', key);
        } catch (err) {
            console.error('Cache Invalidate Error:', err);
        }
    },

    /**
     * Clear local memory cache (Useful for testing or reset)
     */
    clearLocal() {
        memoryCache.clear();
    }
};
