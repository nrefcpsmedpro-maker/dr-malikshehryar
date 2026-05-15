import { createClient } from "@supabase/supabase-js";

// This client bypasses RLS completely. NEVER use it for user-facing actions, only admin functions.
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(supabaseUrl!, serviceRoleKey!, {
     auth: {
        autoRefreshToken: false,
        persistSession: false
     }
  });
};
