
import { supabaseAdmin } from '../config/supabase.js';

export const cache = {
    /**
     * Retrieve a value from the cache.
     * @param {string} key 
     * @returns {Promise<any|null>} The cached value or null if missed/expired.
     */
    async get(key) {
        try {
            const { data, error } = await supabaseAdmin
                .from('functionality_cache')
                .select('value, expires_at')
                .eq('key', key)
                .single();

            if (error || !data) return null;

            if (new Date(data.expires_at) < new Date()) {
                // Expired, treat as miss and optionally cleanup
                // We'll leave cleanup for a background job or next set? 
                // For now just return null.
                return null;
            }

            return data.value;
        } catch (err) {
            console.error('Cache Get Error:', err);
            return null;
        }
    },

    /**
     * Set a value in the cache.
     * @param {string} key 
     * @param {any} value - Must be JSON serializable
     * @param {number} ttlSeconds - Time to live in seconds
     */
    async set(key, value, ttlSeconds = 600) {
        try {
            const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

            const { error } = await supabaseAdmin
                .from('functionality_cache')
                .upsert({
                    key,
                    value,
                    expires_at: expiresAt
                });

            if (error) {
                console.error('Cache Set Error:', error);
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
            await supabaseAdmin
                .from('functionality_cache')
                .delete()
                .eq('key', key);
        } catch (err) {
            console.error('Cache Invalidate Error:', err);
        }
    }
};
