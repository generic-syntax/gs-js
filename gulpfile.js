const {src, dest, parallel, series} = require('gulp');
const webpack = require('webpack-stream');
const rimraf = require('gulp-rimraf');

function clean() {
	return src("dist/*", {read: false}).pipe(rimraf());
}

async function copy() {
	return src(['site/**/*', '!site/mod/**', '!site/**/*.map', '!site/**/*.ts', '!site/**/*.tsx']).pipe(dest('dist/'));
}

function js() {
	return src('site/mod/index.js')
		.pipe(webpack({
			mode: 'production',
			output: {
				filename: 'index.js'
			}
		}))
		.pipe(dest('dist/mod'));
}

exports.default = series(clean, parallel(copy, js));


