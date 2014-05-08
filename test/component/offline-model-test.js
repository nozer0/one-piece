/*global define */
define(function (require) {
	//noinspection JSUnresolvedVariable
	var global = define.global || window, assert = require('util/assert'), mixin = require('util').mixin, Model = require('component/offline-model').Model, AjaxStore = require('component/store/ajax').Store, DBStore = require(global.openDatabase ? 'component/store/sqlDB' : global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB ? 'component/store/indexedDB' : 'util/uri').Store, test = require('util/test').run({
		repeat      : 1,
		setUpCase   : function () {
			this.fields = {
				id      : 'int',
				name    : 'string',
				age     : 'int',
				sex     : {type : 'string', defaultValue : 'female'},
				country : 'string',
				level   : 'int'
			};
			this.data = [
				{name : 'Li Lei', age : 22, sex : 'male', country : 'China'},
				{name : 'Han Mei', age : 20, sex : 'male', country : 'China'},
				{name : 'Lucy', age : 22, country : 'USA'},
				{name : 'Lily', age : 21, country : 'USA'},
				{name : 'Gray', age : 22, sex : 'male', country : 'USA'},
				{name : 'Auto Man', age : 108, sex : 'unknown', country : 'X-11'},
				{name : '(ˇˍˇ）', age : 20, country : 'ZA-1011'},
				{name : '优菜', age : 18, country : 'Japan'},
				{name : '葵', age : 19, country : 'Japan'}
			];
		},
		_test       : function (model, name) {
			var data = this.data, remote = model.remote_store;
			model.onError = function (e) {
				model.destroy();
				test.fail(name, null, Model.ERRORS[e.code] || String(e));
			};
			model.on('save:create', function (e) {
				var d = e.data, id = remote.enabled ? d.id : d.__lid;
				if (id < 0 || id > 9) {
					model.destroy();
					test.fail(name + ':save', false, 'actual : ' + id);
				}
				try {
					assert.strictEqual(d.name, data[id - 1].name);
					model.save(id === 9 ? (remote.enabled ? {id : 2, sex : 'female'} : {__lid : 2, sex : 'female'}) : mixin({}, data[id]));
				} catch (ex) {
					model.destroy();
					test.fail(name + ':save', false, ex);
				}
			});
			model.on('save:update', function (e) {
				var id = e.data[remote.enabled ? 'id' : '__lid'];
				if (id !== 2) {
					model.destroy();
					test.fail(name + ':update', false, 'actual : ' + id + ', expected : 2');
				}
				model[remote.enabled ? 'find' : 'findByLid'](2);

				// find
				model[remote.enabled ? 'find' : 'findByLid'](5);

				// list
				model.list([
					{sex : 'female', 'age' : {op : '<', value : 22}},
					{'country' : {op : 'like', value : '%11'}}
				], {
					offset : 1,
					limit  : 4,
					order  : 'age desc'
				});

				// updateAll
				model.updateAll({level : 1}, {country : 'USA'});
			});
			model.on('find', function (e) {
				var d = e.data, id = remote.enabled ? e.id : e.lid;
				if (id === 2) {
					try {
						assert.strictEqual(d.name, 'Han Mei');
						assert.strictEqual(d.sex, 'female');
					} catch (ex) {
						model.destroy();
						test.fail(name + ':update', false, ex);
					}
				} else if (id === 5) {
					try {
						assert.strictEqual(d.name, data[4].name);
						assert.strictEqual(d.age, data[4].age);
					} catch (ex) {
						model.destroy();
						test.fail(name + ':find', false, ex);
					}
				} else if (id === 7) {
					try {
						assert.equal(d);
					} catch (ex) {
						model.destroy();
						test.fail(name + ':remove', false, ex);
					}

					// list
					model.list(null, {page : -1, limit : 3, offset : 1, order : 'country'});
				} else {
					test.fail(name + ':find', false, e);
				}
			});
			model.on('list', function (e) {
				var ret = e.data;
				if (!e._again) {
					e._again = true;
					return model.list(e.conditions, e.modifiers, e);
				}
				if (e.conditions) {
					if (e.modifiers) {
						try {
							assert.strictEqual(ret.length, 4);
							assert.strictEqual(ret[0].name, 'Lily');
							assert.strictEqual(ret[2].name, '(ˇˍˇ）');
							assert.strictEqual(ret[3].name, '葵');
						} catch (ex) {
							model.destroy();
							test.fail(name + ':list', false, ex);
						}
					} else if (e.conditions.level) {
						try {
							assert.strictEqual(ret.length, 3);
						} catch (ex) {
							model.destroy();
							test.fail(name + ':updateAll', false, ex);
						}

						// updateAll
						model.updateAll({level : {expr : 'age % 5 + 1'}}, {'country' : ['China', 'Japan']});
					} else {
						try {
							assert.strictEqual(ret.length, 4, 'updateAll expr');
							assert.strictEqual(ret[0].level, 3, 'updateAll expr');
							assert.strictEqual(ret[3].level, 5, 'updateAll expr');
						} catch (ex) {
							model.destroy();
							test.fail(name + ':updateAll expr', false, ex);
						}

						// remove
						model.remove(remote.enabled ? 7 : {__lid : 7});
					}
				} else if (e.modifiers) {
					assert.strictEqual(ret.length, 1, 'list page');
					assert.strictEqual(ret[0].name, 'Auto Man', 'list page');

					// remove
					model.remove({'age' : {op : '>=', value : 20}});
				} else {
					try {
						assert.strictEqual(ret.length, 2);
						assert.strictEqual(ret[0].name, '优菜');

						model.destroy();
						test.success(name);
					} catch (ex) {
						model.destroy();
						test.fail(name + ':remove all', false, ex);
					}
				}
			});
			model.on('updateAll', function (e) {
				if (e.data.level === 1) {
					try {
						assert.strictEqual(e.count, 3);
					} catch (ex) {
						model.destroy();
						test.fail(name + ':updateAll', false, ex);
					}
					model.list({level : 1});
				} else {
					try {
						assert.strictEqual(e.count, 4);
					} catch (ex) {
						model.destroy();
						test.fail(name + ':updateAll', false, ex);
					}
					model.list({'country' : ['China', 'Japan']});
				}
			});
			model.on('remove', function (e) {
				if (e.id || e.conditions.__lid) {
					model[remote.enabled ? 'find' : 'findByLid'](7);
				} else {
					model.list();
				}
			});
			model.on('initialized', function () {
				model.save(mixin({}, data[0]));
			});
			model.init();
			return false;
		},
		testOnline  : DBStore && function () {
			var model = new Model({
				name         : 'people',
				fields       : this.fields,
				local_store  : new DBStore(),
				remote_store : new AjaxStore({host : 'store/store-test.php'})
			});
			model.on('destroyed', this.offlineTest);
			return this._test(model, 'testOnline');
		},
		testOffline : DBStore && function () {
			return false;
		},
		offlineTest : function () {
			var model = new Model({
				name         : 'people',
				fields       : test.fields,
				local_store  : new DBStore(),
				remote_store : new AjaxStore({host : 'store/store-test.php'}),
				offline      : true
			});
			model.on('destroyed', test.randomTest);
			test._test(model, 'testOffline');
			return false;
		},
		testRandom  : DBStore && function () {
			return false;
		},
		randomTest  : function () {
			var model = new Model({
				name         : 'people',
				fields       : this.fields,
				local_store  : new DBStore(),
				remote_store : new AjaxStore({host : 'store/store-test.php'})
			}), data = test.data, remote = model.remote_store, name = 'testRandom', old;
			model.onError = function (e) {
				model.destroy();
				test.fail(name, null, Model.ERRORS[e.code] || String(e));
			};
			model.on('save:create', function (e) {
				var id = e.data.__lid;
//				console.info('save:after', remote.enabled, e.data, e);
				if (id < 10) {
					try {
						// step 1-2
						assert.strictEqual(e.data.name, data[id - 1].name);
						model.changeOnlineStatus(Math.random() > 0.5);
						if (id === 9) {
							model.list({name : 'Han Mei'}); // step 2-1
						} else {
							model.save(mixin({}, data[id]));  // step 1-1
						}
					} catch (ex) {
						model.destroy();
						test.fail(name + ':save', false, ex);
					}
				} else {
					model.destroy();
					test.fail(name + ':save', false, 'id ' + id);
				}
			});
			model.on('save:update', function (e) {
//				console.info('save:after', remote.enabled, e.data, e);
				var d = e.data;
				try {   // step 2-3
					assert.strictEqual(d.name, 'Han Mei');
					assert.strictEqual(d.sex, 'female');
				} catch (ex) {
					model.destroy();
					test.fail(name + ':update', false, ex);
				}

				// find
				old = d;
				model.changeOnlineStatus(Math.random() > 0.5);
				// step 3-1
				if (d.__lid && (!d.id || !remote.enabled)) {
					model.findByLid(d.__lid);
				} else {
					model.find(d.id);
				}
			});
			model.on('find', function (e) {
				var d = e.data, id = e.lid || e.id;
//				console.info('find:after', remote.enabled, d, e, +id);
				if (+id === 2) {  // step 3-2
					try {
						// returns from local with such fields
						delete d.id;
						delete d.__timestamp;
						delete old.id;
						delete old.__timestamp;
						assert.deepEqual(d, old);
					} catch (ex) {
						model.destroy();
						test.fail(name + ':find', false, ex);
					}

					// list
					model.changeOnlineStatus(Math.random() > 0.5);
					// step 4-1
					model.list([
						{sex : 'female', 'age' : {op : '<', value : 22}},
						{'country' : {op : 'like', value : '%11'}}
					], {
						offset : 1,
						limit  : 4,
						order  : 'age desc'
					});

					// updateAll
					model.changeOnlineStatus(Math.random() > 0.5);
					model.updateAll({level : 1}, {country : 'USA'});    // step 5-1
				} else if (id === 7) {  // step 7-3
					try {
						assert.equal(d);
					} catch (ex) {
						model.destroy();
						test.fail(name + ':remove', false, ex);
					}

					// list
					model.changeOnlineStatus(true);
					model.list(null, {page : -1, limit : 3, offset : 1, order : 'country'});    // step 8-1
				} else {
					test.fail(name + ':find', false, e);
				}
			});
			model.on('list', function (e) {
				var ret = e.data;
				// sometimes, even post request sent before the list request, but the return result still be the old ones before post
				if (!e._again) {
					e._again = true;
					return model.list(e.conditions, e.modifiers, e);
				}
//				console.info('list:after', remote.enabled, ret, e);
				if (e.conditions) {
					if (e.modifiers) {  // step 4-2
						try {
							assert.strictEqual(ret.length, 4);
//							assert.strictEqual(ret[0].name, 'Lily');
//							assert.strictEqual(ret[2].name, '(ˇˍˇ）');
//							assert.strictEqual(ret[3].name, '葵');
						} catch (ex) {
							model.destroy();
							test.fail(name + ':list', false, ex);
						}
					} else if (e.conditions.level) {    // step 5-3
						try {
							assert.strictEqual(ret.length, 3);
						} catch (ex) {
							model.destroy();
							test.fail(name + ':updateAll:list', false, ex);
						}

						// updateAll
						model.changeOnlineStatus(Math.random() > 0.5);
						model.updateAll({level : {expr : 'age % 5 + 1'}}, {'country' : ['China', 'Japan']});   // step 6-1
					} else if (e.conditions.name) { // step 2-2
						ret = ret[0];
						ret.sex = 'female';
						model.changeOnlineStatus(Math.random() > 0.5);
						model.save(ret);
					} else {    // step 6-3
						try {
							assert.strictEqual(ret.length, 4, 'updateAll:list expr');
							assert.strictEqual(ret[0].level, 3, 'updateAll:list expr');
							assert.strictEqual(ret[3].level, 5, 'updateAll:list expr');
						} catch (ex) {
							model.destroy();
							test.fail(name + ':updateAll:list expr', false, ex);
						}

						// remove
						model.changeOnlineStatus(Math.random() > 0.5);
						model.remove(7); // step 7-1
					}
				} else if (e.modifiers) {   // step 8-2
					assert.strictEqual(ret.length, 1, 'list page');
					assert.strictEqual(ret[0].name, 'Auto Man', 'list page');

					// remove
					model.changeOnlineStatus(Math.random() > 0.5);
					model.remove({'age' : {op : '>=', value : 20}});    // step 9-1
				} else {    // step 9-3
					try {
						assert.strictEqual(ret.length, 2);
						assert.strictEqual(ret[0].name, '优菜');

						model.changeOnlineStatus(true);
						setTimeout(old = function () {
							if (model._saved_data.length || model._updated_data.length) {
								setTimeout(old, 300);
							} else {
								model.destroy();
								test.success(name);
							}
						}, 300);
					} catch (ex) {
						model.destroy();
						test.fail(name + ':remove by age', false, ex);
					}
				}
			});
			model.on('updateAll', function (e) {
//				console.info('updateAll:after', e);
				if (e.data.level === 1) {   // step 5-2
					try {
						assert.strictEqual(e.count, 3);
					} catch (ex) {
						model.destroy();
						test.fail(name + ':updateAll', false, ex);
					}
					model.changeOnlineStatus(Math.random() > 0.5);
					model.list({level : 1});
				} else {    // step 6-2
					try {
						assert.strictEqual(e.count, 4);
					} catch (ex) {
						model.destroy();
						test.fail(name + ':updateAll', false, ex);
					}
					model.changeOnlineStatus(Math.random() > 0.5);
					model.list({'country' : ['China', 'Japan']});
				}
			});
			model.on('remove', function (e) {
//				console.info('remove:after', remote.enabled, e);
				if (e.id || e.lid) {
					model.changeOnlineStatus(Math.random() > 0.5);
					model[remote.enabled && e.id ? 'find' : 'findByLid'](7);    // step 7-2
				} else {
					model.changeOnlineStatus(Math.random() > 0.5);
					model.list();   // step 9-2
				}
			});
			model.on('initialized', function () {
				model.changeOnlineStatus(Math.random() > 0.5);
				model.save(mixin({}, data[0]));  // step 1-1
			});
			model.init();
			return false;
		}
	});
});