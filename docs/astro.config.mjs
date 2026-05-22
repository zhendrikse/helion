// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	base: '/helion/', // URL prefix for GitHub pages
	outDir: "../dist",
	integrations: [
		starlight({
			title: '☀️ Helion',
			sidebar: [
				{
					label: 'Guides',
					items: [{ autogenerate: { directory: 'guides' } }],
				},
				{
					collapsed: true,
					label: 'Astrophysics',
					items: [{ autogenerate: { directory: 'astrophysics' } }],
				},
				{
					collapsed: true,
					label: 'Electromagnetism',
					items: [{ autogenerate: { directory: 'electromagnetism' } }],
				},
				{
					collapsed: true,
					label: 'Kinematics',
					items: [{ autogenerate: { directory: 'kinematics' } }],
				},
				{
					collapsed: true,
					label: 'Nature',
					items: [{ autogenerate: { directory: 'nature' } }],
				},
				{
					collapsed: true,
					label: 'Waves',
					items: [{ autogenerate: { directory: 'waves' } }],
				}
			],
		})
	],
});