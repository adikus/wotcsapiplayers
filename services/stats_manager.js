var cls = require("./../lib/class");
var _ = require("underscore");
var config = require('./../config');
var DB = require("./../core/db");

module.exports = StatsManager = cls.Class.extend({
    init: function (parent, stats) {
        this.parent = parent;

        this.stats = stats || this.parent.doc.sc;
    },

    parse: function (data) {
        this.stats["GPL"] = data.battles;
        this.stats["WIN"] = data.wins;
        this.stats["DEF"] = data.losses;
        this.stats["SUR"] = data.survived_battles;
        this.stats["FRG"] = data.frags;
        this.stats["SPT"] = data.spotted;
        this.stats["ACR"] = data.hits / data.shots * 100;
        this.stats["DMG"] = data.damage_dealt;
        this.stats["CPT"] = data.capture_points;
        this.stats["DPT"] = data.dropped_capture_points;
        this.stats["EXP"] = data.xp;

        this.stats['WN7'] = this.calculateWN7();
        this.stats['EFR'] = this.calculateEFR();
        this.stats['SC3'] = this.calculateSC3();

        _(this.stats).each(function (value, key) {
            if (this.isFloat(value)) {
                this.stats[key] = value.toFixed(2);
            }
        }, this);

        this.stats.u = new Date();

        return this;
    },

    getData: function () {
        return this.stats;
    },

    getStatsFromDB: function (wid, callback) {
        DB.Stat.findOne({_id: wid}, function (err, doc) {
            if (err) {
                callback(err, null);
            }
            else if (doc) {
                doc.s.d.updated_at = doc.s.d.u;
                delete doc.s.d.u;
                doc.s.days = doc.s.d;
                delete doc.s.d;
                if (doc.s.w) {
                    doc.s.w.updated_at = doc.s.w.u;
                    delete doc.s.w.u;
                    doc.s.weeks = doc.s.w;
                    delete doc.s.w;
                }
                callback(null, doc.s);
            } else callback({message: "Not found."}, null);
        });
    },

    isFloat: function (n) {
        return typeof n === 'number' && !(n % 1 === 0);
    },

    save: function (callback) {
        var self = this;
        var status = "";
        var wid = this.parent.wid;

        DB.Stat.findOne({_id: wid}, function (err, doc) {
            if (err) {
                console.log(err);
            }
            if (!doc) {
                var stats = {};
                for (var i in self.stats)stats[i] = [self.stats[i]];
                doc = new DBTypes.Stat({
                    _id: wid,
                    s: {d: stats}
                });
                status += " created-d";
            } else {
                if (self.dateMonthTS(_.last(doc.s.d.u)) == self.dateMonthTS(self.stats.u)) {
                    for (var i in self.stats)if (doc.s.d[i])doc.s.d[i][doc.s.d[i].length - 1] = self.stats[i];
                    doc.markModified('s');
                    status += " updated-d";
                } else {
                    for (var i in self.stats)if (doc.s.d[i])doc.s.d[i].push(self.stats[i]);
                    if (doc.s.d.u.length > config.stats.maxDays)for (var i in self.stats)if (doc.s.d[i])doc.s.d[i].shift();
                    doc.markModified('s');
                    status += " pushed-d";
                }
            }
            if (self.stats.u.getDay() == 6) {
                if (!doc.s.w) {
                    var stats = {};
                    for (var i in self.stats)stats[i] = [self.stats[i]];
                    doc.s.w = stats;
                    status += " created-w";
                } else {
                    if (self.dateMonthTS(_.last(doc.s.w.u)) == self.dateMonthTS(self.stats.u)) {
                        for (var i in self.stats)if (doc.s.w[i])doc.s.w[i][doc.s.w[i].length - 1] = self.stats[i];
                        doc.markModified('s');
                        status += " updated-w";
                    } else {
                        for (var i in self.stats)if (doc.s.w[i])doc.s.w[i].push(self.stats[i]);
                        if (doc.s.w.u.length > config.stats.maxWeeks)for (var i in self.stats)if (doc.s.w[i])doc.s.w[i].shift();
                        doc.markModified('s');
                        status += " pushed-w";
                    }
                }
            }
            if (self.stats.member_count)doc.SC = self.stats.SC3;
            doc.save(function (err) {
                if (err)console.log(err);
                //console.log("Stats"+status+": "+wid);
                if (callback)callback();
            });
        });
    },

    dateMonthTS: function (date) {
        return date.getDate() + "-" + date.getMonth();
    },

    calculateWN7: function () {
        var stats = this.stats;
        var avTier = this.parent.vehicleManager.getAverageTier();

        var wn7 = (1240 - 1040 / Math.pow(Math.min(avTier, 6), 0.164)) * stats['FRG'] / stats['GPL'];
        wn7 += stats['DMG'] / stats['GPL'] * 530 / (184 * Math.pow(Math.E, 0.24 * avTier) + 130);
        wn7 += stats['SPT'] / stats['GPL'] * 125 * Math.min(avTier, 3) / 3;
        wn7 += Math.min(stats['DPT'] / stats['GPL'], 2.2) * 100;
        wn7 += ((185 / (0.17 + Math.pow(Math.E, ((stats['WIN'] / stats['GPL'] * 100 - 35) * -0.134)))) - 500) * 0.45;
        wn7 += (5 - Math.min(avTier, 5)) * -125 / (1 + Math.pow(Math.E, ( ( avTier - Math.pow((stats['GPL'] / 220), (3 / avTier)) ) * 1.5 )));
        if (isNaN(wn7))wn7 = 0;

        return Math.round(wn7 * 100) / 100;
    },

    calculateEFR: function () {
        var stats = this.stats;
        var avTier = this.parent.vehicleManager.getAverageTier();

        if (avTier > 0)var f2 = 10 / (avTier + 2) * (0.23 + 2 * avTier / 100);
        else var f2 = 0;
        if (stats['GPL'] > 0)
            var efr = stats['FRG'] / stats['GPL'] * 250 +
                stats['DMG'] / stats['GPL'] * f2 +
                stats['SPT'] / stats['GPL'] * 150 +
                Math.log(stats['CPT'] / stats['GPL'] + 1) / Math.log(1.732) * 150 +
                stats['DPT'] / stats['GPL'] * 150;
        else var efr = 0;

        return Math.round(efr * 100) / 100;
    },

    calculateSC3: function () {
        var score = this.parent.vehicleManager.getScore();
        return Math.round(this.stats.WN7 / 1500 * score * 100) / 100;
    }
});
