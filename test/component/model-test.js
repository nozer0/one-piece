/*global define */
define(function (require) {
	//noinspection JSUnusedGlobalSymbols
	var assert = require('util/assert'), Model = require('component/model').Model, CacheStore = require('component/store/cache').Store, AjaxStore = require('component/store/ajax').Store,
		test = require('util/test').run({
			name                : 'model',
			setUp               : function () {
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
				this.models = [];
			},
			tearDown            : function () {
				for (var models = this.models, i = 0, l = models.length; i < l; i += 1) {
					try {
						models[i].destroy();
					} catch (ignore) {}
				}
			},
			_testSync           : function (model) {
				var data = this.data, i = 0, l = data.length - 1, ret;
				this.models.push(model.init());
				// save
				while (i <= l) {
					assert.strictEqual(model.save(data[i]).id, i += 1, 'create');
				}

				// update
				assert.strictEqual(model.find(2).sex, 'male', 'update');
				model.save({id : 2, sex : 'female'});
				assert.strictEqual(model.find(2).sex, 'female', 'update');

				// find
				ret = model.find(5);
				delete ret.id;
				delete ret.level;
				delete ret.__timestamp;
				delete data[4].__timestamp;
				assert.deepEqual(ret, data[4], 'find');

				// list
				ret = model.list([
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
				assert.strictEqual(model.updateAll({level : 1}, {country : 'USA'}), 3, 'updateAll');
				assert.strictEqual(model.list({level : 1}).length, 3, 'updateAll');

				assert.strictEqual(model.updateAll({level : {expr : 'age % 5 + 1'}}, {'country' : ['China', 'Japan']}), 4, 'updateAll expr');
				ret = model.list({'country' : {op : 'in', value : ['China', 'Japan']}});
				assert.strictEqual(ret.length, 4, 'updateAll expr');
				assert.strictEqual(ret[0].level, 3, 'updateAll expr');
				assert.strictEqual(ret[3].level, 5, 'updateAll expr');

				// remove
				model.remove(7);
				assert.equal(model.find(7), null, 'remove');

				// list
				ret = model.list(null, {page : -1, limit : 3, offset : 1, order : 'country'});
				assert.strictEqual(ret.length, 1, 'list page');
				assert.strictEqual(ret[0].name, 'Auto Man', 'list page');

				model.remove({'age' : {op : '>=', value : 20}});
//				assert.strictEqual(ret.length, 6, 'remove');
				ret = model.list();
				assert.strictEqual(ret.length, 2);
				assert.strictEqual(ret[0].name, '优菜', 'remove all');
			},
			_testAsync          : function (model, name) {
				var data = this.data;
				this.models.push(model);
				model.onError = function (e) {
					test.fail(name, null, Model.ERRORS[e.code] || String(e));
				};
				model.on('save:create', function (e) {
					var d = e.data, id = e.id;
					if (id < 0 || id > 9) {
						test.fail(name + ':save', false, 'actual : ' + id);
					}
					try {
						assert.strictEqual(d.name, data[id - 1].name);
						model.save(id === 9 ? {id : 2, sex : 'female'} : data[id]);
					} catch (ex) {
						test.fail(name + ':save', false, ex);
					}
				});
				model.on('save:update', function (e) {
					var id = e.data.id;
					if (id !== 2) {
						test.fail(name + ':update', false, {actual : id, expected : 2});
					}
					model.find(2);

					// find
					model.find(5);

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
					var d = e.data, id = e.id;
					if (id === 2) {
						try {
							assert.strictEqual(d.name, 'Han Mei');
							assert.strictEqual(d.sex, 'female');
						} catch (ex) {
							test.fail(name + ':update', false, ex);
						}
					} else if (id === 5) {
						try {
							assert.strictEqual(d.name, data[4].name);
							assert.strictEqual(d.age, data[4].age);
						} catch (ex) {
							test.fail(name + ':find', false, ex);
						}
					} else if (id === 7) {
						try {
							assert.equal(d);
						} catch (ex) {
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
					if (e.conditions) {
						if (e.modifiers) {
							try {
								assert.strictEqual(ret.length, 4);
								assert.strictEqual(ret[0].name, 'Lily');
								assert.strictEqual(ret[2].name, '(ˇˍˇ）');
								assert.strictEqual(ret[3].name, '葵');
							} catch (ex) {
								test.fail(name + ':list', false, ex);
							}
						} else if (e.conditions.level) {
							try {
								assert.strictEqual(ret.length, 3);
							} catch (ex) {
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
								test.fail(name + ':updateAll expr', false, ex);
							}

							// remove
							model.remove(7);
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
							test.success(name);
						} catch (ex) {
							test.fail(name + ':remove all', false, ex);
						}
					}
				});
				model.on('updateAll', function (e) {
					if (e.data.level === 1) {
						try {
							assert.strictEqual(e.count, 3);
						} catch (ex) {
							test.fail(name + ':updateAll', false, ex);
						}
						model.list({level : 1});
					} else {
						try {
							assert.strictEqual(e.count, 4);
						} catch (ex) {
							test.fail(name + ':updateAll expr', false, ex);
						}
						model.list({'country' : ['China', 'Japan']});
					}
				});
				model.on('remove', function (e) {
					if (e.id) {
						model.find(7);
					} else {
						model.list();
					}
				});
				model.on('initialized', function () {
					model.save(data[0]);
				});
				model.init();
				return false;
			},
			testLocalOnlyModel  : function () {
				this._testSync(new Model({
					name        : 'people',
					fields      : this.fields,
					local_store : new CacheStore()
				}));
			},
			testRemoteOnlyModel : function () {
				var model = new Model({
					name         : 'people',
					fields       : this.fields,
					remote_store : new AjaxStore({host : 'store/store-test.php'})
				});
				this._testSync(model);
				model.destroy();
				this.models.pop();
			},
			testSyncModel       : function () {
				var model = new Model({
					name         : 'people',
					fields       : this.fields,
					local_store  : new CacheStore(),
					remote_store : new AjaxStore({host : 'store/store-test.php'})
				});
				this._testSync(model);
				model.destroy();
				this.models.pop();
			},
			testAsyncModel      : function () {
				return this._testAsync(new Model({
					name         : 'people',
					fields       : this.fields,
					async        : true,
					local_store  : new CacheStore(),
					remote_store : new AjaxStore({host : 'store/store-test.php'})
				}), 'testAsyncModel');
			}
		});
});