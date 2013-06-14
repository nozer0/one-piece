/*global define */
define.config({
	debug   : 0,
	alias   : {'underscore' : 'https://raw.github.com/documentcloud/underscore/master/underscore.js'},
	plugins : ['shim', 'foo'],
	shims   : {'https://raw.github.com/documentcloud/underscore/master/underscore' : '_'}
});