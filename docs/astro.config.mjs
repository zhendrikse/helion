// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	base: '/helion/', // URL prefix for GitHub pages
	outDir: "./dist",
	integrations: [
		starlight({
			title: '☀️ Helion',
			sidebar: [
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
						{ label: 'Charged Ring', slug: 'electromagnetism/charged_ring' },
						{ label: 'Charged Rod', slug: 'electromagnetism/charged_rod' },
						{ label: 'Charged Sheet', slug: 'electromagnetism/charged_sheet' },
						{ label: 'Dipole field', slug: 'electromagnetism/dipole_field' },
						{ label: 'Electromagnetic wave', slug: 'electromagnetism/electromagnetic_wave_quiver' },
						{ label: 'Solenoid', slug: 'electromagnetism/solenoid' },
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