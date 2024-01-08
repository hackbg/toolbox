//@ts-check
const chalk = module.exports.colors = require('chalk')
const { defineCallable } = require('@hackbg/allo')
const { hideProperties } = require('@hackbg/hide')
//@ts-ignore
const bold = module.exports.bold = chalk.bold
const timestamp = module.exports.timestamp = function timestamp (d = new Date()) {
  return d.toISOString()
    .replace(/[-:\.Z]/g, '')
    .replace(/[T]/g, '_')
    .slice(0, -3)
}
const Console = module.exports.Console = class Console extends defineCallable(function log(...args){
  this.log(...args)
}) {
  constructor (label, options = {}) {
    super()
    this.label  = options.label  ?? label ?? ''
    this.parent = options.parent ?? console
    hideProperties(this,
      'label', 'tags', 'tag', '_tag', 'parent', 'sub',
      'br', 'log', 'info', 'warn', 'error', 'debug', 'trace', 'table', 
      '_print',
    )
  }
  label
  parent
  sub = (label, options = {}) => new SubConsole(label, { ...options, parent: this })
  br = () => { this.parent.log(); return this }
  log   = (...args) => this._print('log',   this._tag(chalk.green,   ' LOG   '), ...args)
  info  = (...args) => this._print('info',  this._tag(chalk.blue,    ' INFO  '), ...args)
  warn  = (...args) => this._print('warn',  this._tag(chalk.yellow,  ' WARN  '), ...args)
  error = (...args) => this._print('error', this._tag(chalk.red,     ' ERROR '), ...args)
  debug = (...args) => this._print('debug', this._tag(chalk.gray,    ' DEBUG '), ...args)
  trace = (...args) => this._print('log',   this._tag(chalk.magenta, ' TRACE '), ...args, '\n'+new Error().stack.split('\n').slice(2).join('\n'))
  table = (...args) => {
    this._print('log', this._tag(chalk.white,   'TABLE '));
    this._print('table', ...args)
  }
  _print = (method, tag, ...args) => {
    this.parent[method](tag, ...args);
    return this
  }
  _tag = (color, string) => {
    return (string ? (chalk.inverse(color(bold(string))) + ' ') : '') + color(this.label)
  }
  get [Symbol.toStringTag]() {
    return this.label
  }
  get width () {
    return process.stdout.columns
  }
}
class SubConsole extends Console {
  log   = (...args) => this._print('log',   this._tag(chalk.green),   ...args)
  info  = (...args) => this._print('info',  this._tag(chalk.blue),    ...args)
  warn  = (...args) => this._print('warn',  this._tag(chalk.yellow),  ...args)
  error = (...args) => this._print('error', this._tag(chalk.red),     ...args)
  debug = (...args) => this._print('debug', this._tag(chalk.gray),    ...args)
  trace = (...args) => this._print('trace', this._tag(chalk.magenta), ...args)
  table = (...args) => this._print('table', this._tag(chalk.white),   ...args)
}
module.exports.SubConsole = SubConsole

module.exports.Logged = class Logged {
  log
  constructor (properties) {
    this.log = properties?.log ?? new Console(this.constructor.name)
    Object.defineProperty(this, 'log', { enumerable: false, configurable: true })
  }
}

/** https://github.com/davidmerfield/randomColor/blob/master/LICENSE.md */
module.exports.randomColor = (()=>{
  var seed = null;
  var colorDictionary = {};
  loadColorBounds();
  var colorRanges = [];
  var randomColor = function (options) {
    options = options || {};
    // Check if there is a seed and ensure it's an
    // integer. Otherwise, reset the seed value.
    if (
      options.seed !== undefined &&
      options.seed !== null &&
      options.seed === parseInt(options.seed, 10)
    ) {
      seed = options.seed;
      // A string was passed as a seed
    } else if (typeof options.seed === "string") {
      seed = stringToInteger(options.seed);
      // Something was passed as a seed but it wasn't an integer or string
    } else if (options.seed !== undefined && options.seed !== null) {
      throw new TypeError("The seed value must be an integer or string");
      // No seed, reset the value outside.
    } else {
      seed = null;
    }
    var H, S, B;
    // Check if we need to generate multiple colors
    if (options.count !== null && options.count !== undefined) {
      var totalColors = options.count,
        colors = [];
      // Value false at index i means the range i is not taken yet.
      for (var i = 0; i < options.count; i++) {
        colorRanges.push(false);
      }
      options.count = null;
      while (totalColors > colors.length) {
        var color = randomColor(options);
        if (seed !== null) {
          options.seed = seed;
        }
        colors.push(color);
      }
      options.count = totalColors;
      return colors;
    }
    H = pickHue(options);
    S = pickSaturation(H, options);
    B = pickBrightness(H, S, options);
    return setFormat([H, S, B], options);
  };

  function pickHue(options) {
    if (colorRanges.length > 0) {
      var hueRange = getRealHueRange(options.hue);
      var hue = randomWithin(hueRange);
      var step = (hueRange[1] - hueRange[0]) / colorRanges.length;
      var j = parseInt((hue - hueRange[0]) / step);
      if (colorRanges[j] === true) {
        j = (j + 2) % colorRanges.length;
      } else {
        colorRanges[j] = true;
      }
      var min = (hueRange[0] + j * step) % 359,
        max = (hueRange[0] + (j + 1) * step) % 359;
      hueRange = [min, max];
      hue = randomWithin(hueRange);
      if (hue < 0) {
        hue = 360 + hue;
      }
      return hue;
    } else {
      var hueRange = getHueRange(options.hue);
      hue = randomWithin(hueRange);
      if (hue < 0) {
        hue = 360 + hue;
      }
      return hue;
    }
  }

  function pickSaturation(hue, options) {
    if (options.hue === "monochrome") {
      return 0;
    }
    if (options.luminosity === "random") {
      return randomWithin([0, 100]);
    }
    var saturationRange = getSaturationRange(hue);
    var sMin = saturationRange[0],
      sMax = saturationRange[1];
    switch (options.luminosity) {
      case "bright":
        sMin = 55;
        break;

      case "dark":
        sMin = sMax - 10;
        break;

      case "light":
        sMax = 55;
        break;
    }
    return randomWithin([sMin, sMax]);
  }

  function pickBrightness(H, S, options) {
    var bMin = getMinimumBrightness(H, S),
      bMax = 100;
    switch (options.luminosity) {
      case "dark":
        bMax = bMin + 20;
        break;
      case "light":
        bMin = (bMax + bMin) / 2;
        break;
      case "random":
        bMin = 0;
        bMax = 100;
        break;
    }
    return randomWithin([bMin, bMax]);
  }

  function setFormat(hsv, options) {
    switch (options.format) {
      case "hsvArray":
        return hsv;
      case "hslArray":
        return HSVtoHSL(hsv);
      case "hsl":
        var hsl = HSVtoHSL(hsv);
        return "hsl(" + hsl[0] + ", " + hsl[1] + "%, " + hsl[2] + "%)";
      case "hsla":
        var hslColor = HSVtoHSL(hsv);
        var alpha = options.alpha || Math.random();
        return (
          "hsla(" +
          hslColor[0] +
          ", " +
          hslColor[1] +
          "%, " +
          hslColor[2] +
          "%, " +
          alpha +
          ")"
        );
      case "rgbArray":
        return HSVtoRGB(hsv);
      case "rgb":
        var rgb = HSVtoRGB(hsv);
        return "rgb(" + rgb.join(", ") + ")";
      case "rgba":
        var rgbColor = HSVtoRGB(hsv);
        var alpha = options.alpha || Math.random();
        return "rgba(" + rgbColor.join(", ") + ", " + alpha + ")";
      default:
        return HSVtoHex(hsv);
    }
  }

  function getMinimumBrightness(H, S) {
    var lowerBounds = getColorInfo(H).lowerBounds;
    for (var i = 0; i < lowerBounds.length - 1; i++) {
      var s1 = lowerBounds[i][0],
        v1 = lowerBounds[i][1];
      var s2 = lowerBounds[i + 1][0],
        v2 = lowerBounds[i + 1][1];
      if (S >= s1 && S <= s2) {
        var m = (v2 - v1) / (s2 - s1),
          b = v1 - m * s1;
        return m * S + b;
      }
    }
    return 0;
  }

  function getHueRange(colorInput) {
    if (typeof parseInt(colorInput) === "number") {
      var number = parseInt(colorInput);
      if (number < 360 && number > 0) {
        return [number, number];
      }
    }
    if (typeof colorInput === "string") {
      if (colorDictionary[colorInput]) {
        var color = colorDictionary[colorInput];
        if (color.hueRange) {
          return color.hueRange;
        }
      } else if (colorInput.match(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i)) {
        var hue = HexToHSB(colorInput)[0];
        return [hue, hue];
      }
    }
    return [0, 360];
  }

  function getSaturationRange(hue) {
    return getColorInfo(hue).saturationRange;
  }

  function getColorInfo(hue) {
    // Maps red colors to make picking hue easier
    if (hue >= 334 && hue <= 360) {
      hue -= 360;
    }

    for (var colorName in colorDictionary) {
      var color = colorDictionary[colorName];
      if (
        color.hueRange &&
        hue >= color.hueRange[0] &&
        hue <= color.hueRange[1]
      ) {
        return colorDictionary[colorName];
      }
    }
    return "Color not found";
  }

  function randomWithin(range) {
    if (seed === null) {
      //generate random evenly destinct number from : https://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
      var golden_ratio = 0.618033988749895;
      var r = Math.random();
      r += golden_ratio;
      r %= 1;
      return Math.floor(range[0] + r * (range[1] + 1 - range[0]));
    } else {
      //Seeded random algorithm from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
      var max = range[1] || 1;
      var min = range[0] || 0;
      seed = (seed * 9301 + 49297) % 233280;
      var rnd = seed / 233280.0;
      return Math.floor(min + rnd * (max - min));
    }
  }

  function HSVtoHex(hsv) {
    var rgb = HSVtoRGB(hsv);
    function componentToHex(c) {
      var hex = c.toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    }
    var hex =
      "#" +
      componentToHex(rgb[0]) +
      componentToHex(rgb[1]) +
      componentToHex(rgb[2]);
    return hex;
  }

  function defineColor(name, hueRange, lowerBounds) {
    var sMin = lowerBounds[0][0],
      sMax = lowerBounds[lowerBounds.length - 1][0],
      bMin = lowerBounds[lowerBounds.length - 1][1],
      bMax = lowerBounds[0][1];
    colorDictionary[name] = {
      hueRange: hueRange,
      lowerBounds: lowerBounds,
      saturationRange: [sMin, sMax],
      brightnessRange: [bMin, bMax],
    };
  }

  function loadColorBounds() {
    defineColor("monochrome", null, [
      [0, 0],
      [100, 0],
    ]);
    defineColor(
      "red",
      [-26, 18],
      [
        [20, 100],
        [30, 92],
        [40, 89],
        [50, 85],
        [60, 78],
        [70, 70],
        [80, 60],
        [90, 55],
        [100, 50],
      ]
    );
    defineColor(
      "orange",
      [18, 46],
      [
        [20, 100],
        [30, 93],
        [40, 88],
        [50, 86],
        [60, 85],
        [70, 70],
        [100, 70],
      ]
    );
    defineColor(
      "yellow",
      [46, 62],
      [
        [25, 100],
        [40, 94],
        [50, 89],
        [60, 86],
        [70, 84],
        [80, 82],
        [90, 80],
        [100, 75],
      ]
    );
    defineColor(
      "green",
      [62, 178],
      [
        [30, 100],
        [40, 90],
        [50, 85],
        [60, 81],
        [70, 74],
        [80, 64],
        [90, 50],
        [100, 40],
      ]
    );
    defineColor(
      "blue",
      [178, 257],
      [
        [20, 100],
        [30, 86],
        [40, 80],
        [50, 74],
        [60, 60],
        [70, 52],
        [80, 44],
        [90, 39],
        [100, 35],
      ]
    );
    defineColor(
      "purple",
      [257, 282],
      [
        [20, 100],
        [30, 87],
        [40, 79],
        [50, 70],
        [60, 65],
        [70, 59],
        [80, 52],
        [90, 45],
        [100, 42],
      ]
    );
    defineColor(
      "pink",
      [282, 334],
      [
        [20, 100],
        [30, 90],
        [40, 86],
        [60, 84],
        [80, 80],
        [90, 75],
        [100, 73],
      ]
    );
  }

  function HSVtoRGB(hsv) {
    // this doesn't work for the values of 0 and 360
    // here's the hacky fix
    var h = hsv[0];
    if (h === 0) {
      h = 1;
    }
    if (h === 360) {
      h = 359;
    }
    // Rebase the h,s,v values
    h = h / 360;
    var s = hsv[1] / 100,
      v = hsv[2] / 100;
    var h_i = Math.floor(h * 6),
      f = h * 6 - h_i,
      p = v * (1 - s),
      q = v * (1 - f * s),
      t = v * (1 - (1 - f) * s),
      r = 256,
      g = 256,
      b = 256;
    switch (h_i) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }
    var result = [
      Math.floor(r * 255),
      Math.floor(g * 255),
      Math.floor(b * 255),
    ];
    return result;
  }

  function HexToHSB(hex) {
    hex = hex.replace(/^#/, "");
    hex = hex.length === 3 ? hex.replace(/(.)/g, "$1$1") : hex;
    var red = parseInt(hex.substr(0, 2), 16) / 255,
      green = parseInt(hex.substr(2, 2), 16) / 255,
      blue = parseInt(hex.substr(4, 2), 16) / 255;
    var cMax = Math.max(red, green, blue),
      delta = cMax - Math.min(red, green, blue),
      saturation = cMax ? delta / cMax : 0;
    switch (cMax) {
      case red:
        return [60 * (((green - blue) / delta) % 6) || 0, saturation, cMax];
      case green:
        return [60 * ((blue - red) / delta + 2) || 0, saturation, cMax];
      case blue:
        return [60 * ((red - green) / delta + 4) || 0, saturation, cMax];
    }
  }

  function HSVtoHSL(hsv) {
    var h = hsv[0],
      s = hsv[1] / 100,
      v = hsv[2] / 100,
      k = (2 - s) * v;
    return [
      h,
      Math.round(((s * v) / (k < 1 ? k : 2 - k)) * 10000) / 100,
      (k / 2) * 100,
    ];
  }

  function stringToInteger(string) {
    var total = 0;
    for (var i = 0; i !== string.length; i++) {
      if (total >= Number.MAX_SAFE_INTEGER) break;
      total += string.charCodeAt(i);
    }
    return total;
  }

  // get The range of given hue when options.count!=0
  function getRealHueRange(colorHue) {
    if (!isNaN(colorHue)) {
      var number = parseInt(colorHue);
      if (number < 360 && number > 0) {
        return getColorInfo(colorHue).hueRange;
      }
    } else if (typeof colorHue === "string") {
      if (colorDictionary[colorHue]) {
        var color = colorDictionary[colorHue];
        if (color.hueRange) {
          return color.hueRange;
        }
      } else if (colorHue.match(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i)) {
        var hue = HexToHSB(colorHue)[0];
        return getColorInfo(hue).hueRange;
      }
    }
    return [0, 360];
  }
  return randomColor;
})()
