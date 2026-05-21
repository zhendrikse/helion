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
					items: [
						{ label: 'Getting started', slug: 'guides/getting_started' },
					],
				},
				{
					collapsed: true,
					label: 'Astrophysics',
					items: [
						{ label: 'Star cluster', slug: 'astrophysics/star_cluster' },
					],
				},
				{
					collapsed: true,
					label: 'Electromagnetism',
					items: [
						{ label: 'Electric fields', slug: 'electromagnetism/electric_fields' },
						{ label: 'Electromagnetic fields', slug: 'electromagnetism/electromagnetic_fields' },
						{ label: 'Particle in electric field', slug: 'electromagnetism/particle_electric_field' },
						{ label: 'Particle in magnetic field', slug: 'electromagnetism/particle_magnetic_field' },
					],
				},
				{
					collapsed: true,
					label: 'Waves',
					items: [
						{ label: 'N-body oscillator', slug: 'waves/n_body_oscillator' }
					],
				}
			],
		})
	],
});