/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-08-26 18:26
 * Name     : dom/event.js
 */

/*global define */
define(function (require, exports, module) {
	'use strict';

	var global = define.global, isTrident = global.ActiveXObject !== undefined, isGecko = global.crypto !== undefined, isNewGecko = isGecko && global.crypto.alert === undefined, Event = global.Event, newEvent, doc = global.document, body = doc.body, html = doc.documentElement, stopPropagation, preventDefault, Events, EventMaps, KeyMaps, bubbles_re, cancelable_re, createEvent, customizeListeners, onpropertychange, seed = 0;

	if (doc.addEventListener) {
		try {
			if (global.MouseEvent) {
				newEvent = new global.MouseEvent('click', {clientX : 10});
				newEvent = newEvent.clientX === 10;
			}
		} catch (ignore) {}
		// check http://help.dottoro.com/larrqqck.php as reference
		Events = isTrident ? {
			'MessageEvent'  : /message/,
			'MutationEvent' : /Modified|Node/,
//			'MouseWheelEvent' : /wheel/,
			'DragEvent'     : /copy|cut|paste|drag/,
			'MouseEvent'    : /drag|drop|click|mouse(?!wheel)|menu/,
			'KeyboardEvent' : /key/,
			'FocusEvent'    : /focus|blur/,
			'UIEvent'       : /resize|scroll|select|activate/
			//'Event'           : /focus|input|change|submit|reset|error|readystatechange|load/
		} : {
			'MessageEvent'  : /message/,
			'MutationEvent' : /Modified|Node/,
//			'MouseScrollEvent' : isNewGecko ? /Scroll/ : /o_p/, // it can't be created by `createElement`
//			'WheelEvent'    : meta.Webkit ? /wheel/ : /o_p/,
			'DragEvent'     : isNewGecko ? /drag|drop/ : /o_p/,
			'MouseEvent'    : isNewGecko ? /click|mouse|menu/ : /drag|drop|click|[mM]ouse|menu/,
			'KeyboardEvent' : /key/,
			'UIEvent'       : /flow|Activate/
			//'Event'            : /blur|focus|input|select|resize|scroll|change|submit|reset|copy|cut|paste|error|readystatechange|load/
		};
		EventMaps = isTrident ? {'propertychange' : 'DOMAttrModified'} : {'activate' : 'DOMActivate'};
		if (isGecko) { EventMaps.mousewheel = 'DOMMouseScroll'; }
		KeyMaps = {
			3     : 13, // enter
			63234 : 37, // left
			63235 : 39, // right
			63232 : 38, // up
			63233 : 40, // down
			63276 : 33, // page up
			63277 : 34, // page down
			63272 : 46, // delete
			63273 : 36, // home
			63275 : 35  // end
		};
		bubbles_re = /line|error|load|select|input|focus|blur|change|submit|reset|enter|leave|scroll|flow|resize|Document|message/;
		cancelable_re = isTrident ? /line|load|activate|input|focus|blur|change|enter|leave|move|out|Modified|Node|scroll|flow|resize/ : /line|load|input|focus|blur|change|enter|leave|move|out|Modified|Node|scroll|flow|resize/;
		stopPropagation = function () { this._origin.stopPropagation(); };
		preventDefault = function () {
			if (this.cancelable) { this._origin.preventDefault(); }
		};
		createEvent = function (e) {
			var type = EventMaps[e.type] || e.type, bubbles = bubbles_re.test(type) ? false : e.bubbles !== false, cancelable = cancelable_re.test(type) ? false : e.cancelable !== false, view = e.view || global, detail = e.detail || 0, event;
			try {
				//noinspection IfStatementWithTooManyBranchesJS
				if (Events.DragEvent.test(type)) {
					event = doc.createEvent('DragEvent');
					event.initDragEvent(type, bubbles, cancelable, view, detail, e.screenX || 0, e.screenY || 0, e.clientX || 0, e.clientY || 0, e.ctrlKey === true, e.altKey === true, e.shiftKey === true, e.metaKey === true, e.button || 0, e.relatedTarget, e.dataTransfer);
				} else if (Events.MouseWheelEvent && Events.MouseWheelEvent.test(type)) {  // IE9+
					event = doc.createEvent('MouseWheelEvent');
					event.initMouseWheelEvent(type, bubbles, cancelable, view, detail, e.screenX || 0, e.screenY || 0, e.clientX || 0, e.clientY || 0, e.button || 0, e.relatedTarget, e.modifiers, e.wheelDelta);
				} else if (Events.MouseEvent.test(type)) {
					event = doc.createEvent('MouseEvent');
					event.initMouseEvent(type, bubbles, cancelable, view, detail, e.screenX || 0, e.screenY || 0, e.clientX || 0, e.clientY || 0, e.ctrlKey === true, e.altKey === true, e.shiftKey === true, e.metaKey === true, e.button || 0, e.relatedTarget);
				} else if (Events.KeyboardEvent.test(type)) {
					event = doc.createEvent('KeyboardEvent');
					if (isGecko) {
						event.initKeyEvent(type, bubbles, cancelable, view, e.ctrlKey === true, e.altKey === true, e.shiftKey === true, e.metaKey === true, e.keyCode || (e.key && e.key.charCodeAt(0)) || 0, e.charCode || 0);
					} else {
						//noinspection JSCheckFunctionSignatures
						event.initKeyboardEvent(type, bubbles, cancelable, view, e.key, e.location, e.modifiers || [e.ctrlKey ? 'Control' : '', e.shiftKey ? 'Shift' : '', e.altKey ? 'Alt' : '', e.metaKey ? 'Meta' : '', e.altGraphKey ? 'AltGraph' : ''].join(' ').replace(/\s*/, ''), e.repeat, e.locale);
					}
				} else if (Events.FocusEvent && Events.FocusEvent.test(type)) {   //IE9+
					event = doc.createEvent('FocusEvent');
					event.initFocusEvent(type, bubbles, cancelable, view, detail, e.relatedTarget);
				} else if (Events.WheelEvent && Events.WheelEvent.test(type)) {    //webkit
					event = doc.createEvent('WheelEvent');
					event.initUIEvent(type, bubbles, cancelable, view, detail);
				} else if (Events.UIEvent.test(type)) {
					event = doc.createEvent('UIEvent');
					event.initUIEvent(type, bubbles, cancelable, view, detail);
				} else if (Events.MutationEvent.test(type)) {
					event = doc.createEvent('MutationEvent');
					event.initMutationEvent(type, bubbles, cancelable, e.relatedNode, e.prevValue, e.newValue, e.attrName, e.attrChange);
				} else if (Events.MessageEvent.test(type)) {
					event = doc.createEvent('MessageEvent');
					event.initMessageEvent(type, bubbles, cancelable, e.data, e.origin || global.location.protocol + "//" + global.location.host, e.lastEventId || '1', e.source || global, e.ports);
				}
			} catch (ignore) {}
			if (!event) {
				event = doc.createEvent('Event');
				event.initEvent(type, bubbles, cancelable);
			}
			if (e.hasOwnProperty('userData')) {
				event.userData = e.userData;
			}
			return event;
		};
		exports = module.exports = {
			/**
			 * Registers an event handler for the specified event on set node.
			 *
			 * @param {HTMLElement|HTMLDocument}    node        The node object listen on, required.
			 * @param {string|Object}               name        Two formats of this argument, if 'string', the name of event to be listened for, required; or 'object' for multiple listeners, `{name1 : listener1, name2: listener2, ...}`, required.
			 * @param {Function}                    listener    The listener function, required.
			 * @param {boolean}                     useCapture  Listens on the 'capturing' phase or not.
			 */
			addEventListener : function (node, name, listener, useCapture) {
				var p;
				if (typeof name === 'object') { // multiple listeners
					for (p in name) {
						if (name.hasOwnProperty(p)) {
							node.addEventListener(p, name[p]);
						}
					}
				} else {
					node.addEventListener(name, listener, useCapture);
				}
				return this;
			},

			/**
			 * Removes the event handler for the specified event from set node.
			 *
			 * @param {HTMLElement|HTMLDocument}    node        The node object listen on, required.
			 * @param {string}                      name        The name of event to be listened for, required.
			 * @param {Function}                    listener    The listener function, required.
			 * @param {boolean}                     useCapture  This should be as same as set when `addEventListener` called.
			 */
			removeEventListener : function (node, name, listener, useCapture) {
				node.removeEventListener(name, listener, useCapture);   // useCapture MUST be same as set on 'addEventListener'
				return this;
			},

			/**
			 * Dispatches the event from the specified target node in the event object.
			 *
			 *
			 * @param {Object}          node    The node object dispatches the event, use `e.target` if ignored.
			 * @param {string}          name    The name of event, use `e.type` if ignored.
			 * @param {Object|Event}    e       The event object to be dispatched, common `Event` object or plain object includes the event properties, required.
			 */
			dispatchEvent : function (node, name, e) {
				if (e) {
					try {
						//noinspection JSHint
						e['target'] = node;
						e.type = name;
					} catch (ignore) {}
				} else if (name) {
					e = name;
					try {
						e[typeof node === 'string' ? 'type' : 'target'] = node;
					} catch (ignore) {}
				} else {
					e = node;
				}
				e.target.dispatchEvent(e instanceof Event ? e : exports.createEvent(e));
				return this;
			},

			/**
			 * Creates an Event object based on the set object.
			 *
			 * @param {Object}  e   The plain object includes the event properties, required.
			 */
			createEvent : newEvent ? function (e) {
				var type = EventMaps[e.type] || e.type, p, event;
				e.type = type;
				e.bubbles = bubbles_re.test(type) ? false : e.bubbles !== false;
				e.cancelable = cancelable_re.test(type) ? false : e.cancelable !== false;
				try {
					for (p in Events) {
						if (Events.hasOwnProperty(p) && Events[p].test(type)) {
							if (global.hasOwnProperty(p)) {
								event = new global[p](type, e);
								if (e.hasOwnProperty('userData')) {
									event.userData = e.userData;
								}
								return event;
							}
							break;
						}
					}
					//noinspection JSClosureCompilerSyntax
					event = new Event(type, e);
					if (e.hasOwnProperty('userData')) {
						event.userData = e.userData;
					}
					return event;
				} catch (ignore) {
					return createEvent(e);
				}
			} : createEvent,

			/**
			 * Returns a wrapped event object which contains the origin event, to provide unique structure on different browsers.
			 *
			 * @param {Event}   e   The origin event object.
			 */
			getEvent : function (e) //noinspection JSLint
			{
				var obj = {_origin : e}, p, re = /^[a-z]/;
				for (p in e) {
					//noinspection JSUnfilteredForInLoop
					if (re.test(p) && typeof e[p] !== 'function') {
						//noinspection JSUnfilteredForInLoop
						obj[p] = e[p];
					}
				}
				// properties are readonly in event
				p = e.target;
				if (p.nodeType !== 1) { // old Safari
					obj.target = p.parentNode;
				}
				p = e.relatedTarget;
				if (p && p.nodeType !== 1) {
					obj.relatedTarget = p.parentNode;
				}
				obj.button = 3 === +e.which ? 2 : e.which;
				obj.preventDefault = preventDefault;
				obj.stopPropagation = stopPropagation;
				if (!e.pageX || !e.screenX || e.screenY - e.screenX !== e.clientY - e.clientX) {    // IE9, or dispatch events on webkit
					obj.pageX = e.clientX + body.scrollLeft + html.scrollLeft;
					obj.pageY = e.clientY + body.scrollTop + html.scrollTop;
				}
				p = obj.keyCode;
				if (KeyMaps[p]) {
					obj.keyCode = KeyMaps[p];
				}
				return obj;
			}
		};
	} else {    // IE8-
		stopPropagation = function () {
			//noinspection JSUnusedGlobalSymbols
			this.cancelBubble = this._origin.cancelBubble = true;
		};
		preventDefault = function () {
			if (this.cancelable !== undefined) {
				//noinspection JSUnusedGlobalSymbols
				this.returnValue = this._origin.returnValue = false;
			}
		};
		customizeListeners = {};
		onpropertychange = function (e) {
			e = e || global.event;
			var target = e.target, expando = target.__expando, listeners, i, l;
			if (expando && ( listeners = customizeListeners[expando]) && ( listeners = listeners[e.expandoType])) {
				for (e = exports.getEvent(e), i = 0, l = listeners.length; i < l; i += 1) {
					listeners[i].call(target, e);
				}
			}
		};
		exports = module.exports = {
			/**
			 * Registers an event handler for the specified event on set node.
			 *
			 * @param {HTMLElement|HTMLDocument}    node        The node object listen on, required.
			 * @param {string|Object}               name        Two formats of this argument, if 'string', the name of event to be listened for, required; or 'object' for multiple listeners, `{name1 : listener1, name2: listener2, ...}`, required.
			 * @param {Function}                    listener    The listener function, required.
			 * @param {boolean}                     useCapture  Listens on the 'capturing' phase or not, optional.
			 */
			addEventListener : function (node, name, listener, useCapture) {
				var expando, p, listeners;
				if (typeof name === 'object') { // multiple listeners
					for (p in name) {
						if (name.hasOwnProperty(p)) {
							this.addEventListener(node, p, name[p], null);
						}
					}
					return this;
				}
				// IE8- don't support customize event, use `onpropertychange` instead
				if (node['on' + name] === undefined) {
					expando = node.__expando;
					if (!expando) {
						//noinspection JSUndefinedPropertyAssignment
						expando = node.__expando = seed += 1;
						node.attachEvent('onpropertychange', onpropertychange);
					}
					listeners = customizeListeners[expando] || (customizeListeners[expando] = {});
					p = listeners[name];
					if (p) {
						p.push(listener);
					} else {
						listeners[name] = [listener];
					}
				} else {
					node.attachEvent('on' + name, listener);
				}
				if (useCapture) { node.setCapture(); }
				return this;
			},

			/**
			 * Removes the event handler for the specified event from set node.
			 *
			 * @param {HTMLElement|HTMLDocument}    node        The node object listen on, required.
			 * @param {string}                      name        The name of event to be listened for, required.
			 * @param {Function}                    listener    The listener function, required.
			 * @param {boolean}                     useCapture  This should be as same as set when `addEventListener` called.
			 */
			removeEventListener : function (node, name, listener, useCapture) {
				if (node['on' + name] === undefined) {
					var expando = node.__expando, listeners, l;
					if (expando && (listeners = customizeListeners[expando]) && (listeners = listeners[name]) && (l = listeners.length)) {
						while (l) {
							if (listeners[l -= 1] === listener) {
								listeners.splice(l, 1);
								break;
							}
						}
					}
				} else {
					node.detachEvent('on' + name, listener);
				}
				if (useCapture) { node.releaseCapture(); }
			},

			/**
			 * Dispatches the event from the specified target node in the event object.
			 *
			 * @param {Event|Object}    e   The event object to be dispatched, common `Event` object or plain object includes the event properties, required.
			 */
			dispatchEvent : function (e) {
				// to be noticed, 'fireEvent' does not trigger default action like 'dispatchEvent'
				var target = e.srcElement || e.target;
				target.fireEvent(target['on' + e.type] === undefined ? 'onpropertychange' : 'on' + e.type, global.Event && e instanceof Event ? e : exports.createEvent(e));   // no 'Event' object in IE7-
			},

			/**
			 * Creates an Event object based on the set object.
			 *
			 * @param {Object}  e   The plain object includes the event properties, required.
			 */
			createEvent : function (e) {
				var event = doc.createEventObject(global.event), p = e.target;
				if (p['on' + e.type] === undefined) {
					event.type = 'propertychange';
					event.expandoType = e.type;
					delete e.type;
				}
				for (p in e) {
					if (e.hasOwnProperty(p)) {
						event[p] = e[p];
					}
				}
				return event;
			},

			/**
			 * Returns a wrapped event object which contains the origin event, to provide unique structure on different browsers.
			 *
			 * @param {Event}   e   The origin event object.
			 */
			getEvent : function (e) {
				if (!e) { e = global.event; }
				if (e._origin) { return e; }
				var obj = {}, p, re = /^[a-z]/;
				//noinspection JSHint
				for (p in e) {
					//noinspection JSUnfilteredForInLoop
					if (re.test(p) && typeof e[p] !== 'function') {
						//noinspection JSUnfilteredForInLoop
						obj[p] = e[p];
					}
				}
				if (e.expandoType) {
					obj.type = e.expandoType;
				}
				obj._origin = e;
				// properties are readonly in event
				obj.target = e.srcElement;
				//noinspection FallthroughInSwitchStatementJS
				switch (e.type) {
					case 'mouseover':
						obj.relatedTarget = e.fromElement;
						break;
					case 'mouseout':
						obj.relatedTarget = e.toElement;
						break;
					case 'mousedown':
					case 'mouseup':
						obj.which = e.button & 1 ? 1 : e.button & 2 ? 3 : e.button & 4;
						break;
					case 'keypress':    // see http://www.quirksmode.org/js/keys.html
						obj.charCode = e.keyCode;
						break;
				}
				if (e.clientX) {    // http://www.quirksmode.org/mobile/tableViewport_desktop.html
					obj.pageX = e.clientX + body.scrollLeft + html.scrollLeft;
					obj.pageY = e.clientY + body.scrollTop + html.scrollTop;
				}
				obj.preventDefault = preventDefault;
				obj.stopPropagation = stopPropagation;
				return obj;
			}
		};
	}
	exports.on = exports.addEventListener;
	exports.off = exports.removeEventListener;
	exports.trigger = exports.dispatchEvent;
});
