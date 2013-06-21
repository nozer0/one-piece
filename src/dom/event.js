/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-22 00:50
 * Name     : dom/event.js
 */

/*global define, CustomEvent */
define(function (require, exports, module) {
	'use strict';

	var global = define.global, isTrident = global.ActiveXObject !== undefined, isGecko = global.crypto !== undefined, isNewGecko = isGecko && global.crypto.alert === undefined, Event = global.Event, newEvent, doc = global.document, body = doc.body, html = doc.documentElement, stopPropagation, preventDefault, Events, EventMaps, KeyMaps, bubbles_re, cancelable_re;

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
			//'Event'            : /blur|focus|input|select|resize|scoll|change|submit|reset|copy|cut|paste|error|readystatechange|load/
		};
		EventMaps = isTrident ? {'propertychange' : 'DOMAttrModified'} : {'activate' : 'DOMActivate'};
		if (isGecko) {
			EventMaps.mousewheel = 'DOMMouseScroll';
		}
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
			if (this.cancelable) {
				this._origin.preventDefault();
			}
		};
		exports = module.exports = {
			addEventListener    : function (node, name, listener, useCapture) {
				return node.addEventListener(name, listener, useCapture);
			},
			removeEventListener : function (node, name, listener, useCapture) {
				return node.removeEventListener(name, listener, useCapture);   // useCapture MUST be same as set on 'addEventListener'
			},
			dispatchEvent       : function (e) {
				return e.target.dispatchEvent(e instanceof Event ? e : exports.createEvent(e));
			},
			createEvent         : newEvent ? function (e) {
				var type = EventMaps[e.type] || e.type, p;
				e.type = type;
				e.bubbles = bubbles_re.test(type) ? false : e.bubbles !== false;
				e.cancelable = cancelable_re.test(type) ? false : e.cancelable !== false;
				//noinspection EmptyCatchBlockJS
				try {
					for (p in Events) {
						if (Events.hasOwnProperty(p) && Events[p].test(type)) {
							if (global.hasOwnProperty(p)) {
								return new global[p](type, e);
							}
							break;
						}
					}
					return new Event(type, e);
				} catch (ignore) {}
			} : function (e) {
				var type = EventMaps[e.type] || e.type, bubbles = bubbles_re.test(type) ? false : e.bubbles !== false, cancelable = cancelable_re.test(type) ? false : e.cancelable !== false, view = e.view || global, detail = e.detail || 0, event;
				//noinspection EmptyCatchBlockJS
				try {
					if (Events.DragEvent.test(type)) {
						event = doc.createEvent('DragEvent');
						event.initDragEvent(type, bubbles, cancelable, view, detail, e.screenX || 0, e.screenY || 0, e.clientX || 0, e.clientY || 0, e.ctrlKey === true, e.altKey === true, e.shiftKey === true, e.metaKey === true, e.button || 0, e.relatedTarget, e.dataTransfer);
						return event;
					}
					if (Events.MouseWheelEvent && Events.MouseWheelEvent.test(type)) {  // IE9+
						event = doc.createEvent('MouseWheelEvent');
						event.initMouseWheelEvent(type, bubbles, cancelable, view, detail, e.screenX || 0, e.screenY || 0, e.clientX || 0, e.clientY || 0, e.button || 0, e.relatedTarget, e.modifiers, e.wheelDelta);
						return event;
					}
					if (Events.MouseEvent.test(type)) {
						event = doc.createEvent('MouseEvent');
						event.initMouseEvent(type, bubbles, cancelable, view, detail, e.screenX || 0, e.screenY || 0, e.clientX || 0, e.clientY || 0, e.ctrlKey === true, e.altKey === true, e.shiftKey === true, e.metaKey === true, e.button || 0, e.relatedTarget);
						return event;
					}
					if (Events.KeyboardEvent.test(type)) {
						event = doc.createEvent('KeyboardEvent');
						if (isGecko) {
							event.initKeyEvent(type, bubbles, cancelable, view, e.ctrlKey === true, e.altKey === true, e.shiftKey === true, e.metaKey === true, e.keyCode, e.charCode);
						} else {
							event.initKeyboardEvent(type, bubbles, cancelable, view, e.key, e.location, e.modifiers, e.repeat, e.locale);
						}
						return event;
					}
					if (Events.FocusEvent && Events.FocusEvent.test(type)) {   //IE9+
						event = doc.createEvent('FocusEvent');
						event.initFocusEvent(type, bubbles, cancelable, view, detail, e.relatedTarget);
						return event;
					}
					if (Events.WheelEvent && Events.WheelEvent.test(type)) {    //webkit
						event = doc.createEvent('WheelEvent');
						event.initUIEvent(type, bubbles, cancelable, view, detail);
						return event;
					}
					if (Events.UIEvent.test(type)) {
						event = doc.createEvent('UIEvent');
						event.initUIEvent(type, bubbles, cancelable, view, detail);
						return event;
					}
					if (Events.MutationEvent.test(type)) {
						event = doc.createEvent('MutationEvent');
						event.initUIEvent(type, bubbles, cancelable, e.relatedNode, e.prevValue, e.newValue, e.attrName, e.attrChange);
						return event;
					}
					if (Events.MessageEvent.test(type)) {
						event = doc.createEvent('MessageEvent');
						event.initMessageEvent(type, bubbles, cancelable, e.data, e.origin, e.lastEventId, e.source, e.ports);
						return event;
					}
					event = doc.createEvent('Event');
					event.initEvent(type, bubbles, cancelable);
					return event;
				} catch (ignore) {}
			},
			/**
			 * Return a wrap event object which contains the origin event
			 * @param {Event}   e   the origin event
			 */
			getEvent            : function (e) //noinspection JSLint
			{
				var obj = {_origin : e}, p, re = /^[a-z]/;
				//noinspection JSHint
				for (p in e) {
					//noinspection JSUnfilteredForInLoop
					if (re.test(p) && typeof e[p] !== 'function') {
						obj[p] = e[p];
					}
				}
				// properties are readonly in event
				p = e.target;
				if (p.nodeType !== 1) { // old Safari
					obj.target = p.parentNode;
				}
				p = e.relateTarget;
				if (p && p.nodeType !== 1) {
					obj.relatedTarget = p.parentNode;
				}
				obj.button = e.which === 3 ? 2 : e.which;
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
		stopPropagation = function () { this.cancelBubble = this._origin.cancelBubble = true; };
		preventDefault = function () {
			if (this.cancelable !== undefined) {
				this.returnValue = this._origin.returnValue = false;
			}
		};
		exports = module.exports = {
			addEventListener    : function (node, name, listener, useCapture) {
				node.attachEvent('on' + name, listener);
				if (useCapture) {
					node.setCapture();
				}
			},
			removeEventListener : function (node, name, listener, useCapture) {
				node.detachEvent('on' + name, listener);
				if (useCapture) {
					node.releaseCapture();
				}
			},
			dispatchEvent       : function (e) {
				// to be noticed, 'fireEvent' does not trigger default action like 'dispathEvent'
				var target = e.srcElement || e.target;
				target.fireEvent('on' + e.type, global.Event && e instanceof Event ? e : exports.createEvent(e));   // no 'Event' object in IE7-
			},
			createEvent         : function (e) {
				var event = doc.createEventObject(global.event), p;
				for (p in e) {
					if (e.hasOwnProperty(p)) {
						event[p] = e[p];
					}
				}
				return event;
			},
			/**
			 * Return a wrap event object which contains the origin event
			 * @param {Event}   e   the origin event
			 */
			getEvent            : function (e) //noinspection JSLint
			{
				var obj = {}, p, re = /^[a-z]/;
				if (!e) { e = global.event; }
				//noinspection JSHint
				for (p in e) {
					//noinspection JSUnfilteredForInLoop
					if (re.test(p) && typeof e[p] !== 'function') {
						obj[p] = e[p];
					}
				}
				obj._origin = e;
				// properties are readonly in event
				obj.target = e.srcElement;
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
});