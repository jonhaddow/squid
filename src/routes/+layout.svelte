<script lang="ts">
	import type { LayoutProps } from './$types';
	import '@fontsource/luckiest-guy';
	import './app.css';

	let { children }: LayoutProps = $props();
</script>

{@render children()}
