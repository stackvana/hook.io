!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.cron=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var CronDate;
var exports;

try {
  CronDate = require("time").Date;
  exports = module.exports;
} catch (e) {
  CronDate = Date;
}

function CronTime(source, zone) {
  this.source = source;
  this.zone = zone;

  this.second = {};
  this.minute = {};
  this.hour = {};
  this.dayOfWeek = {};
  this.dayOfMonth = {};
  this.month = {};

  if ((this.source instanceof Date) || (this.source instanceof CronDate)) {
    this.source = new CronDate(this.source);
    this.realDate = true;
  } else {
    this._parse();
  }
}

CronTime.map = ['second', 'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];
CronTime.constraints = [
  [0, 59],
  [0, 59],
  [0, 23],
  [1, 31],
  [0, 11],
  [0, 6]
];
CronTime.parseDefaults = ['0', '*', '*', '*', '*', '*'];
CronTime.aliases = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};


CronTime.prototype = {
  /**
   * calculates the next send time
   */
  sendAt: function() {
    var date = (this.source instanceof CronDate) ? this.source : new CronDate();
    if (this.zone && date.setTimezone)
      date.setTimezone(this.zone);

    //add 1 second so next time isn't now (can cause timeout to be 0)
    if (!(this.realDate)) date.setSeconds(date.getSeconds() + 1);

    if (this.realDate) {
      return date;
    }
    return this._getNextDateFrom(date);
  },

  /**
   * Get the number of milliseconds in the future at which to fire our callbacks.
   */
  getTimeout: function() {
    return Math.max(-1, this.sendAt().getTime() - CronDate.now());
  },

  /**
   * writes out a cron string
   */
  toString: function() {
    return this.toJSON().join(' ');
  },

  /**
   * Json representation of the parsed cron syntax.
   */
  toJSON: function() {
    return [
      this._wcOrAll('second'),
      this._wcOrAll('minute'),
      this._wcOrAll('hour'),
      this._wcOrAll('dayOfMonth'),
      this._wcOrAll('month'),
      this._wcOrAll('dayOfWeek')
    ];
  },

  /**
   * get next date that matches parsed cron time
   */
  _getNextDateFrom: function(start) {
    var date = new CronDate(start);
    //console.log("d: " + date);
    if (this.zone && date.setTimezone)
      date.setTimezone(start.getTimezone());
    if (this.realDate && start < new Date())
      console.log("WARNING: Date in past. Will never be fired.");
    if (this.realDate) return date;

    //sanity check
    //var i = 1000;
    var x = 0;
    while (1) {
      x++;
      var diff = date - start;
      console.log(x)

      if (!(date.getMonth() in this.month)) {
        date.setMonth(date.getMonth() + 1);
        date.setDate(1);
        date.setHours(0);
        date.setMinutes(0);
        continue;
      }

      if (!(date.getDate() in this.dayOfMonth)) {
        date.setDate(date.getDate() + 1);
        date.setHours(0);
        date.setMinutes(0);
        continue;
      }

      if (!(date.getDay() in this.dayOfWeek)) {
        date.setDate(date.getDate() + 1);
        date.setHours(0);
        date.setMinutes(0);
        continue;
      }

      if (!(date.getHours() in this.hour)) {
        date.setHours(date.getHours() == 23 && diff > 24 * 60 * 60 * 1000 ? 0 : date.getHours() + 1);
        date.setMinutes(0);
        continue;
      }

      if (!(date.getMinutes() in this.minute)) {
        date.setMinutes(date.getMinutes() == 59 && diff > 60 * 60 * 1000 ? 0 : date.getMinutes() + 1);
        date.setSeconds(0);
        continue;
      }

      if (!(date.getSeconds() in this.second)) {
        date.setSeconds(date.getSeconds() == 59 && diff > 60 * 1000 ? 0 : date.getSeconds() + 1);
        continue;
      }

      break;
    }

    return date;
  },

  /**
   * wildcard, or all params in array (for to string)
   */
  _wcOrAll: function(type) {
    if (this._hasAll(type)) return '*';

    var all = [];
    for (var time in this[type]) {
      all.push(time);
    }

    return all.join(',');
  },

  /**
   */
  _hasAll: function(type) {
    var constrain = CronTime.constraints[CronTime.map.indexOf(type)];

    for (var i = constrain[0], n = constrain[1]; i < n; i++) {
      if (!(i in this[type])) return false;
    }

    return true;
  },


  /**
   * Parse the cron syntax.
   */
  _parse: function() {
    var aliases = CronTime.aliases,
      source = this.source.replace(/[a-z]{1,3}/ig, function(alias) {
        alias = alias.toLowerCase();

        if (alias in aliases) {
          return aliases[alias];
        }

        throw new Error('Unknown alias: ' + alias);
      }),
      split = source.replace(/^\s\s*|\s\s*$/g, '').split(/\s+/),
      cur, i = 0,
      len = CronTime.map.length;

    for (; i < CronTime.map.length; i++) {
      // If the split source string doesn't contain all digits,
      // assume defaults for first n missing digits.
      // This adds support for 5-digit standard cron syntax
      cur = split[i - (len - split.length)] || CronTime.parseDefaults[i];
      this._parseField(cur, CronTime.map[i], CronTime.constraints[i]);
    }
  },

  /**
   * Parse a field from the cron syntax.
   */
  _parseField: function(field, type, constraints) {

    //var rangePattern = /^(\*)(?:\/(\d+))?$|(\d+)(?:-(\d+))?(?:\/(\d+))?(?:,|$)/g
    var rangePattern = /^(\d+)(?:-(\d+))?(?:\/(\d+))?$/g,
      typeObj = this[type],
      diff, pointer,
      low = constraints[0],
      high = constraints[1];

    // * is a shortcut to [lower-upper] range
    field = field.replace(/\*/g, low + '-' + high);

    //commas separate information, so split based on those
    var allRanges = field.split(',');

    for (var i = 0; i < allRanges.length; i++) {
      if (allRanges[i].match(rangePattern)) {
        allRanges[i].replace(rangePattern, function($0, lower, upper, step) {
          step = parseInt(step) || 1;
          // Positive integer higher than constraints[0]
          lower = Math.max(low, ~~Math.abs(lower));

          // Positive integer lower than constraints[1]
          upper = upper ? Math.min(high, ~~Math.abs(upper)) : lower;

          // Count from the lower barrier to the upper
          pointer = lower;

          do {
            typeObj[pointer] = true
            pointer += step;
          } while (pointer <= upper);

        });
      } else {
        throw new Error('Field (' + field + ') cannot be parsed');
      }
    }
  }
};



function CronJob(cronTime, onTick, onComplete, start, timeZone, context) {
  if (typeof cronTime != "string" && arguments.length == 1) {
    //crontime is an object...
    onTick = cronTime.onTick;
    onComplete = cronTime.onComplete;
    context = cronTime.context;
    start = cronTime.start;
    timeZone = cronTime.timeZone;
    cronTime = cronTime.cronTime;
  }

  if (timeZone && !(CronDate.prototype.setTimezone)) console.log('You specified a Timezone but have not included the `time` module. Timezone functionality is disabled. Please install the `time` module to use Timezones in your application.');

  this.context = (context || this);
  this._callbacks = [];
  this.onComplete = onComplete;
  this.cronTime = new CronTime(cronTime, timeZone);

  this.addCallback(onTick);

  if (start) this.start();

  return this;
}

CronJob.prototype = {
  /**
   * Add a method to fire onTick
   */
  addCallback: function(callback) {
    //only functions
    if (typeof callback == 'function') this._callbacks.push(callback);
  },

  /**
   * Fire all callbacks registered.
   */
  _callback: function() {
    for (var i = (this._callbacks.length - 1); i >= 0; i--) {

      //send this so the callback can call this.stop();
      this._callbacks[i].call(this.context, this.onComplete);
    }
  },

  /**
   * Manually set the time of a job
   */
  setTime: function(time) {
    if (!(time instanceof CronTime)) throw '\'time\' must be an instance of CronTime.';
    this.stop();
    this.cronTime = time;
  },

 /**
  * Return the next scheduled date for a job
  */
  nextDate: function() {
      return this.cronTime.sendAt();
  },
  
  /**
   * Start the cronjob.
   */
  start: function() {
    if (this.running) return;

    var MAXDELAY = 2147483647; // The maximum number of milliseconds setTimeout will wait.
    var self = this;
    var timeout = this.cronTime.getTimeout();
    var remaining = 0;

    if (this.cronTime.realDate) this.runOnce = true;

    // The callback wrapper checks if it needs to sleep another period or not
    // and does the real callback logic when it's time.

    function callbackWrapper() {

      // If there is sleep time remaining, calculate how long and go to sleep
      // again. This processing might make us miss the deadline by a few ms
      // times the number of sleep sessions. Given a MAXDELAY of almost a
      // month, this should be no issue.

      if (remaining) {
        if (remaining > MAXDELAY) {
          remaining -= MAXDELAY;
          timeout = MAXDELAY;
        } else {
          timeout = remaining;
          remaining = 0;
        }

        self._timeout = setTimeout(callbackWrapper, timeout);
      } else {

        // We have arrived at the correct point in time.

        self.running = false;

        //start before calling back so the callbacks have the ability to stop the cron job
        if (!(self.runOnce)) self.start();

        self._callback();
      }
    }

    if (timeout >= 0) {
      this.running = true;

      // Don't try to sleep more than MAXDELAY ms at a time.

      if (timeout > MAXDELAY) {
        remaining = timeout - MAXDELAY;
        timeout = MAXDELAY;
      }

      this._timeout = setTimeout(callbackWrapper, timeout);
    } else {
      this.stop();
    }
  },

  /**
   * Stop the cronjob.
   */
  stop: function() {
    clearTimeout(this._timeout);
    this.running = false;
    if (this.onComplete) this.onComplete();
  }
};

if (exports) {
  exports.job = function(cronTime, onTick, onComplete) {
    return new CronJob(cronTime, onTick, onComplete);
  }

  exports.time = function(cronTime, timeZone) {
    return new CronTime(cronTime, timeZone);
  }

  exports.sendAt = function(cronTime) {
    return exports.time(cronTime).sendAt();
  }

  exports.timeout = function(cronTime) {
    return exports.time(cronTime).getTimeout();
  }

  exports.CronJob = CronJob;
  exports.CronTime = CronTime;
}

},{"time":2}],2:[function(require,module,exports){
(function (process){
/**
 * Module dependencies.
 */

var debug = require('debug')('time')
  , fs = require('fs')
  , path = require('path')
  , bindings = require('bindings')('time.node')
  , MILLIS_PER_SECOND = 1000
  , DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  , MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  , TZ_BLACKLIST = [ 'SystemV', 'Etc' ];

/**
 * Extends a "Date" constructor with node-time's extensions.
 * By default, `time.Date` is extended with this function.
 * If you want the global your your module-specific Date to be extended,
 * then invoke this function on the Date constructor.
 */

exports = module.exports = function (Date) {
  debug('extending Date constructor');
  var p = Date.prototype;
  p.getTimezone = getTimezone;
  p.setTimezone = setTimezone;
  p.getTimezoneAbbr = getTimezoneAbbr;
  return exports;
}

/**
 * The initial timezone of the process. This env var may initially be undefined,
 * in which case node-time will attempt to resolve and set the variable.
 */

exports.currentTimezone = process.env.TZ;

/**
 * Export the raw functions from the bindings.
 */

exports.time = bindings.time;
exports.localtime = bindings.localtime;
exports.mktime = bindings.mktime;

/**
 * A "hack" of sorts to force getting our own Date instance.
 * Otherwise, in normal cases, the global Natives are shared between
 * contexts (not what we want)...
 */

var _Date = process.env.NODE_MODULE_CONTEXTS
  ? Date
  : require('vm').runInNewContext("Date");

/**
 * Add the node-time extensions (setTimezone(), etc.)
 */

exports(_Date);

/**
 * During startup, we synchronously attempt to determine the location of the
 * timezone dir, or TZDIR on some systems. This isn't necessary for the
 * C bindings, however it's needed for the `listTimezones()` function and for
 * resolving the 'initial' timezone to use.
 */

debug('attempting to resolve timezone directory.');
var possibleTzdirs = [
    '/usr/share/zoneinfo'
  , '/usr/lib/zoneinfo'
  , '/usr/share/lib/zoneinfo'
];
var TZDIR = process.env.TZDIR;
if (TZDIR) {
  debug('got env-defined TZDIR:', TZDIR);
  possibleTzdirs.unshift(TZDIR);
}
while (possibleTzdirs.length > 0) {
  var d = possibleTzdirs.shift();
  debug('checking if directory exists:', d);
  try {
    if (fs.statSync(d).isDirectory()) {
      TZDIR = d;
      break;
    }
  } catch (e) {
    debug(e);
  }
}
possibleTzdirs = null; // garbage collect
if (TZDIR) {
  debug('found timezone directory at:', TZDIR);
} else {
  debug('WARN: Could not find timezone directory. listTimezones() won\'t work');
}

/**
 * Older versions of node-time would require the user to have the TZ
 * environment variable set, otherwise undesirable results would happen. Now
 * node-time tries to automatically determine the current timezone for you.
 */

if (!exports.currentTimezone) {
  debug('`process.env.TZ` not initially set, attempting to resolve');
  try {
    var currentTimezonePath = fs.readlinkSync('/etc/localtime');
    if (currentTimezonePath.substring(0, TZDIR.length) === TZDIR) {
      // Got It!
      var zone = currentTimezonePath.substring(TZDIR.length + 1);
      exports.currentTimezone = process.env.TZ = zone;
      debug('resolved initial timezone:', zone);
    }
  } catch (e) {
    debug(e);
  }
}

if (!exports.currentTimezone) {
  debug('"currentTimezone" still not set. Checking "/etc/timezone"');
  try {
    var zone = fs.readFileSync('/etc/timezone', 'utf8').trim();
    exports.currentTimezone = process.env.TZ = zone;
    debug('resolved initial timezone:', zone);
  } catch (e) {
    debug(e);
  }
}

/**
 * The user-facing 'tzset' function is a thin wrapper around the native binding to
 * 'tzset()'. This function accepts a timezone String to set the process' timezone
 * to. Returns an object with the zoneinfo for the timezone.
 *
 * Throws (on *some* platforms) when the desired timezone could not be loaded.
 *
 * Sets the `currentTimezone` property on the exports.
 */

function tzset (tz) {
  if (tz) {
    process.env.TZ = tz;
  }
  var usedTz = process.env.TZ;
  var rtn = bindings.tzset();
  debug('set the current timezone to:', usedTz);
  if (!rtn.tzname[1] && rtn.timezone === 0) {
    debug('got bad zoneinfo object:', rtn);
    var err = new Error("Unknown Timezone: '" + usedTz + "'");
    for (var i in rtn) {
      err[i] = rtn[i];
    }
    throw err;
  }
  exports.currentTimezone = usedTz;
  exports._currentZoneinfo = rtn;
  return rtn;
}
exports.tzset = tzset;

/**
 * Lists the timezones that the current system can accept. It does this by going
 * on a recursive walk through the timezone dir and collecting filenames.
 */

function listTimezones () {
  if (arguments.length == 0) {
    throw new Error("You must set a callback");
  }
  if (typeof arguments[arguments.length - 1] != "function") {
    throw new Error("You must set a callback");
  }
  var cb = arguments[arguments.length - 1]
    , subset = (arguments.length > 1 ? arguments[0] : null)

  return listTimezonesFolder(subset ? subset + "/" : "", subset ? path.join(TZDIR, "/" + subset) : TZDIR, function (err, tzs) {
    if (err) return cb(err);
    cb(null, tzs.sort());
  });
}
exports.listTimezones = listTimezones;

function listTimezonesFolder(prefix, folder, cb) {
  var timezones = [];

  fs.readdir(folder, function (err, files) {
    if (err) return cb(err);

    var pending_stats = files.length;

    for (var i = 0; i < files.length; i++) {
      if (~TZ_BLACKLIST.indexOf(files[i])
          || files[i].indexOf(".") >= 0
          || files[i][0].toUpperCase() != files[i][0]) {
        pending_stats--;
        continue
      }
      fs.stat(path.join(folder, files[i]), (function (file) {
          return function (err, stats) {
            if (!err) {
              if (stats.isDirectory()) {
                listTimezonesFolder(prefix + file + "/", path.join(folder, file), function (err, tzs) {
                  if (!err) {
                    timezones = timezones.concat(tzs);
                  }
                  pending_stats--;
                  if (pending_stats == 0) cb(null, timezones);
                });
                return;
              }
              if (prefix.length > 0) timezones.push(prefix + file);
            }
            pending_stats--;
            if (pending_stats == 0) cb(null, timezones);
          };
        })(files[i]));
    }
  });
}

/**
 * The "setTimezone" function is the "entry point" for a Date instance.
 * It must be called after an instance has been created. After, the 'getSeconds()',
 * 'getHours()', 'getDays()', etc. functions will return values relative
 * to the time zone specified.
 */

function setTimezone (timezone, relative) {
  debug('Date#setTimezone(%s, %s)', timezone, relative);

  // If `true` is passed in as the second argument, then the Date instance
  // will have it's timezone set, but it's current local values will remain
  // the same (i.e. the Date's internal time value will be changed)
  var ms, s, m, h, d, mo, y
  if (relative) {
    y  = this.getFullYear()
    mo = this.getMonth()
    d  = this.getDate()
    h  = this.getHours()
    m  = this.getMinutes()
    s  = this.getSeconds()
    ms = this.getMilliseconds()
  }

  // If the current process timezone doesn't match the desired timezone, then call
  // tzset() to change the current timezone of the process.
  var oldTz = exports.currentTimezone
    , tz = exports._currentZoneinfo;
  if (!tz || oldTz !== timezone) {
    debug('current timezone is not "%s", calling tzset()', timezone);
    tz = exports.tzset(timezone);
  }

  // Get the zoneinfo for this Date instance's time value
  var zoneInfo = exports.localtime(this.getTime() / 1000);

  // Change the timezone back if we changed it originally
  if (oldTz != timezone) {
    debug('setting timezone back to "%s"', oldTz);
    exports.tzset(oldTz);
  }
  oldTz = null;

  // If we got to here without throwing an Error, then
  // a valid timezone was requested, and we should have
  // a valid zoneInfo Object.
  this.getTimezone = function getTimezone() {
    return timezone;
  }

  // Returns the day of the month (1-31) for the specified date according to local time.
  this.getDate = function getDate() {
    return zoneInfo.dayOfMonth;
  }
  // Returns the day of the week (0-6) for the specified date according to local time.
  this.getDay = function getDay() {
    return zoneInfo.dayOfWeek;
  }
  // Deprecated. Returns the year (usually 2-3 digits) in the specified date according
  // to local time. Use `getFullYear()` instead.
  this.getYear = function getYear() {
    return zoneInfo.year;
  }
  // Returns the year (4 digits for 4-digit years) of the specified date according to local time.
  this.getFullYear = function getFullYear() {
    return zoneInfo.year + 1900;
  }
  // Returns the hour (0-23) in the specified date according to local time.
  this.getHours = function getHours() {
    return zoneInfo.hours;
  }
  // Returns the minutes (0-59) in the specified date according to local time.
  this.getMinutes = function getMinutes() {
    return zoneInfo.minutes;
  }
  // Returns the month (0-11) in the specified date according to local time.
  this.getMonth = function getMonth() {
    return zoneInfo.month;
  }
  // Returns the seconds (0-59) in the specified date according to local time.
  this.getSeconds = function getSeconds() {
    return zoneInfo.seconds;
  }
  // Returns the timezone offset from GMT the Date instance currently is in,
  // in minutes. Also, left of GMT is positive, right of GMT is negative.
  this.getTimezoneOffset = function getTimezoneOffset() {
    return -zoneInfo.gmtOffset / 60;
  }
  // NON-STANDARD: Returns the abbreviation (e.g. EST, EDT) for the specified time zone.
  this.getTimezoneAbbr = function getTimezoneAbbr() {
    return tz.tzname[zoneInfo.isDaylightSavings ? 1 : 0];
  }

  // Sets day, month and year at once
  this.setAllDateFields = function setAllDateFields(y,mo,d) {
    return this.setFullYear(y,mo,d);
  }
  // Sets the day of the month (from 1-31) in the current timezone
  this.setDate = function setDate(d) {
    zoneInfo.dayOfMonth = d;
    return mktime.call(this);
  }
  // Sets the year (four digits) in the current timezone
  this.setFullYear = function setFullYear(y,mo,d) {
    zoneInfo.year = y - 1900;
    if(arguments.length > 1)
      zoneInfo.month = mo;
    if(arguments.length > 2)
      zoneInfo.dayOfMonth = d;
    return mktime.call(this);
  }
  // Sets the hour (from 0-23) in the current timezone
  this.setHours = function setHours(h,m,s,ms) {
    zoneInfo.hours = h;
    if(arguments.length > 1)
      zoneInfo.minutes = m;
    if(arguments.length > 2)
      zoneInfo.seconds = s;
    if(arguments.length > 3) {
      mktime.call(this);
      var diff = ms - this.getMilliseconds();
      return this.setTime(this.getTime() + diff);
    } else
      return mktime.call(this);
  }
  // Sets the milliseconds (from 0-999) in the current timezone
  this.setMilliseconds = function setMilliseconds(ms) {
    var diff = ms - this.getMilliseconds();
    return this.setTime(this.getTime() + diff);
  }
  // Set the minutes (from 0-59) in the current timezone
  this.setMinutes = function setMinutes(m,s,ms) {
    zoneInfo.minutes = m;
    if(arguments.length > 1)
      zoneInfo.seconds = s;
    if(arguments.length > 2) {
      mktime.call(this);
      var diff = ms - this.getMilliseconds();
      return this.setTime(this.getTime() + diff);
    } else
      return mktime.call(this);
  }
  // Sets the month (from 0-11) in the current timezone
  this.setMonth = function setMonth(mo,d) {
    zoneInfo.month = mo;
    if(arguments.length > 1)
      zoneInfo.dayOfMonth = d;
    return mktime.call(this);
  }
  // Sets the seconds (from 0-59) in the current timezone
  this.setSeconds = function setSeconds(s,ms) {
    zoneInfo.seconds = s;
    if(arguments.length > 1) {
      mktime.call(this);
      var diff = ms - this.getMilliseconds();
      return this.setTime(this.getTime() + diff);
    } else
      return mktime.call(this);
  }
  // Sets a date and time by adding or subtracting a specified number of
  // milliseconds to/from midnight January 1, 1970.
  this.setTime = function setTime(v) {
    var rtn = _Date.prototype.setTime.call(this, v);
    // Since this function changes the internal UTC epoch date value, we need to
    // re-setup these timezone translation functions to reflect the new value
    reset.call(this);
    return rtn;
  }
  // Sets the day of the month, according to universal time (from 1-31)
  this.setUTCDate = function setUTCDate(d) {
    var rtn = _Date.prototype.setUTCDate.call(this, d);
    reset.call(this);
    return rtn;
  }
  // Sets the year, according to universal time (four digits)
  this.setUTCFullYear = function setUTCFullYear(y,mo,d) {
    var rtn;
    switch(arguments.length) {
      case 1:
        rtn = _Date.prototype.setUTCFullYear.call(this, y); break;
      case 2:
        rtn = _Date.prototype.setUTCFullYear.call(this, y,mo); break;
      case 3:
        rtn = _Date.prototype.setUTCFullYear.call(this, y,mo,d); break;
    }
    reset.call(this);
    return rtn;
  }
  // Sets the hour, according to universal time (from 0-23)
  this.setUTCHours = function setUTCHours(h,m,s,ms) {
    var rtn;
    switch(arguments.length) {
      case 1:
        rtn = _Date.prototype.setUTCHours.call(this, h); break;
      case 2:
        rtn = _Date.prototype.setUTCHours.call(this, h,m); break;
      case 3:
        rtn = _Date.prototype.setUTCHours.call(this, h,m,s); break;
      case 4:
        rtn = _Date.prototype.setUTCHours.call(this, h,m,s,ms); break;
    }
    reset.call(this);
    return rtn;
  }
  // Sets the milliseconds, according to universal time (from 0-999)
  this.setUTCMilliseconds = function setUTCMillseconds(ms) {
    var rtn = _Date.prototype.setUTCMilliseconds.call(this, ms);
    reset.call(this);
    return rtn;
  }
  // Set the minutes, according to universal time (from 0-59)
  this.setUTCMinutes = function setUTCMinutes(m,s,ms) {
    var rtn;
    switch(arguments.length) {
      case 1:
        rtn = _Date.prototype.setUTCMinutes.call(this, m); break;
      case 2:
        rtn = _Date.prototype.setUTCMinutes.call(this, m,s); break;
      case 3:
        rtn = _Date.prototype.setUTCMinutes.call(this, m,s,ms); break;
    }
    reset.call(this);
    return rtn;
  }
  // Sets the month, according to universal time (from 0-11)
  this.setUTCMonth = function setUTCMonth(mo,d) {
    var rtn;
    switch(arguments.length) {
      case 1:
        rtn = _Date.prototype.setUTCMonth.call(this, mo); break;
      case 2:
        rtn = _Date.prototype.setUTCMonth.call(this, mo,d); break;
    }
    reset.call(this);
    return rtn;
  }
  // Set the seconds, according to universal time (from 0-59)
  this.setUTCSeconds = function setUTCSeconds(s,ms) {
    var rtn;
    switch(arguments.length) {
      case 1:
        rtn = _Date.prototype.setUTCSeconds.call(this, s); break;
      case 2:
        rtn = _Date.prototype.setUTCSeconds.call(this, s,ms); break;
    }
    reset.call(this);
    return rtn;
  }

  this.toDateString = function toDateString() {
    return DAYS_OF_WEEK[this.getDay()].substring(0, 3) + ' ' + MONTHS[this.getMonth()].substring(0, 3) + ' ' + pad(this.getDate(), 2) + ' ' + this.getFullYear();
  }

  this.toTimeString = function toTimeString() {
    var offset = Math.abs(zoneInfo.gmtOffset / 60); // total minutes
    // split into HHMM:
    var hours = pad(Math.floor(offset / 60), 2);
    var minutes = pad(offset % 60, 2);
    return this.toLocaleTimeString() + ' GMT' + (zoneInfo.gmtOffset >= 0 ? '+' : '-') + hours + minutes
      + ' (' + tz.tzname[zoneInfo.isDaylightSavings ? 1 : 0] + ')';
  }

  this.toString = function toString() {
    return this.toDateString() + ' ' + this.toTimeString();
  }

  this.toLocaleDateString = function toLocaleDateString() {
    return DAYS_OF_WEEK[this.getDay()] + ', ' + MONTHS[this.getMonth()] + ' ' + pad(this.getDate(), 2) + ', ' + this.getFullYear();
  }

  this.toLocaleTimeString = function toLocaleTimeString() {
    return pad(this.getHours(), 2) + ':' + pad(this.getMinutes(), 2) + ':' + pad(this.getSeconds(), 2);
  }

  this.toLocaleString = this.toString;

  if (relative) {
    this.setAllDateFields(y,mo,d)
    this.setHours(h)
    this.setMinutes(m)
    this.setSeconds(s)
    this.setMilliseconds(ms)
    ms = s = m = h = d = mo = y = null
  }


  // Used internally by the 'set*' functions above...
  function reset () {
    this.setTimezone(this.getTimezone());
  }
  // 'mktime' calls 'reset' implicitly through 'setTime()'
  function mktime () {
    var oldTz = process.env.TZ;
    exports.tzset(this.getTimezone());
    zoneInfo.isDaylightSavings = -1; // Auto-detect the timezone
    var t = exports.mktime(zoneInfo);
    if (oldTz) {
      exports.tzset(oldTz);
      oldTz = null;
    }
    return this.setTime( (t * MILLIS_PER_SECOND) + this.getMilliseconds() );
  }

  return this;
}

// Returns a "String" of the last value set in "setTimezone".
// TODO: Return something when 'setTimezone' hasn't been called yet.
function getTimezone () {
  throw new Error('You must call "setTimezone(tz)" before "getTimezone()" may be called');
}

// NON-STANDARD: Returns the abbreviated timezone name, also taking daylight
// savings into consideration. Useful for the presentation layer of a Date
// instance.
function getTimezoneAbbr () {
  var str = this.toString().match(/\([A-Z]+\)/)[0];
  return str.substring(1, str.length-1);
}

// Export the modified 'Date' instance. Users should either use this with the
// 'new' operator, or extend an already existing Date instance with 'extend()'.
// An optional, NON-STANDARD, "timezone" argument may be appended as the final
// argument, in order to specify the initial timezone the Date instance should
// be created with.
function Date (year, month, day, hour, minute, second, millisecond, timezone) {
  if (!(this instanceof Date)) {
    return new Date(year, month, day, hour, minute, second, millisecond, timezone).toString();
  }
  var argc = arguments.length
    , d;
  // So that we don't have to do the switch block below twice!
  while (argc > 0 && typeof arguments[argc-1] === 'undefined') {
    argc--;
  }
  // An optional 'timezone' argument may be passed as the final argument
  if (argc >= 2 && typeof arguments[argc - 1] === 'string') {
    timezone = arguments[argc - 1];
    argc--;
  }
  // Ugly, but the native Date constructor depends on arguments.length in order
  // to create a Date instance in the intended fashion.
  switch (argc) {
    case 0:
      d = new _Date(); break;
    case 1:
      d = new _Date(year); break;
    case 2:
      d = new _Date(year, month); break;
    case 3:
      d = new _Date(year, month, day); break;
    case 4:
      d = new _Date(year, month, day, hour); break;
    case 5:
      d = new _Date(year, month, day, hour, minute); break;
    case 6:
      d = new _Date(year, month, day, hour, minute, second); break;
    case 7:
      d = new _Date(year, month, day, hour, minute, second, millisecond); break;
  }
  if (timezone) {
    // set time given timezone relative to the currently set local time
    // (changing the internal "time" milliseconds value unless ms specified)
    d.setTimezone(timezone, !(argc == 1 && typeof year === 'number'));
  } else {
    d.setTimezone(exports.currentTimezone);
  }
  return d;
}
Date.prototype = _Date.prototype;
exports.Date = Date;


// We also overwrite `Date.parse()`. It can accept an optional 'timezone'
// second argument.
function parse (dateStr, timezone) {
  return new Date(dateStr, timezone).getTime();
}
exports.parse = parse;

// 'now()', 'parse()', and 'UTC()' all need to be re-defined on Date as don't enum
Object.defineProperty(Date, 'now', { value: _Date.now, writable: true, enumerable: false });
Object.defineProperty(Date, 'parse', { value: parse, writable: true, enumerable: false });
Object.defineProperty(Date, 'UTC', { value: _Date.UTC, writable: true, enumerable: false });



// Turns a "regular" Date instance into one of our "extended" Date instances.
// The return value is negligible, as the original Date instance is modified.
// DEPRECATED: Just extend the Date's prototype using the Date-extend function.
exports.extend = function extend (date) {
  if (!date) return date;
  date.getTimezone = getTimezone;
  date.setTimezone = setTimezone;
  date.getTimezoneAbbr = getTimezoneAbbr;
  return date;
}


/**
 * Pads a number with 0s if required.
 */

function pad (num, padLen) {
  var padding = '0000';
  num = String(num);
  return padding.substring(0, padLen - num.length) + num;
}

}).call(this,require('_process'))
},{"_process":7,"bindings":3,"debug":4,"fs":5,"path":6,"vm":8}],3:[function(require,module,exports){
(function (process,__filename){

/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path')
  , join = path.join
  , dirname = path.dirname
  , exists = fs.existsSync || path.existsSync
  , defaults = {
        arrow: process.env.NODE_BINDINGS_ARROW || ' → '
      , compiled: process.env.NODE_BINDINGS_COMPILED_DIR || 'compiled'
      , platform: process.platform
      , arch: process.arch
      , version: process.versions.node
      , bindings: 'bindings.node'
      , try: [
          // node-gyp's linked version in the "build" dir
          [ 'module_root', 'build', 'bindings' ]
          // node-waf and gyp_addon (a.k.a node-gyp)
        , [ 'module_root', 'build', 'Debug', 'bindings' ]
        , [ 'module_root', 'build', 'Release', 'bindings' ]
          // Debug files, for development (legacy behavior, remove for node v0.9)
        , [ 'module_root', 'out', 'Debug', 'bindings' ]
        , [ 'module_root', 'Debug', 'bindings' ]
          // Release files, but manually compiled (legacy behavior, remove for node v0.9)
        , [ 'module_root', 'out', 'Release', 'bindings' ]
        , [ 'module_root', 'Release', 'bindings' ]
          // Legacy from node-waf, node <= 0.4.x
        , [ 'module_root', 'build', 'default', 'bindings' ]
          // Production "Release" buildtype binary (meh...)
        , [ 'module_root', 'compiled', 'version', 'platform', 'arch', 'bindings' ]
        ]
    }

/**
 * The main `bindings()` function loads the compiled bindings for a given module.
 * It uses V8's Error API to determine the parent filename that this function is
 * being invoked from, which is then used to find the root directory.
 */

function bindings (opts) {

  // Argument surgery
  if (typeof opts == 'string') {
    opts = { bindings: opts }
  } else if (!opts) {
    opts = {}
  }
  opts.__proto__ = defaults

  // Get the module root
  if (!opts.module_root) {
    opts.module_root = exports.getRoot(exports.getFileName())
  }

  // Ensure the given bindings name ends with .node
  if (path.extname(opts.bindings) != '.node') {
    opts.bindings += '.node'
  }

  var tries = []
    , i = 0
    , l = opts.try.length
    , n
    , b
    , err

  for (; i<l; i++) {
    n = join.apply(null, opts.try[i].map(function (p) {
      return opts[p] || p
    }))
    tries.push(n)
    try {
      b = opts.path ? require.resolve(n) : require(n)
      if (!opts.path) {
        b.path = n
      }
      return b
    } catch (e) {
      if (!/not find/i.test(e.message)) {
        throw e
      }
    }
  }

  err = new Error('Could not locate the bindings file. Tried:\n'
    + tries.map(function (a) { return opts.arrow + a }).join('\n'))
  err.tries = tries
  throw err
}
module.exports = exports = bindings


/**
 * Gets the filename of the JavaScript file that invokes this function.
 * Used to help find the root directory of a module.
 * Optionally accepts an filename argument to skip when searching for the invoking filename
 */

exports.getFileName = function getFileName (calling_file) {
  var origPST = Error.prepareStackTrace
    , origSTL = Error.stackTraceLimit
    , dummy = {}
    , fileName

  Error.stackTraceLimit = 10

  Error.prepareStackTrace = function (e, st) {
    for (var i=0, l=st.length; i<l; i++) {
      fileName = st[i].getFileName()
      if (fileName !== __filename) {
        if (calling_file) {
            if (fileName !== calling_file) {
              return
            }
        } else {
          return
        }
      }
    }
  }

  // run the 'prepareStackTrace' function above
  Error.captureStackTrace(dummy)
  dummy.stack

  // cleanup
  Error.prepareStackTrace = origPST
  Error.stackTraceLimit = origSTL

  return fileName
}

/**
 * Gets the root directory of a module, given an arbitrary filename
 * somewhere in the module tree. The "root directory" is the directory
 * containing the `package.json` file.
 *
 *   In:  /home/nate/node-native-module/lib/index.js
 *   Out: /home/nate/node-native-module
 */

exports.getRoot = function getRoot (file) {
  var dir = dirname(file)
    , prev
  while (true) {
    if (dir === '.') {
      // Avoids an infinite loop in rare cases, like the REPL
      dir = process.cwd()
    }
    if (exists(join(dir, 'package.json')) || exists(join(dir, 'node_modules'))) {
      // Found the 'package.json' file or 'node_modules' dir; we're done
      return dir
    }
    if (prev === dir) {
      // Got to the top
      throw new Error('Could not find module root given file: "' + file
                    + '". Do you have a `package.json` file? ')
    }
    // Try the parent dir next
    prev = dir
    dir = join(dir, '..')
  }
}

}).call(this,require('_process'),"/node_modules/time/node_modules/bindings/bindings.js")
},{"_process":7,"fs":5,"path":6}],4:[function(require,module,exports){

/**
 * Expose `debug()` as the module.
 */

module.exports = debug;

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug(name) {
  if (!debug.enabled(name)) return function(){};

  return function(fmt){
    fmt = coerce(fmt);

    var curr = new Date;
    var ms = curr - (debug[name] || curr);
    debug[name] = curr;

    fmt = name
      + ' '
      + fmt
      + ' +' + debug.humanize(ms);

    // This hackery is required for IE8
    // where `console.log` doesn't have 'apply'
    window.console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }
}

/**
 * The currently active debug mode names.
 */

debug.names = [];
debug.skips = [];

/**
 * Enables a debug mode by name. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} name
 * @api public
 */

debug.enable = function(name) {
  try {
    localStorage.debug = name;
  } catch(e){}

  var split = (name || '').split(/[\s,]+/)
    , len = split.length;

  for (var i = 0; i < len; i++) {
    name = split[i].replace('*', '.*?');
    if (name[0] === '-') {
      debug.skips.push(new RegExp('^' + name.substr(1) + '$'));
    }
    else {
      debug.names.push(new RegExp('^' + name + '$'));
    }
  }
};

/**
 * Disable debug output.
 *
 * @api public
 */

debug.disable = function(){
  debug.enable('');
};

/**
 * Humanize the given `ms`.
 *
 * @param {Number} m
 * @return {String}
 * @api private
 */

debug.humanize = function(ms) {
  var sec = 1000
    , min = 60 * 1000
    , hour = 60 * min;

  if (ms >= hour) return (ms / hour).toFixed(1) + 'h';
  if (ms >= min) return (ms / min).toFixed(1) + 'm';
  if (ms >= sec) return (ms / sec | 0) + 's';
  return ms + 'ms';
};

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

debug.enabled = function(name) {
  for (var i = 0, len = debug.skips.length; i < len; i++) {
    if (debug.skips[i].test(name)) {
      return false;
    }
  }
  for (var i = 0, len = debug.names.length; i < len; i++) {
    if (debug.names[i].test(name)) {
      return true;
    }
  }
  return false;
};

/**
 * Coerce `val`.
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

// persist

try {
  if (window.localStorage) debug.enable(localStorage.debug);
} catch(e){}

},{}],5:[function(require,module,exports){

},{}],6:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":7}],7:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],8:[function(require,module,exports){
var indexOf = require('indexof');

var Object_keys = function (obj) {
    if (Object.keys) return Object.keys(obj)
    else {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    }
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

var defineProp = (function() {
    try {
        Object.defineProperty({}, '_', {});
        return function(obj, name, value) {
            Object.defineProperty(obj, name, {
                writable: true,
                enumerable: false,
                configurable: true,
                value: value
            })
        };
    } catch(e) {
        return function(obj, name, value) {
            obj[name] = value;
        };
    }
}());

var globals = ['Array', 'Boolean', 'Date', 'Error', 'EvalError', 'Function',
'Infinity', 'JSON', 'Math', 'NaN', 'Number', 'Object', 'RangeError',
'ReferenceError', 'RegExp', 'String', 'SyntaxError', 'TypeError', 'URIError',
'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape',
'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'undefined', 'unescape'];

function Context() {}
Context.prototype = {};

var Script = exports.Script = function NodeScript (code) {
    if (!(this instanceof Script)) return new Script(code);
    this.code = code;
};

Script.prototype.runInContext = function (context) {
    if (!(context instanceof Context)) {
        throw new TypeError("needs a 'context' argument.");
    }
    
    var iframe = document.createElement('iframe');
    if (!iframe.style) iframe.style = {};
    iframe.style.display = 'none';
    
    document.body.appendChild(iframe);
    
    var win = iframe.contentWindow;
    var wEval = win.eval, wExecScript = win.execScript;

    if (!wEval && wExecScript) {
        // win.eval() magically appears when this is called in IE:
        wExecScript.call(win, 'null');
        wEval = win.eval;
    }
    
    forEach(Object_keys(context), function (key) {
        win[key] = context[key];
    });
    forEach(globals, function (key) {
        if (context[key]) {
            win[key] = context[key];
        }
    });
    
    var winKeys = Object_keys(win);

    var res = wEval.call(win, this.code);
    
    forEach(Object_keys(win), function (key) {
        // Avoid copying circular objects like `top` and `window` by only
        // updating existing context properties or new properties in the `win`
        // that was only introduced after the eval.
        if (key in context || indexOf(winKeys, key) === -1) {
            context[key] = win[key];
        }
    });

    forEach(globals, function (key) {
        if (!(key in context)) {
            defineProp(context, key, win[key]);
        }
    });
    
    document.body.removeChild(iframe);
    
    return res;
};

Script.prototype.runInThisContext = function () {
    return eval(this.code); // maybe...
};

Script.prototype.runInNewContext = function (context) {
    var ctx = Script.createContext(context);
    var res = this.runInContext(ctx);

    forEach(Object_keys(ctx), function (key) {
        context[key] = ctx[key];
    });

    return res;
};

forEach(Object_keys(Script.prototype), function (name) {
    exports[name] = Script[name] = function (code) {
        var s = Script(code);
        return s[name].apply(s, [].slice.call(arguments, 1));
    };
});

exports.createScript = function (code) {
    return exports.Script(code);
};

exports.createContext = Script.createContext = function (context) {
    var copy = new Context();
    if(typeof context === 'object') {
        forEach(Object_keys(context), function (key) {
            copy[key] = context[key];
        });
    }
    return copy;
};

},{"indexof":9}],9:[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}]},{},[1])(1)
});