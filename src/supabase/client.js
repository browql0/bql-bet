import { createClient } from '@supabase/supabase-js'

// 🔧 CONFIGURATION SUPABASE
// Remplacez ces valeurs par vos propres clés Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    // Environment variables missing - app will fail gracefully
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: window.localStorage,
    }
})



