// Runs `wrangler types`, then drops the GlobalProps.mainModule reference it adds
// once a build exists. That reference pulls the built worker into svelte-check
// and makes the file differ between fresh and built checkouts.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

execFileSync('npx', ['wrangler', 'types'], { stdio: 'ignore' });
const file = 'worker-configuration.d.ts';
const types = readFileSync(file, 'utf8').replace(
	/\n\tinterface GlobalProps \{\n\t\tmainModule: [^\n]*\n\t\}/,
	''
);
writeFileSync(file, types);
