// Generated by CoffeeScript 1.9.0
var Event, RRule, americano, iCalDurationToUnitValue, moment;

americano = require('americano-cozy');

moment = require('moment-timezone');

RRule = require('rrule').RRule;

module.exports = Event = americano.getModel('Event', {
  start: {
    type: String
  },
  end: {
    type: String
  },
  place: {
    type: String
  },
  details: {
    type: String
  },
  description: {
    type: String
  },
  rrule: {
    type: String
  },
  tags: {
    type: function(x) {
      return x;
    }
  },
  attendees: {
    type: [Object]
  },
  related: {
    type: String,
    "default": null
  },
  timezone: {
    type: String
  },
  alarms: {
    type: [Object]
  }
});

Event.dateFormat = 'YYYY-MM-DD';

Event.ambiguousDTFormat = 'YYYY-MM-DDTHH:mm:00.000';

Event.utcDTFormat = 'YYYY-MM-DDTHH:mm:00.000Z';

Event.alarmTriggRegex = /(\+?|-)PT?(\d+)(W|D|H|M|S)/;

Event.all = function(params, callback) {
  return Event.request("all", params, callback);
};

Event.prototype.isRecurring = function() {
  return (this.rrule != null) && this.rrule.length > 0;
};

Event.prototype.isAllDay = function() {
  return this.start.length === 10;
};

iCalDurationToUnitValue = function(s) {
  var m, o;
  m = s.match(/(\d+)(W|D|H|M|S)/);
  o = {};
  o[m[2].toLowerCase()] = parseInt(m[1]);
  return o;
};

Event.prototype._getRecurringStartDates = function(startingBound, endingBound) {
  var fixDSTTroubles, options, rrule, startDates, startJsDate, startMDate, starts;
  starts = [];
  if (!this.isRecurring()) {
    return starts;
  }
  startMDate = moment.tz(this.start, this.timezone);
  startJsDate = new Date(startMDate.toISOString());
  options = RRule.parseString(this.rrule);
  options.dtstart = startJsDate;
  rrule = new RRule(options);
  fixDSTTroubles = (function(_this) {
    return function(rruleStartJsDate) {
      var diff, startRealMDate;
      startRealMDate = moment.tz(rruleStartJsDate.toISOString(), _this.timezone);
      diff = startMDate.hour() - startRealMDate.hour();
      if (diff === 23) {
        diff = -1;
      } else if (diff === -23) {
        diff = 1;
      }
      startRealMDate.add(diff, 'hours');
      return startRealMDate;
    };
  })(this);
  startDates = rrule.between(startingBound.toDate(), endingBound.toDate()).map(fixDSTTroubles);
  return startDates;
};

Event.prototype.getAlarms = function(userTimezone) {
  var alarm, alarms, cozyAlarm, duration, endDate, event, in24h, key, now, startDate, startDates, trigg, unitValues, value, _i, _j, _len, _len1, _ref, _ref1;
  alarms = [];
  _ref1 = (_ref = this.alarms) != null ? _ref.items : void 0;
  for (key = _i = 0, _len = _ref1.length; _i < _len; key = ++_i) {
    alarm = _ref1[key];
    startDates = [];
    if (this.isRecurring()) {
      now = moment().tz(userTimezone);
      in24h = moment(now).add(1, 'days');
      startDates = this._getRecurringStartDates(now, in24h);
    } else {
      startDates = [moment.tz(this.start, 'UTC')];
    }
    for (_j = 0, _len1 = startDates.length; _j < _len1; _j++) {
      startDate = startDates[_j];
      startDate.tz(userTimezone);
      trigg = startDate.clone();
      unitValues = iCalDurationToUnitValue(alarm.trigg);
      for (key in unitValues) {
        value = unitValues[key];
        trigg.subtract(value, key);
      }
      cozyAlarm = {
        _id: this._id + "_" + alarm.id,
        action: alarm.action,
        trigg: trigg.toISOString(),
        description: this.description
      };
      duration = moment(this.end).diff(moment(this.start), 'seconds');
      endDate = startDate.clone().add(duration, 'seconds');
      event = {
        start: startDate,
        end: endDate,
        place: this.place,
        details: this.details,
        description: this.description,
        tags: this.tags
      };
      cozyAlarm.event = event;
      alarms.push(cozyAlarm);
    }
  }
  return alarms;
};
