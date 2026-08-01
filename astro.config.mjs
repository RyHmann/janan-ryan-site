// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
	site: 'https://jananandryan.info',
	base: '/',
	adapter: vercel(),
	integrations: [mdx(), react()],
});
