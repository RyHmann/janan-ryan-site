interface ServerConfig {
	supabaseUrl: string;
	supabaseServiceRoleKey: string;
	sessionSecret: string;
	sessionTtlDays: number;
}

let cachedConfig: ServerConfig | undefined;

function required(name: keyof ImportMetaEnv): string {
	const value = import.meta.env[name]?.trim();
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function getServerConfig(): ServerConfig {
	if (cachedConfig) return cachedConfig;

	const supabaseUrl = required('SUPABASE_URL');
	try {
		new URL(supabaseUrl);
	} catch {
		throw new Error('SUPABASE_URL must be a valid URL');
	}

	const sessionSecret = required('RSVP_SESSION_SECRET');
	if (sessionSecret.length < 32) {
		throw new Error('RSVP_SESSION_SECRET must contain at least 32 characters');
	}

	const sessionTtlDays = Number(import.meta.env.RSVP_SESSION_TTL_DAYS ?? '90');
	if (!Number.isInteger(sessionTtlDays) || sessionTtlDays < 1 || sessionTtlDays > 365) {
		throw new Error('RSVP_SESSION_TTL_DAYS must be an integer between 1 and 365');
	}

	cachedConfig = {
		supabaseUrl,
		supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
		sessionSecret,
		sessionTtlDays,
	};

	return cachedConfig;
}
