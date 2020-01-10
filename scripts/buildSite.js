const fs = require('fs-extra');
const util = require('util');
const glob = util.promisify(require('glob'));
const rollup = require('rollup');
const terser = require('terser');

(async () => {
	try {
		const baseDir = `${__dirname}/..`;
		const siteDir = `${baseDir}/site`;
		const distDir = `${baseDir}/dist`;
		await fs.remove(distDir);

		const files = await glob('**', {ignore: ['mod/**', '**/*.map', '**/*.ts', '**/*.tsx'], nodir: true, cwd: siteDir});
		await Promise.all(files.map((file) => fs.copy(`${siteDir}/${file}`, `${distDir}/${file}`)));

		const bundle = await rollup.rollup({input: `${siteDir}/mod/index.js`});
		const {output: [{code: bundledCode}]} = await bundle.generate({});
		const minifiedResult = terser.minify(bundledCode);
		if (minifiedResult.error) throw minifiedResult.error;
		await fs.outputFile(`${distDir}/mod/index.js`, minifiedResult.code);
	} catch (e) {
		console.error(e.stack || e);
	}
})();
