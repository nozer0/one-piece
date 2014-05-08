/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-11-11 18:07
 * Name     : util/observable.js
 */

/*global define */
define(function (require, exports) {

	var cache = {}, events = [], seed = 0, timer, setProperty;

	function on(name, observer) {
		var expando, observers, p;
		if (typeof name === 'object') {
			for (p in name) {
				if (name.hasOwnProperty(p) && (observer = name[p])) {
					on.call(this, p, observer);
				}
			}
			return this;
		}
		if (!observer) { return this; }
		expando = this.__expando;
		if (!expando) {
			try {
				Object.defineProperty(this, '__expando', {value : expando = seed += 1});
			} catch (ignore) {
				expando = this.__expando = seed += 1;
			}
		}
		observers = cache[expando] || (cache[expando] = {});
		p = observers[name];
		if (p) {
			p.push(observer);
		} else {
			observers[name] = [observer];
		}
		return this;
	}

	function off(name, observer) {
		var expando = this.__expando, observers, l;
		if (expando && (observers = cache[expando])) {
			if (!observer) {
				delete observers[name];
			} else if ((observers = observers[name]) && (l = observers.length)) {
				while (l) {
					if (observers[l -= 1] === observer) {
						observers.splice(l, 1);
						break;
					}
				}
			}
		}
		return this;
	}

	function dispatch() {
		var os = events, i = 0, l = os.length, o, observers, e, ctx, j, m;
		// new event may be triggered when observer executed
		for (events = []; i < l; i += 1) {
			for (o = os[i], observers = o[0], e = o[1], ctx = o[2], j = 0, m = observers.length; j < m; j += 1) {
				try {
					if (observers[j].call(ctx, e) === false) { return false; }
				} catch (ex) {
					if (console && console.error) { console.error(ex); }
				}
			}
		}
		timer = events.length ? setTimeout(dispatch, 0) : null;
	}

	function flush() {
		while (events.length) {
			dispatch();
		}
	}

	function trigger(name, e, blocking) {
		var expando, objs, observers, i, l;
		if (!(expando = this.__expando) || !(objs = cache[expando])) {
			return this;
		}
		if (typeof name !== 'string') {    // e, blocking
			blocking = e;
			e = name;
			name = e.type;
		}
		observers = objs[name] || [];
		// if the set type is like 'xxx:yyy', notifies the observers of 'xxx' event too
		i = name.indexOf(':');
		if (i > 0) {
			i = name.substr(0, i);
			if (objs.hasOwnProperty(i)) {
				observers.push.apply(observers, objs[i]);
			}
		}
		l = observers.length;
		if (l) {
			if (e.type !== name) {
				try {
					e.type = name;
				} catch (ignore) {}
			}
			if (!e.target) {
				try {
					e.target = this;
				} catch (ignore) {}
			}
			if (blocking) {
				// do not use `setTimeout` to simulate asynchronization because predict triggers are needed sometimes
				for (i = 0; i < l; i += 1) {
					try {
						if (observers[i].call(this, e) === false) { return false; }
					} catch (ex) {
						if (console && console.error) { console.error(ex); }
					}
				}
			} else {
				events.push([observers, e, this]);
				if (!timer) { timer = setTimeout(dispatch, 0); }
			}
		}
		return this;
	}

	/**
	 * Registers an event handler for the specified event on set object.
	 *
	 * @param {Object}          obj         The object to be observed, required.
	 * @param {string|Object}   name        Two formats of this argument, if 'string', the name of event observed, required; or 'object' for multiple observers, `{name1 : observer1, name2: observer2, ...}`, required.
	 * @param {Function}        observer    The observer function, required.
	 */
	exports.on = function (obj, name, observer) {
		return on.call(obj, name, observer);
	};

	/**
	 * Removes the event handler for the specified event from set node.
	 *
	 * @param {Object}      obj         The object to be observed, required.
	 * @param {string}      name        The name of event to be observed, required.
	 * @param {Function}    observer    The observer function, required if obj is `HTMLElement|HTMLDocument`.
	 */
	exports.off = function (obj, name, observer) {
		return off.call(obj, name, observer);
	};

	/**
	 * Dispatches the event from the specified target node in the event object.
	 *
	 * @param {Object}  obj         The object fires the event, use `e.target` if ignored.
	 * @param {string}  name        The name of trigger event, use `e.type` if ignored.
	 * @param {Object}  e           The event object to be dispatched includes the event properties, required.
	 * @param {boolean} blocking    Block until all observers finish execution, default is false.
	 */
	exports.trigger = function (obj, name, e, blocking) {
		if (!name || typeof name === 'boolean') {    // obj | obj, blocking
			e = name;
			name = obj;
			//noinspection JSUnresolvedVariable
			obj = name.target;
		}
		return trigger.call(obj, name, e, blocking);
	};

	/**
	 * Dispatches all cached events.
	 */
	exports.flush = flush;

	/**
	 * Adds the `on`, `off` and `trigger` methods to the set `obj`, makes it observable.
	 *
	 * @param {Object}  obj     The object to be observed, required.
	 */
	exports.observable = function (obj) {
		obj.on = on;
		obj.off = off;
		obj.trigger = trigger;
		obj.flush = flush;
		return obj;
	};

	setProperty = Object.defineProperty ? function (obj, field, current, backup) {  // modern browsers
		current[field] = obj[field];
		try {
			Object.defineProperty(obj, field, {
				configurable : true,
				enumerable   : true,
				set          : function (val) {
					var e = {old : current[field], value : val};
					if (this.trigger('beforeSet:' + field, e, true) !== false) {
						backup[field] = e.old;
						current[field] = e.value;
						this.trigger('set:' + field, e);
					}
				},
				get          : function () { return current[field]; }
			});
			return true;
		} catch (ignore) {}   // IE8 only support for native or fake DOM object
	} : Object.__defineSetter__ ? function (obj, field, current, backup) {    // FF4-
		current[field] = obj[field];
		obj.__defineSetter__(field, function (val) {
			var e = {old : current[field], value : val};
			if (this.trigger('beforeSet:' + field, e, true) !== false) {
				backup[field] = e.old;
				current[field] = e.value;
				this.trigger('set:' + field, e);
			}
		});
		obj.__defineGetter__(field, function () { return current[field]; });
		return true;
	} : null;    // IE7-, can be simulated using `onPropertyChange` initEvent listeners for fake DOM object

	/**
	 * Adds the `on`, `off`, `trigger` and `reset` methods to the set `obj`, and redefine the properties.
	 * When set property like `o.x = 1`, it will trigger `beforeSet:x` event before set property, and `set:x` event after set. For old browsers do not support `setter` define, please use `set(field, value)` method instead.
	 *
	 * @param {Object}  obj     The object to be observed, required.
	 */
	exports.settable = function (obj) {
		var current, backup = {}, p, t = setProperty;
		if (t) {
			current = {};
			for (p in obj) {
				if (obj.hasOwnProperty(p) && typeof obj[p] !== 'function') {
					if (!t(obj, p, current, backup)) {
						t = false;
						break;
					}
				}
			}
		}
		if (!t) {    // need to add `set` method
			obj.set = function (field, val) {
				var e = {old : this[field], value : val};
				if (this.trigger('beforeSet:' + field, e, true) !== false) {
					backup[field] = e.old;
					this[field] = e.value;
					this.trigger('set:' + field, e);
				}
				current = this;
			};
		}
		obj.on = on;
		obj.off = off;
		obj.trigger = trigger;
		obj.reset = function (data) {
			var p, old = {}, e;
			if (this.trigger('beforeReset', e = {old : current, current : data || backup}, true) !== false) {
				data = e.current;
				for (p in data) {
					if (data.hasOwnProperty(p)) {
						old[p] = current[p];
						current[p] = data[p];
					}
				}
				this.trigger('reset', {old : old, current : current});
				return true;
			}
		};
		return obj;
	};
});
