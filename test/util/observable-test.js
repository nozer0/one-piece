/*global define */
define(function (require) {
	//noinspection JSUnusedGlobalSymbols
	var assert = require('util/assert'), observable = require('util/observable'),
		test = require('util/test').run({
			onTrigger           : function (e) {
				try {
					assert.strictEqual(this.x, 1, 'this.x');
					assert.strictEqual(e.x, e.type === 'trigger' ? 4 : 3, 'e.x');
					if (e.type === 'trigger') {
						test.success('testTrigger');
					}
				} catch (ex) {
					test.fail('testTrigger', false, ex);
				}
			},
			onTriggerX          : function (e) {
				try {
					assert.strictEqual(e.type, 'trigger:x', 'e.type');
					assert.strictEqual(e.x, 3, 'e.x');
				} catch (ex) {
					test.fail('testTrigger', false, ex);
				}
			},
			testTrigger         : function () {
				var o = {x : 1, y : 2};
				observable.on(o, 'trigger:x', this.onTriggerX);
				observable.on(o, 'trigger', this.onTrigger);
				observable.trigger({type : 'trigger:x', target : o, x : 3});
				observable.off(o, 'trigger:x');
				observable.trigger(o, {type : 'trigger', x : 4});
				return false;
			},
			testStopPropagation : function () {
				var o = {x : 1, y : 2};
				observable.on(o, 'bubble', function () { return false; });
				observable.on(o, 'bubble', function () { o.x = 2; });
				observable.trigger({type : 'bubble', target : o}, true);
				assert.strictEqual(o.x, 1);
			},
			testBlocking        : function () {
				var o = {x : 1, y : 2};
				observable.on(o, 'block', function () { o.x = 2; });
				observable.trigger({type : 'block', target : o});
				assert.strictEqual(o.x, 1);
				observable.trigger({type : 'block', target : o}, true);
				assert.strictEqual(o.x, 2);
			},
			onUpdateX           : function (e) {
				try {
					assert.strictEqual(e.type, 'update:x', 'e.type');
					assert.strictEqual(e.x, 3, 'e.x');
				} catch (ex) {
					test.fail('testObservable', false, ex);
				}
			},
			onUpdate            : function (e) {
				try {
					assert.strictEqual(e.type, 'update:x', 'e.type');
					assert.strictEqual(e.x, 3, 'e.x');
					test.success('testObservable');
				} catch (ex) {
					test.fail('testObservable', false, ex);
				}
			},
			testObservable      : function () {
				var o = {x : 1, y : 2};
				observable.observable(o);
				o.on({
					'update:x' : this.onUpdateX,
					'update'   : this.onUpdate
				});
				o.trigger({type : 'update:x', x : 3});
				return false;
			},
			onSet               : function (e) {
				try {
					assert.strictEqual(e.old, 1, 'e.old');
					assert.strictEqual(e.value, 4, 'e.value');
					assert.strictEqual(this.x, 4, 'this.x');
					this.reset();
					assert.strictEqual(this.x, 1, 'reset this.x');
					test.success('testSettable');
				} catch (ex) {
					test.fail('testSettable', false, ex);
				}
			},
			testSettable        : function () {
				var o = {x : 1, y : 2};
				observable.settable(o);
				o.on('beforeSet', function (e) { e.value += 1; });
				o.on('set', this.onSet);
				if (o.set) {
					o.set('x', 3);
				} else {
					o.x = 3;
				}
				return false;
			}
		});
});