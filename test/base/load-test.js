define(function (require) {
	var console = require('util/console'), load = require('base/load').load, resolve = require('util/uri').resolve, uri = define.getCurrentScriptSrc(), test;
	//log.level = 9;
	test = require('util/test').run({
		callback : function (url, success) {
			var expected = this.urls ? this.urls[url] : !this.fail_expects[url];
			console.info(url, this.cnt, success);
			this.cnt -= 1;
			if (expected ? !success : success) {
				this.fail = true;
				test.fail(this.name, this.cnt, {expected : expected, actual : url});
			} else if (!this.cnt) {
				test[this.fail ? 'fail' : 'success'](this.name);
			}
		},
		_test    : function (name, urls) {
			var cb = this.callback, obj = {}, ctx = {name : name, cnt : 0, urls : obj}, p, t = '?' + new Date().getTime(), p2;
			// add property of object when iteration in IE will cause infinite cycle problem
			for (p in urls) {
				if (urls.hasOwnProperty(p)) {
					p2 = resolve(p, uri);
					obj[p2 + t] = obj[p2] = urls[p];
					ctx.cnt += 2;
					load(p2, cb, ctx);
					load(p2 + t, cb, ctx);
				}
			}
			return false;
		},
		testJs   : function () {
			return this._test('testJs', {
				'http://a.tbcdn.cn/s/kissy/1.1.6/kissy-min.js' : true,
//				'http://static.paipaiimg.com/js/pp.noticeBoard.js'            : true,
//				'http://js.t.sinajs.cn/t35/miniblog/static/js/top.js'         : true,
//				'http://shop.qq.com/act/static/week/fri/bang/day_1_p_0_10.js' : true,
				'http://a.tbcdn.cn/404.js'                     : false,
				'../js/test.js'                                : true,
				'../js/empty.js'                               : true,
				'../js/404.js'                                 : false,
				'../js/invalid.js'                             : false
			});
		},
		testCss  : function () {
			return this._test('testCss', {
				'http://a.tbcdn.cn/p/global/1.0/global-min.css'          : true,
				'https://ec264devtest.ihandbookstudio.net/css/reset.css' : true,
//				'http://static.paipaiimg.com/member/activate.css'        : true,
//				'http://img1.t.sinajs.cn/t35/skin/skin_008/skin.css'     : true,
//				'http://auto.sina.com.cn/css/newstyles.css'              : true,
				'http://a.tbcdn.cn/404.css'                              : false,
				'../css/test.css'                                        : true,
				'../css/empty.css'                                       : true,
				'../css/404.css'                                         : false,
				'../css/invalid.css'                                     : false
			});
		},
		testImg  : function () {
			return this._test('testImg', {
				'http://img02.taobaocdn.com/tps/i2/T1iQhUXnxpXXXXXXXX-171-48.png'   : true,
				'https://ec264devtest.ihandbookstudio.net/img/login/login_logo.png' : true,
//				'http://static.paipaiimg.com/module/logo/logo_2011_02_22.png'                : true,
//				'http://img1.t.sinajs.cn/t35/style/images/common/header/logoNew_nocache.png' : true,
				'http://a.tbcdn.cn/404.png'                                         : false,
				'../img/test.png'                                                   : true,
				'../img/empty.png'                                                  : true,
				'../img/404.png'                                                    : false,
				'../img/invalid.png'                                                : false
			});
		}
	});
});