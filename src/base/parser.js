/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-07-02 00:10
 * Name     : base/parser.js
 */

/*global define */
/**
 * based on ecma-262 edition 5.1
 *
 *  white space     : [\s\uFEFF]+, <TAB>\x09, <VT>\x0b, <FF>\x0c, <SP>\x20, <NBSP>\xa0, <LS>\u2028, <PS>\u2029
 *  line terminator : [\r\n\u2028\u2029]+, <LF>\n, <CR>\r, <LS>\u2028, <PS>\u2029
 *  comment         : \/\*[\s\S]*?\*\/, \/\/.*
 *  identifier      : [a-zA-Z_$][\w$]*, actually, 'var 你好' is also legal
 *  punctuator      : [{}()\[\].;,<>=+-*\/%!&|^~?:]
 *  numeric         : decimal : ([1-9]\d*\.?\d*|\.\d+)([eE][+-]\d+)?, octal : \d+, hex: 0[xX][a-fA-F\d]+
 *  string          : "([^"\\]|\\x[a-fA-F\d]{2}|\\u[a-fA-F\d]{4}|\\[^xu])*", '([^'\\]|\\x[a-fA-F\d]{2}|\\u[a-fA-F\d]{4}|\\[^xu])*'
 *  regexp          : \/([^*\/\[\\\r\n]|\\.|\[([^\]\\\r\n]|\\.)*\])([^\/\[\\\r\n]|\\.|\[([^\]\\\r\n]|\\.)*\])*\/(?:im?g?|igm|mg?i?|mig|gm?i?|gim)\b(?!\$)
 *
 *  primary         : this|<identifier>|<literal>|[.*]|{.*}|(<expression>)
 *  array           : \[((<primary>(=<expression>)?)?,)*(<primary>(=<expression>)?|,*)\]
 *  object          : \{((<identifier>|<literal>):<expression>,)*((<identifier>|<literal>):<expression>|,)?\}
 *
 *  ASI
 *      <Expression> [not line terminator] ++|--
 *      continue|break|return|throw [no line terminator] <Expression>
 */

define(function (require, exports) {
	'use strict';

	// re:  string|comment|(|) + uncertain slash|)|regexp
	// re2: left parenthesis|slash|right parenthesis|regexp
	var re = /(".*?"|'.*?')|(\/\*[\s\S]*?\*\/|\/\/.*)|[\w$\]]\s*\/(?![*\/])|(?:[^$]return\s*)?(\/)[\s\S]*/g, re2 = /((\$|\.\s*)?\b(?:if|for|while)\b\s*)?(\()|(([\w$)\]])\s*)(\/([^\/*][\s\S]*$))|(\))|([^$]return\s*)?(\/(?:[^*\/\[\r\n]|\[.*?\])(?:[^\/\[\r\n]|\[.*?\])*\/[img]{0,3})((\/)?[\s\S]*)/g, compile = exports.compile = function (code) {
		var escapes = [], parenthesis = [], strings = [], comments = [], regexps = [], store, f1, replacer = function (m, s, cm, slash) {
			if (slash) {
				//noinspection JSUnusedAssignment
				f1 = true;
				return m;
			}
			f1 = false;
			if (s) {
				return '\x1c@' + strings.push(m);
			}
			if (cm) {
				comments.push(m);
				return ' ';  // it can use '\s' to match, '\xa0' not match '\s' on IE8-
			}
			return m;
		}, replacer2 = function (m, lp_prefix, $, lp, slash_prefix, slash_w$, slash_suffix, slash_suffix2, rp, regexp_prefix, regexp, regexp_suffix, slash) {
			var t, s;
			if (lp) {
				// to be faster, do less array operations via flag variable check
				if (lp_prefix && !$) {
					store = true;
					parenthesis.push(true);
				} else if (store) {
					parenthesis.push(false);
				}
				return m;
			}
			if (slash_w$) {
				t = store && slash_w$ === ')' && parenthesis.pop();
				// to be faster, use capture group instead of string concatenation
				// and not start from the beginning each time
				if (t) {    // regexp
					return slash_prefix + slash_suffix.replace(re2, replacer2);
				}
				if (t === undefined) {
					store = false;
				}
				s = slash_suffix2.replace(re, replacer);
				return slash_prefix + '/' + (f1 ? s.replace(re2, replacer2) : s);
			}
			if (rp && store) {
				parenthesis.pop();
			}
			if (regexp) {
				regexps.push(regexp);
				if (slash) {    // maybe divisor follow on
					s = regexp_suffix.replace(/^/, 0).replace(re, replacer);
					return (regexp_prefix || '') + '\x1c$' + (f1 ? s.replace(re2, replacer2) : s).replace(0, '');
				}
				s = regexp_suffix.replace(re, replacer);
				return (regexp_prefix || '') + '\x1c$' + (f1 ? s.replace(re2, replacer2) : s);
			}
			return m;
		}, s = code.replace(/\\[\s\S]/g,function (m) {
			escapes.push(m);
			return '\x1b';
		}).replace(re, replacer);
		//noinspection JSUnusedAssignment
		return {s : f1 ? s.replace(re2, replacer2) : s, escapes : escapes, strings : strings, comments : comments, regexps : regexps};
	}, var_re = /(?:[\w$]|\.\s*)var|var\s+([\s\S]+?(?:;|[\w$@\])]\s*[\r\n]\s*(?=[\w$\x1d]|\x1c@)))/g, group_re = /[(\[][^()\[\]]+[)\]]/g, vars_re = /(?:^|,)\s*([\w$]+)/g, sub_re = /\x1d([$#])(\d+)/g, block_re = /([\w$]|\.\s*)function|([=(]\s*)?function(\s*([\w$]*)\s*)(\([^)]*\)\s*)\{([^{}]*)\}|([=(,]\s*)?\{([^{}]*)\}/g;
	exports.parse = function (code, compiled) {
		var ret = compiled ? code : compile(code), functions = ret.functions = [], blocks = ret.blocks = [], objects = ret.objects = [], s = ret.s, t = [], vars_replacer = function (m, m1) { return t.push(m1); }, var_replacer = function (m, m1) {
			if (m1) {
				while (group_re.test(m1)) { // remove the commas inside array or parenthesis
					m1 = m1.replace(group_re, 0);
				}
				m1.replace(vars_re, vars_replacer);
			}
			return '';
		}, fn_replacer = function (m, m1, n) {  // get named function
			if (m1 === '$') {
				n = functions[n - 1].name;
				if (n) { t.push(n); }
			} else {
				n = blocks[n - 1].variables;
				if (n.length) { t = t.concat(n); }
			}
			return '';
		}, replacer = function (m, w$, fn_prefix, head, name, args, body, block_prefix, block) {
			if (w$) {
				return m;
			}
			if (block_prefix) {
				return block_prefix + '\x1d@' + objects.push(block);
			}
			if (args) {
				t = args.match(/[\w$]+/g) || [];
				body.replace(var_re, var_replacer).replace(sub_re, fn_replacer);
				return fn_prefix + '\x1d$' + functions.push({name : !fn_prefix && name, variables : t, head : head, args : args, body : body});
			}
			t = [];
			block.replace(var_re, function (m, m1) {
				while (group_re.test(m1)) { // remove the commas inside array or parenthesis
					m1 = m1.replace(group_re, 0);
				}
				m1.replace(vars_re, vars_replacer);
				return '';
			});
			return '\x1d#' + blocks.push({s : block, variables : t});
		};
		s.replace(var_re, var_replacer).replace(sub_re, fn_replacer);
		ret.variables = t;
		while (/\{/.test(s)) {
			s = s.replace(block_re, replacer);
		}
		ret.s = s;
		return ret;
	};
});
