import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{ ignores: ['worker-configuration.d.ts'] },
	js.configs.recommended,
	ts.configs.recommended,
	// Type-aware rules for app code: a missing await, and untyped (any) values
	// leaking in. Routes type their props (PageProps) so ESLint can see them. The
	// full recommendedTypeChecked preset was tried and only added noise here.
	// Named tsconfigs rather than projectService: with Svelte files that took
	// about 2 minutes, this about 20 seconds.
	{
		files: ['src/**/*.ts', 'src/**/*.svelte'],
		languageOptions: {
			parserOptions: {
				project: ['./tsconfig.json', './src/service-worker/tsconfig.json'],
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
			'@typescript-eslint/no-unsafe-argument': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'error',
			'@typescript-eslint/no-unsafe-return': 'error'
		}
	},
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			// No base path, so plain hrefs and goto() calls don't need resolve().
			'svelte/no-navigation-without-resolve': 'off'
		}
	}
);
