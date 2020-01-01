module.exports = (config) => {
	config.set({
		basePath: '.',
		frameworks: ['jasmine'],
		files: [
			{pattern: 'test/**/*.test.js', type: 'module'},
			{pattern: 'src/**', included: false},
			{pattern: 'api/**', included: false},
			{pattern: 'site/**', included: false},
			{pattern: 'test/**', included: false}
		]
	});
}