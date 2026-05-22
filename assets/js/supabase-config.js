// Supabase Configuration
// Migrated 2026-05 from paused WACTC project (kuxqlvekwuclavoxtgva) to TNT Apparel project (lbjsoxvhfizjuavsszmp)
// WACTC data lives in the 'wactc' schema within the TNT Apparel project
const SUPABASE_URL = 'https://lbjsoxvhfizjuavsszmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxianNveHZoZml6anVhdnNzem1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzE0MTcsImV4cCI6MjA3NTU0NzQxN30.4WQ9SqF3tjGTWe_ilXzbMmKuIIgHOa-IdAFBjP17oeE';

// Initialize Supabase client (we'll use the CDN version)
var supabase;
if (!window.WACTC_SUPABASE) {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            db: { schema: 'wactc' }
        });
    } else {
        console.warn('Supabase SDK not loaded');
    }
} else {
    supabase = window.WACTC_SUPABASE;
}

// Export for use in other files
window.WACTC_SUPABASE = supabase;



