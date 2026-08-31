import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		{
			name: 'element-html',
			enforce: 'pre',
			transform(source, id) {
				if (id.endsWith('.html')) return `export default ${JSON.stringify(source)}`;
			},
		},
	],
	test: { exclude: ['node_modules/**', 'tests/browser/**'] },
});
