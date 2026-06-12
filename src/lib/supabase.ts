import { createClient } from '@supabase/supabase-js';

// Mismas variables que el admin — comparten la misma instancia de Supabase.
// En el portal usamos la anon key para poder leer tenant_portal_users
// (la tabla tiene RLS deshabilitado en dev y policy anon SELECT en producción).
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
