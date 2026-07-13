function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
	const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
	const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

export function encodeBase64Url(value: string): string {
	return bytesToBase64Url(new TextEncoder().encode(value));
}

export function decodeBase64Url(value: string): string {
	return new TextDecoder().decode(base64UrlToBytes(value));
}

export async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sign(value: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
	return bytesToBase64Url(new Uint8Array(signature));
}

export async function verify(value: string, signature: string, secret: string): Promise<boolean> {
	try {
		const key = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['verify'],
		);
		return await crypto.subtle.verify(
			'HMAC',
			key,
			base64UrlToBytes(signature),
			new TextEncoder().encode(value),
		);
	} catch {
		return false;
	}
}
