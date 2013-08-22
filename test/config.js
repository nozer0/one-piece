/*global define */
define.config({
	debug   : 0,
	alias   : {'underscore' : 'http://underscorejs.org/underscore.js'},
	plugins : ['shim', 'text'],
	shims   : {'http://underscorejs.org/underscore' : '_'}
});