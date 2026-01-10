import { createClient } from '@supabase/supabase-js'

// 🔧 CONFIGURATION SUPABASE
// Remplacez ces valeurs par vos propres clés Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ SUPABASE ERROR: Missing environment variables! Check .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: window.localStorage,
    }
})



