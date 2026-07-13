import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerConfig } from './config';

let client: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
	if (client) return client;
	const { supabaseUrl, supabaseServiceRoleKey } = getServerConfig();
	client = createClient(supabaseUrl, supabaseServiceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
	return client;
}
