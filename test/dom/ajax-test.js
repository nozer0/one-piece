/*global define */
define(function (require) {
	//noinspection JSUnresolvedVariable
	var assert = require('util/assert'), ajax = require('dom/ajax'), Blob = define.global.Blob, test = require('util/test').run({
		setUp              : function () {
			this.fail_callback = function (status) {
				test.fail(this.name, null, status);
			};
		},
		testGet            : function () {
			ajax.ajax({
				url       : './ajax-test.php?method=GET',
				name      : 'testGet',
				method    : 'get',
				onsuccess : function (res) {
					try {
						assert.equal(res, 'get response');
						test.success(this.name);
					} catch (ex) {
						test.fail(this.name, null, ex);
					}
				},
				onfail    : this.fail_callback
			});
			return false;
		},
		testPost           : function () {
			ajax.ajax({
				url       : './ajax-test.php',
				name      : 'testPost',
				method    : 'post',
				data      : {n : 1, s : 'a', d : new Date(), o : {x : 1, y : 2}, arr : ['a', 'b'], fn : function () { return 'aaa'; }},
				onsuccess : function (res) {
					try {
						assert.equal(res, '{"n":1,"s":"a","d":"' + String(this.data.d) + '","o":{"x":1,"y":2},"arr":["a","b"],"fn":"aaa"}');
						test.success(this.name);
					} catch (ex) {
						test.fail(this.name, null, ex);
					}
				},
				onfail    : this.fail_callback
			});
			return false;
		},
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
		testArrayBuffer    : function () {
			ajax.ajax({
				url       : './ajax-test.php',
				name      : 'testArrayBuffer',
				method    : 'post',
				data      : {type : 'arraybuffer'},
				type      : 'arraybuffer',
				onsuccess : function (res) {
					try {
						var arr, i, l;
						//noinspection JSUnresolvedVariable
						if (define.global.Uint8Array) {
							for (arr = new Uint8Array(res), i = 0, l = arr.length, res = ''; i < l; i += 1) {
								res += String.fromCharCode(arr[i]);
							}
						}
						assert.equal(res, 'arraybuffer response');
						test.success(this.name);
					} catch (ex) {
						test.fail(this.name, null, ex);
					}
				},
				onfail    : this.fail_callback
			});
			return false;
		},
		testBlob           : define.global.FileReader && function () {
			ajax.ajax({
				url       : './ajax-test.php',
				name      : 'testBlob',
				method    : 'post',
				data      : {type : 'blob'},
				type      : 'blob',
				onsuccess : function (res) {
					var reader = new FileReader(), name = this.name;
					reader.onloadend = function () {
						try {
							assert.equal(this.result, 'blob response');
							test.success(name);
						} catch (ex) {
							test.fail(name, null, ex);
						}
					};
					reader.readAsText(res);
				},
				onfail    : this.fail_callback
			});
			return false;
		},
		testDocument       : function () {
			ajax.ajax({
				url       : './ajax-test.php',
				name      : 'testDocument',
				method    : 'post',
				data      : {type : 'document'},
				type      : 'document',
				onsuccess : function (res) {
					try {
						assert.equal(res.documentElement.innerHTML.replace('\r\n', '').toLowerCase(), '<head><title>document response</title></head><body></body>');
						test.success(this.name);
					} catch (ex) {
						test.fail(this.name, null, ex);
					}
				},
				onfail    : this.fail_callback
			});
			return false;
		},
		testJSON           : function () {
			ajax.ajax({
				url       : './ajax-test.php',
				name      : 'testJSON',
				method    : 'post',
				data      : {type : 'json', n : 1, s : '啊', d : new Date(), o : {x : 1, y : 2}, arr : ['a', 'b'], fn : function () { return 'aaa'; }},
				type      : 'json',
				onsuccess : function (res) {
					try {
						assert.deepEqual(res, {type : 'json', n : 1, s : '啊', d : String(this.data.d), o : {x : 1, y : 2}, arr : ['a', 'b'], fn : 'aaa'});
						test.success(this.name);
					} catch (ex) {
						test.fail(this.name, null, ex);
					}
				},
				onfail    : this.fail_callback
			});
			return false;
		},
		testFile           : Blob && function () {
			ajax.ajax({
				url       : './ajax-test.php',
				name      : 'testFile',
				method    : 'post',
				enctype   : 'multipart/form-data',
				data      : {type : 'file', file : [new Blob(['Hey, guess who am I'], {type : 'text/plain'}), new Blob(['yes, nozer0'], {type : 'text/plain'})]},
				onsuccess : function (res) {
					try {
						assert.equal(res, 'Hey, guess who am I, yes, nozer0');
						test.success(this.name);
					} catch (ex) {
						test.fail(this.name, null, ex);
					}
				},
				onfail    : this.fail_callback
			});
			return false;
		},
		testForm           : function () {
			var doc = define.global.document, form = doc.createElement('form');
			form.innerHTML = 'hidden:<input name="hidden" type="hidden" value="hidden"> disabled:<input name="disabled" disabled value="disabled"> unnamed:<input value="unnamed"> type:<input name="type" value="json"> <textarea name="s">啊</textarea> ' + 'chk[]:<input name="chk[]" type="checkbox" value="a" checked> <input name="chk[]" type="checkbox" value="b" checked> <input name="chk[]" type="checkbox" value="c"> radio:<input name="radio[]" type="radio" value="a"> <input name="radio[]" type="radio" value="b" checked> ' + 'overwrite: <input name="overwrite" value="overwrite"> <input name="overwrite" value="overwritten"> ' + '<select name="sel"><option value="Red" selected>红</option><option selected>绿</option></select> <select name="sel2[]" multiple><option value="Red" selected>红</option><option selected>绿</option></select>' + '<input name="submit" type="submit" value="submit"> <button name="reset">reset</button> ';
			ajax.ajax({
				url       : './ajax-test.php',
				name      : 'testForm',
				method    : 'post',
				form      : form,
				type      : 'json',
				onsuccess : function (res) {
					try {
						assert.deepEqual(res, {hidden : 'hidden', type : 'json', s : '啊', chk : ['a', 'b'], radio : ['b'], overwrite : 'overwritten', sel : '绿', sel2 : ['Red', '绿']});
						test.success(this.name);
					} catch (ex) {
						test.fail(this.name, null, ex);
					}
				},
				onfail    : this.fail_callback
			});
			return false;
		},
		testFormWithFile   : function () {
			var doc = define.global.document, form = doc.createElement('form'), input = doc.createElement('textarea'), body = doc.body;
			form.innerHTML = '<input name="type" type="hidden" value="file"> <input name="file" type="file" multiple> <br>Please choose one file, and paste the file content in the textarea, then click the submit button below<br><button type="submit">submit</button>';
			input.value = 'something I want to show you. 你好';
			form.onsubmit = function () {
				ajax.ajax({
					url       : './ajax-test.php',
					name      : 'testFormWithFile',
					method    : 'post',
					form      : form,
					enctype   : 'multipart/form-data',
					onsuccess : function (res) {
						try {
							assert.equal(res, input.value);
							test.success(this.name);
						} catch (ex) {
							test.fail(this.name, null, ex);
						}
					},
					onfail    : test.fail_callback
				});
				return false;
			};
			form.appendChild(input);
			body.appendChild(form);
			return false;
		},
		testCross          : function () {
			ajax.ajax({
				// please replace 'www.nozer0.com' to your own server domain
				url       : 'http://www.nozer0.com/one-piece/test/dom/ajax-test.php',
				name      : 'testCross',
				method    : 'post',
				data      : {type : 'cross'},
				onsuccess : function (res) {
					try {
						assert.equal(res, 'cross response');
						test.success(this.name);
					} catch (ex) {
						test.fail(this.name, null, ex);
					}
				},
				onfail    : this.fail_callback
			});
			return false;
		},
		testUploadProgress : function () {
			var doc = define.global.document, form = doc.forms[0], bar = doc.createElement('div'), btn = doc.createElement('input');
			btn.type = 'button';
			btn.value = 'upload';
			bar.style.backgroundColor = 'gray';
			bar.style.height = '15px';
			bar.style.width = '1px';
			form.appendChild(bar);
			form.appendChild(btn);
			btn.onclick = function () {
				//noinspection JSUnusedGlobalSymbols
				ajax.ajax({
					url       : './ajax-test.php',
					name      : 'testUploadProgress',
					method    : 'post',
					form      : form,
					enctype   : 'multipart/form-data',
					onsuccess : function () {
						try {
							test.success(this.name);
						} catch (ex) {
							test.fail(this.name, null, ex);
						}
					},
					onfail    : test.fail_callback,
					upload    : {
						onprogress : function (e) {
							bar.style.width = Math.ceil(e.loaded * 100 / e.total) + 'px';
							bar.innerHTML = Math.ceil(e.loaded / e.total) + ':' + e.loaded + '/' + e.total;
							console.info(e.loaded + '/' + e.total);
						}
					}
				});
				return false;
			};
			return false;
		},
		testSync           : function () {
			setTimeout(function () {
				var sync = false;
				ajax.ajax({
					url       : './ajax-test.php',
					name      : 'testSync',
					method    : 'post',
					async     : false,
					onsuccess : function () {
						sync = true;
					},
					onfail    : this.fail_callback
				});
				try {
					assert.strictEqual(sync, true);
					test.success('testSync');
				} catch (ex) {
					test.fail('testSync', null, ex);
				}
			}, 500);
		}
	});
});