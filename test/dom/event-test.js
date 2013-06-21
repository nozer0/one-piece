/*global define */
define(function (require) {
	var assert = require('util/assert'), AssertionError = assert.AssertionError, events = require('dom/event'), outer, inner, chkbox, input,
		test = require('util/test').run({
			setUp        : function () {
				var doc = document, body = doc.getElementsByTagName('body')[0];
				outer = doc.createElement('div');
//				outer.style.border = '1px solid #000';
				outer.style.background = '#333';
				outer.style.padding = '30px';
				inner = doc.createElement('div');
				inner.style.background = '#eee';
				inner.style.padding = '30px';
				chkbox = doc.createElement('input');
				chkbox.type = 'checkbox';
				input = doc.createElement('input');
				inner.appendChild(chkbox);
				inner.appendChild(input);
				outer.appendChild(inner);
				body.insertBefore(outer, body.firstChild);
			},
			testDispatch : function () {
				setTimeout(function () {
					function onClick(e) {
						try {
							e = events.getEvent(e);
							assert.strictEqual(e.type, 'click', 'e.type');
							assert.strictEqual(e.clientX, 100, 'e.clientX');
							assert.strictEqual(e.clientY, 100, 'e.clientY');
							test.success('testDispatch');
						} catch (ignore) {
							test.fail('testDispatch', false, ignore);
						}
					}

					events.addEventListener(chkbox, 'click', onClick);
					events.dispatchEvent({type : 'click', target : chkbox, clientX : 100, clientY : 100});
					events.removeEventListener(chkbox, 'click', onClick);
				}, 0);
				return false;
			},
			testCapture  : function () {
				var cnt = 0;

				function onClick() {
					cnt += 1;
				}

				events.addEventListener(chkbox, 'click', onClick);
				events.addEventListener(chkbox, 'click', onClick, true);
				events.dispatchEvent({type : 'click', target : chkbox});
				assert.strictEqual(cnt, 2);
				events.removeEventListener(chkbox, 'click', onClick);
				events.dispatchEvent({type : 'click', target : chkbox});
				assert.strictEqual(cnt, 3);
				events.removeEventListener(chkbox, 'click', onClick, true);
				events.dispatchEvent({type : 'click', target : chkbox});
				assert.strictEqual(cnt, 3);
			},
			testEvent    : function () {
				outer.style.margin = '1000px 100px';
				document.getElementsByTagName('body')[0].scrollIntoView(false); // avoid opera remember the scroll top
				inner.scrollIntoView();
				setTimeout(function () {
					var t;

					chkbox.checked = false;
					function onChkbox(e) {
						try {
							e = events.getEvent(e);
							assert.strictEqual(e.target, chkbox, 'e.target');
							assert.strictEqual(e.button, 2, 'e.button');
							assert.strictEqual(e.which, 3, 'e.which');
							e.preventDefault();
						} catch (ignore) {
							test.fail('testEvent', false, ignore);
						}
					}

					function onInner(e) {
						try {
							e = events.getEvent(e);
							e.stopPropagation();
							assert.strictEqual(e.pageY, 1040, 'e.pageY');
						} catch (ignore) {
							test.fail('testEvent', false, ignore);
						}
					}

					function onOuter() {
						test.fail('testEvent', null, 'e.stopPropagation not work');
					}

					events.addEventListener(chkbox, 'mousedown', onChkbox);
					events.addEventListener(inner, 'mousedown', onInner);
					events.addEventListener(outer, 'mousedown', onOuter);
					events.dispatchEvent({type : 'mousedown', target : chkbox, clientX : 10, clientY : 10, button : 2});
					events.removeEventListener(chkbox, 'mousedown', onChkbox);
					events.removeEventListener(inner, 'mousedown', onInner);
					events.removeEventListener(outer, 'mousedown', onOuter);
					t = chkbox.checked;
					if (t) {
						test.fail('testEvent', false, new AssertionError({actual : t, expected : false, message : 'checked'}));
					} else {
						test.success('testEvent');
					}
				}, 300);
				return false;
			}
		});
});