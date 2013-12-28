﻿/* StringRender.js
 *
 * Author: Dmitry.Sokolov@avsmedia.net
 * Date:   Dec 12, 2011
 */
(	/**
	 * @param {Window} window
	 * @param {undefined} undefined
	 */
	function (window, undefined) {


		/*
		 * Import
		 * -----------------------------------------------------------------------------
		 */
		var asc = window["Asc"];
		var asc_calcnpt = asc.calcNearestPt;
		var asc_debug   = asc.outputDebugStr;
		var asc_typeof  = asc.typeOf;
		var asc_round   = asc.round;
		var asc_clone   = asc.clone;
		var asc_FP      = asc.FontProperties;
		var asc_TM      = asc.TextMetrics;


		function LineInfo(tw, th, bl, a, d) {
			this.tw = tw !== undefined ? tw : 0;
			this.th = th !== undefined ? th : 0;
			this.bl = bl !== undefined ? bl : 0;
			this.a = a !== undefined ? a : 0;
			this.d = d !== undefined ? d : 0;
			this.beg = undefined;
			this.end = undefined;
			this.startX = undefined;
		}

		LineInfo.prototype = {

			constructor: LineInfo,

			assign: function (tw, th, bl, a, d) {
				if (tw !== undefined) {this.tw = tw;}
				if (th !== undefined) {this.th = th;}
				if (bl !== undefined) {this.bl = bl;}
				if (a !== undefined) {this.a = a;}
				if (d !== undefined) {this.d = d;}
			}

		};


		/**
		 * Formatted text render
		 * -----------------------------------------------------------------------------
		 * @constructor
		 * @param {DrawingContext} drawingCtx  Context for drawing on
		 *
		 * @memberOf Asc
		 */
		function StringRender(drawingCtx) {
			if ( !(this instanceof StringRender) ) {return new StringRender(drawingCtx);}

			this.drawingCtx = drawingCtx;

			/** @type FontProperties */
			this.defaultFont = undefined;

			/** @type Array */
			this.fragments = undefined;

			/** @type Object */
			this.flags = undefined;

			/** @type String */
			this.chars = "";

			this.charWidths = [];
			this.charProps = [];
			this.lines = [];
			this.ratio = 1;
            this.angle = 0;

            this.fontNeedUpdate = false;

			return this;
		}

		StringRender.prototype = {

			/** @type StringRender */
			constructor: StringRender,

			// For replacing invisible chars while rendering
			/** @type RegExp */
			reNL:  /[\r\n]/,
			/** @type RegExp */
			reTab: /[\t\v\f]/,
			/** @type RegExp */
			reSpace: /[\n\r\u2028\u2029\t\v\f\u0020\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2008\u2009\u200A\u200B\u205F\u3000]/,
			/** @type RegExp */
			reReplaceNL:  /\r?\n|\r/g,
			/** @type RegExp */
			reReplaceTab: /[\t\v\f]/g,

			// For hyphenation
			/** @type RegExp */
			reHypNL:  /[\n\r\u2028\u2029]/,
			/** @type RegExp */
			reHypSp:  /[\t\v\f\u0020\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2008\u2009\u200A\u200B\u205F\u3000]/,
			/** @type RegExp */
			reHyphen: /[\u002D\u00AD\u2010\u2012\u2013\u2014]/,

			/**
			 * Setups default font
			 * @param {FontProperties} font  Font properties. @see Asc.FontProperties
			 * @return {StringRender}  Returns 'this' to allow chaining
			 */
			setDefaultFont: function(font) {
				this.defaultFont = font;
				return this;
			},

			/**
			 * Setups default font from fromat object
			 * @param {Object} fmt  Format object from rendered string
			 * @return {StringRender}  Returns 'this' to allow chaining
			 */
			setDefaultFontFromFmt: function(fmt) {
				if (asc_typeof(fmt.fn) !== "string" || !(fmt.fs > 0)) {
					throw "Can not make font from {fmt.fn=" + fmt.fn + ", fmt.fs=" + fmt.fs + "}";
				}
				this.defaultFont = this._makeFont(fmt);
				return this;
			},

			/**
			 * Setups one or more strings to process on
			 * @param {String|Array} str  A simple string or array of formatted strings {text:"", format:{}}
			 * @param {Object} flags  Optional. Text flags {wrapText, shrinkToFit, isMerged, textAlign}
			 * @return {StringRender}  Returns 'this' to allow chaining
			 */
			setString: function(str, flags) {
				this.fragments = [];
				if ( asc_typeof(str) === "string" ) {
					this.fragments.push({text: str, format: {}});
				} else {
					for (var i = 0; i < str.length; ++i) {
						this.fragments.push({text: str[i].text, format: str[i].format});
					}
				}
				this.flags = flags;
				this._reset();
				this.drawingCtx.setFont(this.defaultFont, this.angle);
				return this;
			},

            /**
             * Применяем только трансформации поворота в области
             * @param {drawingCtx} drawingCtx
             * @param {type} angle Угол поворота в градусах
             * @param {Number} x
             * @param {Number} y
             * @param {Number} dx
             * @param {Number} dy
             * */
            rotateAtPoint: function (drawingCtx, angle, x, y, dx, dy) {
                var m   = new asc.Matrix();   m.rotate(angle, 0);
                var mbt = new asc.Matrix();

                if (null === drawingCtx) {
                    mbt.translate(x + dx, y + dy);

                    this.drawingCtx.setTextTransform(m.sx, m.shy, m.shx, m.sy, m.tx, m.ty);
                    this.drawingCtx.setTransform(mbt.sx, mbt.shy, mbt.shx, mbt.sy, mbt.tx, mbt.ty);
                    this.drawingCtx.updateTransforms();
                } else {

                    mbt.translate((x + dx) * vector_koef, (y + dy) * vector_koef);
                    mbt.multiply(m, 0);

                    drawingCtx.setTransform(mbt.sx, mbt.shy, mbt.shx, mbt.sy, mbt.tx, mbt.ty);
                }

                return this;
            },

            resetTransform: function (drawingCtx)  {
                if (null === drawingCtx) {
                    this.drawingCtx.resetTransforms();
                } else {
                    var m = new asc.Matrix();
                    drawingCtx.setTransform(m.sx, m.shy, m.shx, m.sy, m.tx, m.ty);
                }

                this.angle = 0;
                this.fontNeedUpdate = true;
            },

            /**
             * @param {Number} angle
             * @param {Number} x
             * @param {Number} y
             * @param {Number} w
             * @param {Number} h
             * @param {Number} textW
             * @param {String} alignHorizontal
             * @param {String} alignVertical
             * @param {Number} maxWidth
             */
            getTransformBound: function(angle, x, y, w, h, textW, alignHorizontal, alignVertical, maxWidth) {

                this.angle          =   0;  //  angle;
                this.fontNeedUpdate =   true;

                var dx = 0, dy = 0, sx = 0, sw = 0;
                var tm = this._doMeasure(maxWidth);

                var mul = (90 - (Math.abs(angle)) ) / 90;
                var posh = (angle === 90 || angle === -90) ? textW : Math.abs(Math.sin(angle * Math.PI / 180.0) * textW);
                var posv = (angle === 90 || angle === -90) ? 0 : Math.abs(Math.cos(angle * Math.PI / 180.0) * textW);

                if ("bottom" === alignVertical) {

                    if (angle < 0) {
                        if ("left" === alignHorizontal) {
                            dx = (1 - mul) * tm.height;
                            sw = x + posv + (mul * 0.5) * tm.height;
                        }
                        else if ("center" === alignHorizontal) {
                            dx = (w + tm.height - posv) * 0.5;
                            sx = x + (w - posv) * 0.5 - (mul * 0.5) * tm.height;
                            sw = x + (w + posv) * 0.5 + (mul * 0.5) * tm.height;
                        }
                        else if ("right" === alignHorizontal) {
                            dx = w -  posv;
                            sx = x + dx - (mul * 0.5) * tm.height;
                        }
                    } else {
                        if ("left" === alignHorizontal) {
                            sw = x + posv + (mul * 0.5) * tm.height;
                        }
                        else if ("center" === alignHorizontal) {
                            dx = (w - tm.height - posv) * 0.5;
                            sx = x + (w - posv) * 0.5 - (mul * 0.5) * tm.height;
                            sw = x + (w + posv) * 0.5 + (mul * 0.5) * tm.height;
                        }
                        else if ("right" === alignHorizontal) {
                            dx = w - posv - (1 - mul) * tm.height;
                            sx = x + dx;
                        }
                    }

                    //

                    if (posh < h) {
                        if (angle < 0) {
                            dy = h - (posh + mul * tm.height);
                        }
                        else {
                            dy = h - mul * tm.height;
                        }
                    } else {
                        if (angle > 0) {
                            dy = h - mul * tm.height;
                        }
                        else {

                        }
                    }
                }
                else if ("center" === alignVertical) {

                    if (angle < 0) {
                        if ("left" === alignHorizontal) {
                            dx = (1 - mul * 0.5) * tm.height;
                            sw = x + posv + (mul * 0.5) * tm.height;
                        }
                        else if ("center" === alignHorizontal) {
                            dx = (w + tm.height - posv) * 0.5;
                            sx = x + (w - posv) * 0.5 - (mul * 0.5) * tm.height;
                            sw = x + (w + posv) * 0.5 + (mul * 0.5) * tm.height;
                        }
                        else if ("right" === alignHorizontal) {
                            dx = w - (mul * 0.5) * tm.height - posv;
                            sx = x + dx - (mul * 0.5) * tm.height;
                        }
                    } else {
                        if ("left" === alignHorizontal) {
                            sw = x + posv + (mul * 0.5) * tm.height;
                        }
                        else if ("center" == alignHorizontal)  {
                            dx = (w - tm.height - posv) * 0.5;
                            sx = x + (w - posv) * 0.5 - (mul * 0.5) * tm.height;
                            sw = x + (w + posv) * 0.5 + (mul * 0.5) * tm.height;
                        }
                        else if ("right" === alignHorizontal) {
                            dx = w - posv - tm.height; sx = x + dx;
                            sx = x + dx - (mul * 0.5) * tm.height;
                        }
                    }

                    //

                    if (posh < h) {
                        if (angle < 0) {
                            dy = (h - posh) * 0.5;
                        }
                        else {
                            dy = (h + posh) * 0.5;
                        }
                    } else {
                        if (angle > 0) {
                            dy = h - mul * tm.height;
                        }
                        else {

                        }
                    }
                }
                else if ("top" === alignVertical) {

                    if (angle < 0) {
                        if ("left" === alignHorizontal) {
                            dx = (1 - mul * 0.5) * tm.height;
                            sw = x + posv + (mul * 0.5) * tm.height;
                        }
                        else if ('c' === alignHorizontal) {
                            dx = (w + tm.height - posv) * 0.5;
                            sx = x + (w - posv) * 0.5 - (mul * 0.5) * tm.height;
                            sw = x + (w + posv) * 0.5 + (mul * 0.5) * tm.height;
                        }
                        else if ("right" === alignHorizontal) {
                            dx = w - (mul * 0.5) * tm.height - posv;
                            sx = x + dx - (mul * 0.5) * tm.height;
                        }
                    } else {
                        if ("left" === alignHorizontal) {
                            sw = x + posv + (mul * 0.5) * tm.height;
                        }
                        else if ('c' === alignHorizontal) {
                            dx = (w - tm.height - posv) * 0.5;
                            sx = x + (w - posv) * 0.5 - (mul * 0.5) * tm.height;
                            sw = x + (w + posv) * 0.5 + (mul * 0.5) * tm.height;
                        }
                        else if ("right" === alignHorizontal) {
                            dx = w - posv - tm.height; sx = x + dx;
                            sx = x + dx - (mul * 0.5) * tm.height;
                        }

                        //

                        dy = Math.min(h + tm.height * mul, posh);
                    }
                }

                var bound = {};

                bound.dx   =   dx;
                bound.dy   =   dy;
                bound.x    =   x;
                bound.y    =   y;

                bound.sx   =   sx;
                bound.sw   =   sw;

                if (angle === 90 || angle === -90) {
                    bound.height = textW;
                } else {
                    bound.height = Math.abs(Math.sin(angle / 180.0 * Math.PI) * textW) + (mul) * tm.height;
                }

                return bound;
            },

            /**
             * Measures string that was setup by 'setString' method
             * @param {Number} maxWidth  Optional. Text width restriction
             * @return {TextMetrics}  Returns text metrics or null. @see Asc.TextMetrics
             */
			measure: function(maxWidth) {
				return this._doMeasure(maxWidth);
			},

			/**
			 * Draw string that was setup by methods 'setString' or 'measureString'
			 * @param {Number} x  Left of the text rect
			 * @param {Number} y  Top of the text rect
			 * @param {Number} maxWidth  Text width restriction
			 * @param {String} textColor  Default text color for formatless string
			 * @return {StringRender}  Returns 'this' to allow chaining
			 */
			render: function(x, y, maxWidth, textColor) {
				this._doRender(undefined, x, y, maxWidth, textColor);
				return this;
			},

			/**
			 * Draw string that was setup by methods 'setString' or 'measureString'
			 * @param {drawingCtx} drawingCtx
			 * @param {Number} x  Left of the text rect
			 * @param {Number} y  Top of the text rect
			 * @param {Number} maxWidth  Text width restriction
			 * @param {String} textColor  Default text color for formatless string
			 * @return {StringRender}  Returns 'this' to allow chaining
			 */
			renderForPrint: function(drawingCtx, x, y, maxWidth, textColor) {
				this._doRender(drawingCtx, x, y, maxWidth, textColor);
				return this;
			},

			/**
			 * Measures string
			 * @param {String|Array} str  A simple string or array of formatted strings {text:"", format:{}}
			 * @param {Object} flags      Optional. Text flags {wrapText, shrinkToFit, isMerged, textAlign}
			 * @param {Number} maxWidth   Optional. Text width restriction
			 * @return {TextMetrics}  Returns text metrics or null. @see Asc.TextMetrics
			 */
			measureString: function(str, flags, maxWidth) {
				if (str !== undefined) {
					this.setString(str, flags);
				}
				return this._doMeasure(maxWidth);
			},

			/**
			 * Draw string
			 * @param {String|Array} str  A simple string or array of formatted strings {text:"", format:{}}
			 * @param {Object} flags  Optional. Text flags {wrapText, shrinkToFit, isMerged, textAlign}
			 * @param {Number} x  Left of the text rect
			 * @param {Number} y  Top of the text rect
			 * @param {Number} maxWidth  Text width restriction
			 * @param {String} textColor  Default text color for formatless string
			 * @return {StringRender}  Returns 'this' to allow chaining
			 */
			renderString: function(str, flags, x, y, maxWidth, textColor) {
				if (str !== undefined) {
					this.setString(str, flags);
				}
				if (this.charWidths.length < 1 && null === this._doMeasure(maxWidth)) {
					asc_debug("log", "Warning: can not measure '", str, "'");
					return this;
				}
				this._doRender(undefined, x, y, maxWidth, textColor);
				return this;
			},

			/**
			 * Returns the width of the widest char in the string has been measured
			 */
			getWidestCharWidth: function () {
				return this.charWidths.reduce(function (p,c) {return p<c?c:p;}, 0);
			},

			_reset: function() {
				this.chars = "";
				this.charWidths = [];
				this.charProps = [];
				this.lines = [];
				this.ratio = 1;
			},

			/**
			 * @param {String} fragment
			 * @param {Boolean} wrap
			 * @return {String}  Returns filtered fragment
			 */
			_filterText: function(fragment, wrap) {
				var s = fragment;
				if (s.search(this.reNL) >= 0) {s = s.replace(this.reReplaceNL, wrap ? "\n" : "\u00B6");}
				if (s.search(this.reTab) >= 0) {s = s.replace(this.reReplaceTab, wrap ? "        " : "\u2192");}
				return s;
			},

			/**
			 * @param {Object} format  Cell text format
			 * @return {FontProperties}
			 */
			_makeFont: function(format) {
				if (format !== undefined && asc_typeof(format.fn) === "string") {
					var fsz = format.fs > 0 ? format.fs : this.defaultFont.FontSize;
					return new asc_FP(format.fn, fsz, format.b, format.i, format.u, format.s);
				}
				return this.defaultFont;
			},

			/**
			 * @param {Number} startCh
			 * @param {Number} endCh
			 * @return {Number}
			 */
			_calcCharsWidth: function(startCh, endCh) {
				for (var w = 0, i = startCh; i <= endCh; ++i) {
					w += this.charWidths[i];
				}
				return w * this.ratio;
			},

			/**
			 * @param {Number} startPos
			 * @param {Number} endPos
			 * @return {Number}
			 */
			_calcLineWidth: function (startPos, endPos) {
				var wrap = this.flags && this.flags.wrapText;
				var wrapNL = this.flags && this.flags.wrapOnlyNL;
				var isAtEnd, j, chProp, tw;

				if (endPos === undefined || endPos < 0) {
					// search for end of line
					for (j = startPos + 1; j < this.chars.length; ++j) {
						chProp = this.charProps[j];
						if (chProp && (chProp.nl || chProp.hp)) {break;}
					}
					endPos = j - 1;
				}

				for (j = endPos, tw = 0, isAtEnd = true; j >= startPos; --j) {
					if (isAtEnd) {
						// skip space char at end of line
						if ( (wrap || wrapNL) && this.reSpace.test(this.chars[j]) ) {continue;}
						isAtEnd = false;
					}
					tw += this.charWidths[j];
				}

				return tw * this.ratio;
			},

			_calcLineMetrics: function (f, va, fm, ppi) {
				var l = {th: 0, bl: 0, bl2: 0, a: 0, d: 0};

				var hpt = f * 1.275;
				var fpx = f * ppi / 72;
				var topt = 72 / ppi;

				var h = asc_calcnpt(hpt, ppi);
				var a = asc_round(fpx) * topt;
				var d = h - a;

				var a_2 = asc_round(fpx / 2) * topt;

				var h_2_3 = asc_calcnpt(hpt * 2/3, ppi);
				var a_2_3 = asc_round(fpx * 2/3) * topt;
				var d_2_3 = h_2_3 - a_2_3;

				var x = a_2 + a_2_3;

				if (va === "superscript") {
					l.th = x + d;
					l.bl = x;
					l.bl2 = a_2_3;
					l.a = fm.ascender + a_2;         // >0
					l.d = fm.descender - a_2;        // <0
				} else if (va === "subscript") {
					l.th = x + d_2_3;
					l.bl = a;
					l.bl2 = x;
					l.a = fm.ascender + a - x;       // >0
					l.d = fm.descender + x - a;      // >0
				} else {
					l.th = a + d;
					l.bl = a;
					l.a = fm.ascender;
					l.d = fm.descender;
				}
				return l;
			},

			/**
			 * @param {Boolean} dontCalcRepeatChars
			 * @return {TextMetrics}
			 */
			_calcTextMetrics: function (dontCalcRepeatChars) {
				var self = this, i, p, p_, lm, beg;
				var l = new LineInfo(), TW = 0, TH = 0, BL = 0, CL = 0;
				var ppi = this.drawingCtx.getPPIY();

				function calcDelta(vnew, vold) {
					return vnew > vold ? vnew - vold : 0;
				}

				function addLine(b, e) {
					l.tw += self._calcLineWidth(b, e - 1);
					l.beg = b;
					l.end = e - 1;
					self.lines.push(l);
					if (TW < l.tw) {TW = l.tw;}
					BL = TH + l.bl;
					TH += l.th;
				}

				for (i = 0, beg = 0; i < this.chars.length; ++i) {
					p = this.charProps[i];

					// if font has been changed than calc and update line height and etc.
					if (p && p.font) {
						lm = this._calcLineMetrics(p.fsz !== undefined ? p.fsz : p.font.FontSize, p.va, p.fm, ppi);
						if (i === 0) {
							l.assign(0, lm.th, lm.bl, lm.a, lm.d);
						} else {
							l.th += calcDelta(lm.bl, l.bl) + calcDelta(lm.th - lm.bl, l.th - l.bl);
							l.bl += calcDelta(lm.bl, l.bl);
							l.a += calcDelta(lm.a, l.a);
							l.d += calcDelta(lm.d, l.d);
						}
						p.lm = lm;
						p_ = p;
					}

					// process 'repeat char' marker
					if (dontCalcRepeatChars && p && p.repeat) {
						l.tw -= this._calcCharsWidth(i, i + p.total);
					}

					// process 'new line' marker
					if (p && (p.nl || p.hp)) {
						addLine(beg, i);
						beg = i;
						lm = this._calcLineMetrics(p_.fsz !== undefined ? p_.fsz : p_.font.FontSize, p_.va, p_.fm, ppi);
						l = new LineInfo(0, lm.th, lm.bl, lm.a, lm.d);
					}
				}
				if (beg < i) {
					// add last line of text
					addLine(beg, i);
				}
				if (this.lines.length > 0) {
					CL = (this.lines[0].bl - this.lines[0].a + BL + l.d) / 2;
				}
				return new asc_TM(TW, TH, 0, BL, 0, 0, CL);
			},

			_getRepeatCharPos: function () {
				var charProp;
				for (var i = 0; i < this.chars.length; ++i) {
					charProp = this.charProps[i];
					if (charProp && charProp.repeat)
						return i;
				}
				return -1;
			},

			/**
			 * @param {Number} maxWidth
			 */
			_insertRepeatChars: function (maxWidth) {
				var self = this, width, w, pos, charProp;

				function shiftCharPropsLeft(fromPos, delta) {
					// delta - отрицательная
					var length = self.charProps.length;
					for (var i = fromPos; i < length; ++i) {
						var p = self.charProps[i];
						if (p) {
							delete self.charProps[i];
							self.charProps[i + delta] = p;
						}
					}
				}

				function shiftCharPropsRight(fromPos, delta) {
					// delta - положительная
					for (var i = self.charProps.length - 1; i >= fromPos; --i) {
						var p = self.charProps[i];
						if (p) {
							delete self.charProps[i];
							self.charProps[i + delta] = p;
						}
					}
				}

				function insertRepeatChars() {
					if (0 === charProp.total)
						return;	// Символ уже изначально лежит в строке и в списке
					var repeatEnd = pos + charProp.total;
					self.chars = "" +
						self.chars.slice(0, repeatEnd) +
						self.chars.slice(pos, pos + 1) +
						self.chars.slice(repeatEnd);

					self.charWidths = [].concat(
						self.charWidths.slice(0, repeatEnd),
						self.charWidths.slice(pos, pos + 1),
						self.charWidths.slice(repeatEnd));

					shiftCharPropsRight(pos + 1, 1);
				}

				function removeRepeatChar() {
					self.chars = "" +
						self.chars.slice(0, pos) +
						self.chars.slice(pos + 1);

					self.charWidths = [].concat(
						self.charWidths.slice(0, pos),
						self.charWidths.slice(pos + 1));

					delete self.charProps[pos];
					shiftCharPropsLeft(pos + 1, -1);
				}

				width = this._calcTextMetrics(true).width;
				pos = this._getRepeatCharPos();
				if (-1 === pos)
					return;
				w = this._calcCharsWidth(pos, pos);
				charProp = this.charProps[pos];

				while (charProp.total * w + width + w <= maxWidth) {
					insertRepeatChars();
					charProp.total += 1;
				}

				if (0 === charProp.total)
					removeRepeatChar();

				this.lines = [];
			},

			/**
			 * @param {Number} maxWidth
			 * @return {TextMetrics}
			 */
			_measureChars: function (maxWidth) {
				var self = this;
				var ctx = this.drawingCtx;
				var wrap = this.flags && this.flags.wrapText && !this.flags.isNumberFormat;
				var wrapNL = this.flags && this.flags.wrapOnlyNL;
				var hasRepeats = false;
				var i, j, fr, fmt, text, p, p_ = {}, pIndex, va, f, f_, eq, startCh;
				var tw = 0, nlPos = 0, hpPos = undefined, isSP_ = true, delta = 0;

				function charPropAt(index) {
					var prop = self.charProps[index];
					if (!prop) {prop = self.charProps[index] = {};}
					return prop;
				}

				function measureFragment(s) {
					var j, ch, chw, chPos, isNL, isSP, isHP, tm;

					for (chPos = self.chars.length, j = 0; j < s.length; ++j, ++chPos) {
						ch  = s.charAt(j);
						tm = ctx.measureChar(ch, 1/*pt units*/);
						chw = tm.width;

						isNL = self.reHypNL.test(ch);
						isSP = !isNL ? self.reHypSp.test(ch) : false;

						// if 'wrap flag' is set
						if (wrap || wrapNL) {
							isHP = !isSP && !isNL ? self.reHyphen.test(ch) : false;

							if (isNL) {
								// add new line marker
								nlPos = chPos + 1;
								charPropAt(nlPos).nl = true;
								charPropAt(nlPos).delta = delta;
								ch = " ";
								chw = 0;
								tw = 0;
								hpPos = undefined;
							} else if (isSP || isHP) {
								// move hyphenation position
								hpPos = chPos + 1;
							}

							if (wrap && tw + chw > maxWidth && chPos !== nlPos && !isSP) {
								// add hyphenation marker
								nlPos = hpPos !== undefined ? hpPos : chPos;
								charPropAt(nlPos).hp = true;
								charPropAt(nlPos).delta = delta;
								tw = self._calcCharsWidth(nlPos, chPos - 1);
								hpPos = undefined;
							}
						}

						if (isSP_ && !isSP && !isNL) {
							// add word beginning marker
							charPropAt(chPos).wrd = true;
						}

						tw += chw;
						self.charWidths.push(chw);
						self.chars += ch;
						isSP_ = isSP || isNL;
						delta = tm.widthBB - tm.width;
					}
				}

				this._reset();

				// for each text fragment
				for (i = 0, f_ = ctx.getFont(); i < this.fragments.length; ++i) {
					startCh = this.charWidths.length;
					fr = this.fragments[i];
					fmt = fr.format;
					text = this._filterText(fr.text, wrap || wrapNL);
					if (text.length < 1) {continue;}

					f = this._makeFont(fmt);
					pIndex = this.chars.length;
					p = asc_clone(this.charProps[pIndex] || {});

					// reduce font size for subscript and superscript chars
					va = fmt.va !== undefined ? fmt.va.toLowerCase() : "";
					if (va === "subscript" || va === "superscript") {
						p.va = va;
						p.fsz = f.FontSize;
						f.FontSize *= 2/3;
						p.font = f;
					}

					// change font on canvas
					eq = f.isEqual(f_);
					if (!eq || f.Underline !== f_.Underline || f.Strikeout !== f_.Strikeout || fmt.c !== p_.c) {
						if (!eq) {ctx.setFont(f, this.angle);}
						p.font = f;
						f_ = f;
					}

					// add marker in chars flow
					if (i === 0) {
						p.font = f;
					}
					if (p.font) {
						p.fm = ctx.getFontMetrics();
						p.c = fmt.c;
						this.charProps[pIndex] = p;
						p_ = p;
					}

					if (fmt.skip) {
						charPropAt(pIndex).skip = text.length;
					}

					if (fmt.repeat) {
						if (hasRepeats)
							throw "Repeat should occur no more than once";

						charPropAt(pIndex).repeat = true;
						charPropAt(pIndex).total = 0;
						hasRepeats = true;
					}

					measureFragment(text);

					// для italic текста прибавляем к концу строки разницу между charWidth и BBox
					for (j = startCh; f_.Italic && j < this.charWidths.length; ++j) {
						if (this.charProps[j] && this.charProps[j].delta && j > 0) {
							if (this.charWidths[j-1] > 0) {
								this.charWidths[j-1] += this.charProps[j].delta;
							} else if (j > 1) {
								this.charWidths[j-2] += this.charProps[j].delta;
							}
						}
					}
				}

				if (this.charProps[this.chars.length] !== undefined) {
					delete this.charProps[this.chars.length];
				} else if (f_.Italic) {
					// для italic текста прибавляем к концу текста разницу между charWidth и BBox
					this.charWidths[this.charWidths.length - 1] += delta;
				}

                if (hasRepeats) {
                    if (maxWidth === undefined) {
                        throw "Undefined width of cell width Numeric Format";
                    }
                    this._insertRepeatChars(maxWidth);
                }

                return this._calcTextMetrics();
            },

            /**
			 * @param {Number} maxWidth
			 * @return {TextMetrics}
			 */
			_doMeasure: function(maxWidth) {
				var tm = this._measureChars(maxWidth);
				if (this.flags && this.flags.shrinkToFit && tm.width > maxWidth) {
					this.ratio = maxWidth / tm.width;
					tm.width = maxWidth;
				}
				return tm;
			},

			/**
			 * @param {DrawingContext} drawingCtx
			 * @param {Number} x
			 * @param {Number} y
			 * @param {Number} maxWidth
			 * @param {String} textColor
			 */
			_doRender: function(drawingCtx, x, y, maxWidth, textColor) {
				var self = this;
				var ctx = (undefined !== drawingCtx) ? drawingCtx : this.drawingCtx;
				var ppix = ctx.getPPIX();
				var ppiy = ctx.getPPIY();
				var shrink = this.flags && this.flags.shrinkToFit;
				var align  = this.flags ? this.flags.textAlign.toLowerCase() : "";
				var i, j, p, p_, f, f_, strBeg;
				var n = 0, l = this.lines[0], x1 = l ? initX(0) : 0, y1 = y, dx = l ? computeWordDeltaX() : 0;

				function initX(startPos) {
					var x_ = x;
					if (align === "right") {
						x_ = asc_calcnpt(x + maxWidth - self._calcLineWidth(startPos), ppix, -1/*px*/);
					} else if (align === "center") {
						x_ = asc_calcnpt(x + 0.5 * (maxWidth - asc_calcnpt(self._calcLineWidth(startPos), ppix)), ppix, 0/*px*/);
					}
					l.startX = x_;
					return x_;
				}

				function computeWordDeltaX() {
					if (align !== "justify" || n === self.lines.length - 1) {return 0;}
					for (var i = l.beg, c = 0; i <= l.end; ++i) {
						var p = self.charProps[i];
						if (p && p.wrd) {++c;}
					}
					return c > 1 ? (maxWidth - l.tw) / (c - 1) : 0;
				}

				function renderFragment(begin, end, prop, angle) {
					var dh = prop && prop.lm && prop.lm.bl2 > 0 ? prop.lm.bl2 - prop.lm.bl : 0;
					var dw = self._calcCharsWidth(strBeg, end - 1);
					var so = prop.font.Strikeout;
					var ul = prop.font.Underline;
					var isSO = so === true;
					var isUL = ul === true || !( ul === undefined || ul === false || ul.search(/\w/) < 0 || ul.search(/\s*none\s*/i) >= 0 );
					var fsz, x2, y, lw, dy, i, b, x_, cp, w_1px, h_1px;

					if (align !== "justify" || dx < 0.000001) {
						ctx.fillText(self.chars.slice(begin, end), x1, y1 + l.bl + dh, undefined, self.charWidths.slice(begin, end), angle);
					} else {
						for (i = b = begin, x_ = x1; i < end; ++i) {
							cp = self.charProps[i];
							if (cp && cp.wrd && i > b) {
								ctx.fillText(self.chars.slice(b, i), x_, y1 + l.bl + dh, undefined, self.charWidths.slice(b, i), angle);
								x_ += self._calcCharsWidth(b, i - 1) + dx;
								dw += dx;
								b = i;
							}
						}
						if (i > b) { // draw remainder of text
							ctx.fillText(self.chars.slice(b, i), x_, y1 + l.bl + dh, undefined, self.charWidths.slice(b, i), angle);
						}
					}

					if (isSO || isUL) {
						x2 = asc_calcnpt(x1 + dw, ppix);
						fsz = prop.font.FontSize * self.ratio;
						lw = asc_round(fsz * ppiy / 72 / 18) || 1;
						ctx.setStrokeStyle(prop.c || textColor)
						   .setLineWidth(lw)
						   .beginPath();
						w_1px = asc_calcnpt(0, ppix, 1/*px*/);
						h_1px = asc_calcnpt(0, ppiy, 1/*px*/);
						dy = (lw / 2); dy = dy >> 0;
						if (isSO) {
							dy += 1;
							y = asc_calcnpt(y1 + l.bl - prop.lm.a * 0.275, ppiy);
							ctx.lineHor(x1, y - dy * h_1px, x2 + w_1px);
						}
						if (isUL) {
							y = asc_calcnpt(y1 + l.bl + prop.lm.d * 0.4, ppiy);
							ctx.lineHor(x1, y + dy * h_1px, x2 + w_1px);
						}
						ctx.stroke();
					}

					return dw;
				}

				for (i = 0, strBeg = 0, f_ = ctx.getFont(); i < this.chars.length; ++i) {
					p = this.charProps[i];

					if (p && (p.font || p.nl || p.hp || p.skip > 0)) {
						if (strBeg < i) {
							// render fragment
							x1 += renderFragment(strBeg, i, p_, this.angle);
							strBeg = i;
						}

						if (p.font) {
							// change canvas font style
							f = p.font.clone();
							// ToDo не особо правильно работает shrink
							if (shrink) {f.FontSize *= this.ratio;}

                            if (!f.isEqual(f_) || this.fontNeedUpdate) {
                                ctx.setFont(f, this.angle);
                                f_ = f;
                                this.fontNeedUpdate = false;
                            }
							ctx.setFillStyle(p.c || textColor);
							p_ = p;
						}
						if (p.skip > 0) {
							// skip invisible chars
							j = i + p.skip - 1;
							x1 += this._calcCharsWidth(i, j);
							strBeg = j + 1;
							i = j;
							continue;
						}
						if (p.nl || p.hp) {
							// begin new line
							y1 += l.th;
							l = self.lines[++n];
							x1 = initX(i);
							dx = computeWordDeltaX();
						}
					}
				}
				if (strBeg < i) {
					// render text remainder
					renderFragment(strBeg, i, p_, this.angle);
				}
			},

            getInternalState: function () {
                //for (var fr = [], i = 0; i < this.fragments.length; ++i) {
                //	fr.push(this.fragments[i]);
                //}
                return {
                    /** @type FontProperties */
                    defaultFont : this.defaultFont !== undefined ? this.defaultFont.clone() : undefined,

                    ///** @type Array */
                    //"fragments"   : fr,

                    /** @type Object */
                    flags       : this.flags,

                    chars       : this.chars,
                    charWidths  : this.charWidths,
                    charProps   : this.charProps,
                    lines       : this.lines,
                    ratio       : this.ratio
                };
            },

			restoreInternalState: function (state) {
				this.defaultFont = state.defaultFont;
				//this.fragments   = state.fragments;
				this.flags       = state.flags;
				this.chars       = state.chars;
				this.charWidths  = state.charWidths;
				this.charProps   = state.charProps;
				this.lines       = state.lines;
				this.ratio       = state.ratio;
				return this;
			}
		};


		/*
		 * Export
		 * -----------------------------------------------------------------------------
		 */
		window["Asc"].StringRender = StringRender;


	}
)(window);
