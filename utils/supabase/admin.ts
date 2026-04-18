import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// This client bypasses RLS completely. NEVER use it for user-facing actions, only admin functions.
export const createAdminClient = () => {
  return createClient(supabaseUrl!, serviceRoleKey!, {
     auth: {
        autoRefreshToken: false,
        persistSession: false
     }
  });
};
