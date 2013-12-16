/*global define */
define(function (require) {
	//noinspection JSUnusedGlobalSymbols,JSUnresolvedVariable
	var global = define.global || window, assert = require('util/assert'), CacheStore = require('component/store/cache').Store, IndexedDBStore = require(global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB ? 'component/store/indexedDB' : 'util/uri').Store, SqlDBStore = require(global.openDatabase ? 'component/store/sqlDB' : 'util/uri').Store, AjaxStore = require('component/store/ajax').Store,
		test = require('util/test').run({
			name          : 'store',
			setUp         : function () {
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
				this.stores = [];
			},
			tearDown      : function () {
				for (var stores = this.stores, i = 0, l = stores.length; i < l; i += 1) {
					try {
						stores[i].destroy();
					} catch (ignore) {}
				}
			},
			_testSync     : function (store) {
				var data = this.data, i = 0, l = data.length - 1, ret;
				this.stores.push(store.init());
				// save
				while (i <= l) {
					assert.strictEqual(store.save(data[i]).id, i += 1, 'create');
				}

				// update
				assert.strictEqual(store.find(2).sex, 'male', 'update');
				store.save({id : 2, sex : 'female'});
				assert.strictEqual(store.find(2).sex, 'female', 'update');

				// find
				ret = store.find(5);
				delete ret.id;
				delete ret.level;
				assert.deepEqual(ret, data[4], 'find');

				// list
				ret = store.list([
					{sex : 'female', 'age' : {op : '<', value : 22}},
					{'country' : {op : 'like', value : '%11'}}
				], {
					offset : 1,
					limit  : 4,
					order  : 'age desc'
				});
				assert.strictEqual(ret.length, 4, 'list');
				assert.strictEqual(ret[0].name, 'Lily', 'list');
				assert.strictEqual(ret[2].name, '(ˇˍˇ）', 'list');
				assert.strictEqual(ret[3].name, '葵', 'list');

				// updateAll
				assert.strictEqual(store.updateAll({level : 1}, {country : 'USA'}), 3, 'updateAll');
				assert.strictEqual(store.list({level : 1}).length, 3, 'updateAll');

				assert.strictEqual(store.updateAll({level : {expr : 'age % 5 + 1'}}, {'country' : ['China', 'Japan']}), 4, 'updateAll expr');
				ret = store.list({'country' : {op : 'in', value : ['China', 'Japan']}});
				assert.strictEqual(ret.length, 4, 'updateAll expr');
				assert.strictEqual(ret[0].level, 3, 'updateAll expr');
				assert.strictEqual(ret[3].level, 5, 'updateAll expr');

				// remove
				store.remove(7);
				assert.equal(store.find(7), null, 'remove');

				// list
				ret = store.list(null, {page : -1, limit : 3, offset : 1, order : 'country'});
				assert.strictEqual(ret.length, 1, 'list page');
				assert.strictEqual(ret[0].name, 'Auto Man', 'list page');

				store.remove({'age' : {op : '>=', value : 20}});
//				assert.strictEqual(ret.length, 6, 'remove');
				ret = store.list();
				assert.strictEqual(ret.length, 2);
				assert.strictEqual(ret[0].name, '优菜', 'remove all');
			},
			_testAsync    : function (store, name) {
				var data = this.data, error;
				this.stores.push(store);
				store.on('error', function (e) {
					test.fail(name, null, store.constructor.ERRORS[e.code] || String(e));
				});
				store.on('save:create', function (e) {
					var d = e.data, id = e.id;
					if (id < 0 || id > 9) {
						error = true;
						test.fail(name + ':save', false, {actual : id});
					}
					try {
						assert.strictEqual(d.name, data[id - 1].name);
						store.save(id === 9 ? {id : 2, sex : 'female'} : data[id]);
					} catch (ex) {
						error = true;
						test.fail(name + ':save', false, ex);
					}
				});
				store.on('save:update', function () {
					store.find(2);

					// find
					store.find(5);

					// list
					store.list([
						{sex : 'female', age : {op : '<', value : 22}},
						{'country' : {op : 'like', value : '%11'} }
					], {
						offset : 1,
						limit  : 4,
						order  : 'age desc'
					});

					// updateAll
					store.updateAll({level : 1}, {country : 'USA'});
				});
				store.on('find', function (e) {
					var d = e.data, id = e.id;
					if (id === 2) {
						try {
							assert.strictEqual(d.name, 'Han Mei');
							assert.strictEqual(d.sex, 'female');
						} catch (ex) {
							error = true;
							test.fail(name + ':update', false, ex);
						}
					} else if (id === 5) {
						try {
							assert.strictEqual(d.name, data[4].name);
							assert.strictEqual(d.age, data[4].age);
						} catch (ex) {
							error = true;
							test.fail(name + ':find', false, ex);
						}
					} else if (id === 7) {
						try {
							assert.equal(d);
						} catch (ex) {
							error = true;
							test.fail(name + ':remove', false, ex);
						}

						// list
						store.list(null, {page : -1, limit : 3, offset : 1, order : 'country'});
					}
				});
				store.on('list', function (e) {
					var ret = e.data;
					if (e.conditions) {
						if (e.modifiers) {
							try {
								assert.strictEqual(ret.length, 4);
								assert.strictEqual(ret[0].name, 'Lily');
								assert.strictEqual(ret[2].name, '(ˇˍˇ）');
								assert.strictEqual(ret[3].name, '葵');
							} catch (ex) {
								error = true;
								test.fail(name + ':list', false, ex);
							}
						} else if (e.conditions.level) {
							try {
								assert.strictEqual(ret.length, 3);
							} catch (ex) {
								error = true;
								test.fail(name + ':updateAll', false, ex);
							}

							// updateAll
							store.updateAll({level : {expr : 'age % 5 + 1'}}, {'country' : ['China', 'Japan']});
						} else {
							try {
								assert.strictEqual(ret.length, 4, 'updateAll expr');
								assert.strictEqual(ret[0].level, 3, 'updateAll expr');
								assert.strictEqual(ret[3].level, 5, 'updateAll expr');
							} catch (ex) {
								error = true;
								test.fail(name + ':updateAll expr', false, ex);
							}

							// remove
							store.remove(7);
						}
					} else if (e.modifiers) {
						assert.strictEqual(ret.length, 1, 'list page');
						assert.strictEqual(ret[0].name, 'Auto Man', 'list page');

						// remove
						store.remove({'age' : {op : '>=', value : 20}});
					} else {
						try {
							assert.strictEqual(ret.length, 2);
							assert.strictEqual(ret[0].name, '优菜');
							if (!error) { test.success(name); }
						} catch (ex) {
							test.fail(name + ':remove all', false, ex);
						}
					}
				});
				store.on('updateAll', function (e) {
					if (e.data.level === 1) {
						try {
							assert.strictEqual(e.count, 3);
						} catch (ex) {
							test.fail(name + ':updateAll', false, ex);
						}
						store.list({level : 1});
					} else {
						try {
							assert.strictEqual(e.count, 4);
						} catch (ex) {
							test.fail(name + ':updateAll expr', false, ex);
						}
						store.list({'country' : ['China', 'Japan']});
					}
				});
				store.on('remove', function (e) {
					if (e.id) {
						store.find(7);
					} else {
						store.list();
					}
				});
				store.on('initialized', function () {
					store.save(data[0]);
				});
				store.init();
				return false;
			},
			testCache     : function () {
				this._testSync(new CacheStore({fields : this.fields}));
			},
			testIndexedDB : IndexedDBStore && function () {
				return this._testAsync(new IndexedDBStore({name : 'people', fields : this.fields}), 'testIndexedDB');
			},
			testSqlDB     : SqlDBStore && function () {
				return this._testAsync(new SqlDBStore({name : 'people', fields : this.fields}), 'testSqlDB');
			},
			testSyncAjax  : function () {
				var store = new AjaxStore({
					name   : 'people',
					fields : this.fields,
					async  : false,
					host   : 'store-test.php'
				});
				this._testSync(store);
				store.destroy();
				this.stores.pop();
			},
			testAsyncAjax : function () {
				return this._testAsync(new AjaxStore({
					name   : 'people',
					fields : this.fields,
					host   : 'store-test.php'
				}), 'testAsyncAjax');
			}
		});
});
