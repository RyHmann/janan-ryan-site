// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
	site: 'https://jananandryan.info',
	base: '/',
	adapter: node({ mode: 'standalone' }),
	integrations: [mdx(), react()],
});
