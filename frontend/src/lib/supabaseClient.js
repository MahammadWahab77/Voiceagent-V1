import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Config:', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    keyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
