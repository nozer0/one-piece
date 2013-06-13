/*global define */
define(function (require) {
	'use strict';

	var assert = require('util/assert'), uri = require('util/uri'), cbase = 'http://localhost/o_p/tests/util/uri.html';
	require('util/test').run({
		name          : 'uri',
		setUp         : function () {
			uri.config({
				base  : 'http://www.nozer0.com/foo/bar/some/office',
				maps  : ['{locale}', 'en-us', /(\w)(?=\.js)/, '$1-debug', 'foo.com', 'foo2.com']
			});
		},
		testLocation  : function () {
			assert.deepEqual(uri.location('http://nozer0.com:8080/foo/bar/o_p.min.js?v=1.0#debug'), {uri : 'http://nozer0.com:8080/foo/bar/o_p.min.js?v=1.0#debug', protocol : 'http:', host : 'nozer0.com:8080', hostname : 'nozer0.com', port : '8080', pathname : '/foo/bar/o_p.min.js', basename : 'o_p.min', ext : '.js', search : '?v=1.0', hash : '#debug'});
			assert.deepEqual(uri.location('nozer0.com/foo/bar/o_p.#debug'), {uri : 'http://nozer0.com/foo/bar/o_p.#debug', protocol : 'http:', host : 'nozer0.com', hostname : 'nozer0.com', port : '', pathname : '/foo/bar/o_p.', basename : 'o_p', ext : '.', search : '', hash : '#debug'});
			assert.deepEqual(uri.location('nozer0.com/foo/bar/o_p/#debug'), {uri : 'http://nozer0.com/foo/bar/o_p/#debug', protocol : 'http:', host : 'nozer0.com', hostname : 'nozer0.com', port : '', pathname : '/foo/bar/o_p/', basename : '', ext : '', search : '', hash : '#debug'});
			assert.deepEqual(uri.location('http://nozer0.com/?v=1.0'), {uri : 'http://nozer0.com/?v=1.0', protocol : 'http:', host : 'nozer0.com', hostname : 'nozer0.com', port : '', pathname : '/', basename : '', ext : '', search : '?v=1.0', hash : ''});
		},
		testNormalize : function () {
			assert.equal(uri.normalize('http://nozer0.com/a/b/c'), 'http://nozer0.com/a/b/c');
			assert.equal(uri.normalize('http:///nozer0.com/a//..///./b//.///c//'), 'http://nozer0.com/b/c/');
			assert.equal(uri.normalize('http://nozer0.com/a//b/c/..///./../../d//../e.js'), 'http://nozer0.com/e.js');
			assert.equal(uri.normalize('a/../b/../c'), 'c');
			assert.equal(uri.normalize('a/../../c'), '../c');
			assert.equal(uri.normalize('//a/b/../../c'), '/c');
		},
		testNormal    : function () {
			assert.equal(uri.resolve('http://foo.com'), 'http://foo2.com');
			assert.equal(uri.resolve('{locale}/me'), 'http://www.nozer0.com/foo/bar/some/en-us/me');
			assert.equal(uri.resolve('{locale}/test.min.1.0.js'), 'http://www.nozer0.com/foo/bar/some/en-us/test.min.1.0-debug.js');
			assert.equal(uri.resolve('js/test.js', cbase), 'http://localhost/o_p/tests/util/js/test-debug.js');
			assert.equal(uri.resolve('js/test.js', 'util/css'), 'util/js/test-debug.js');
		},
		testRelative  : function () {
			assert.equal(uri.resolve('./me'), 'http://www.nozer0.com/foo/bar/some/me');
			assert.equal(uri.resolve('./me', 'http://foo.com/'), 'http://foo2.com/me');
			assert.equal(uri.resolve('../me'), 'http://www.nozer0.com/foo/bar/me');
			assert.equal(uri.resolve('../../../thank/you/../all'), 'http://www.nozer0.com/thank/all');
			assert.equal(uri.resolve('../util/js/test.js', cbase), 'http://localhost/o_p/tests/util/js/test-debug.js');
			assert.equal(uri.resolve('../util/../js/test.js', 'o_p/test/css'), 'o_p/js/test-debug.js');
		},
		testAbsolute  : function () {
			assert.equal(uri.resolve('/me'), 'http://www.nozer0.com/me');
			assert.equal(uri.resolve('/me', 'http://foo.com/hello/all/'), 'http://foo2.com/me');
			assert.equal(uri.resolve('/o_p/tests/js/test.js', cbase), 'http://localhost/o_p/tests/js/test-debug.js');
			assert.equal(uri.resolve('/util/js/test.js', 'o_p/test/css'), '/util/js/test-debug.js');
		}
	});
});