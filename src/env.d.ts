/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly SUPABASE_URL?: string;
	readonly SUPABASE_SERVICE_ROLE_KEY?: string;
	readonly RSVP_SESSION_SECRET?: string;
	readonly RSVP_SESSION_TTL_DAYS?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
