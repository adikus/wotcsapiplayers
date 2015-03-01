var cls = require("./../lib/class");
var _ = require("underscore");
var config = require('./../config');
var DB = require("./../core/db");
var Logger = require('./../core/logger');

module.exports = StatsManager = cls.Class.extend({
    init: function (parent, stats) {
        this.parent = parent;
        this.logger = new Logger('StatsManager(' + this.parent.type + '|' + this.parent.wid + ')');

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
        this.stats['WN8'] = this.calculateWN8();
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
        var wid = this.parent.wid;

        DB.Stat.findOne({_id: wid}, function (err, doc) {
            if (err) {
                self.logger.error(err.message);
            }
            if(!doc){
                doc = new DB.Stat({
                    _id: wid,
                    s: {d: self.stats}
                });
                self.logger.debug('Created daily stats');
            }else{
                doc = self.updateDailyStats(doc);
            }
            if (self.stats.u.getDay() == 6) {
                self.updateWeeklyStats(doc);
            }
            if (self.stats.member_count)doc.SC = self.stats.SC3;
            doc.markModified('s');
            doc.save(function (err) {
                if (err)self.logger.error(err.message);
                if (callback)callback();
            });
        });
    },

    updateDailyStats: function(doc) {
        if(this.dateMonthTS(_.last(doc.s.d.u)) == this.dateMonthTS(this.stats.u)){
            this.logger.debug('Updated daily stats');
            this.rewriteLastStat(doc.s.d);
        }else{
            this.logger.debug('Pushed new daily stats');
            this.pushNewStat(doc.s.d);
        }
        return doc;
    },

    updateWeeklyStats: function(doc) {
        if (!doc.s.w) {
            doc.s.w = this.stats;
            this.logger.debug('Created weekly stats');
        } else {
            if (this.dateMonthTS(_.last(doc.s.w.u)) == this.dateMonthTS(this.stats.u)) {
                this.logger.debug('Updated weekly stats');
                this.rewriteLastStat(doc.s.w);
            } else {
                this.logger.debug('Pushed new weekly stats');
                this.pushNewStat(doc.s.w);
            }
        }
        return doc;
    },

    rewriteLastStat: function(stats) {
        _(this.stats).each(function (value, key) {
            if (!stats[key])this.initializeStat(stats, key, stats.u.length);
            stats[key][stats[key].length - 1] = this.stats[key];
        }, this);
    },

    pushNewStat: function(stats) {
        _(this.stats).each(function (value, key) {
            if (!stats[key])this.initializeStat(stats, key, stats.u.length);
            stats[key].push(this.stats[key]);
            if(stats[key].length > config.stats.maxDays)stats[key].shift();
        }, this);
    },

    initializeStat: function(stats, key, n) {
        stats[key] = _(n).times(function () { return 0; });
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

    calculateWN8: function() {
        var expected_values = this.parent.vehicleManager.getExpectedValues();
        var stats = this.stats;

        var rDAMAGE = (stats.DMG/stats.GPL)  / (expected_values.damage/stats.GPL);
        var rSPOT   = (stats.SPT/stats.GPL) / (expected_values.spotted/stats.GPL);
        var rFRAG   = (stats.FRG/stats.GPL)   / (expected_values.frags/stats.GPL);
        var rDEF    = (stats.DPT/stats.GPL) / (expected_values.defence/stats.GPL);
        var rWIN    = (stats.WIN/stats.GPL)    / (expected_values.wins/stats.GPL);
        var rWINc   = Math.max(0,                     (rWIN    - 0.71) / (1 - 0.71) );
        var rDAMAGEc= Math.max(0,                     (rDAMAGE - 0.22) / (1 - 0.22) );
        var rFRAGc  = Math.max(0, Math.min(rDAMAGEc + 0.2, (rFRAG   - 0.12) / (1 - 0.12)));
        var rSPOTc  = Math.max(0, Math.min(rDAMAGEc + 0.1, (rSPOT   - 0.38) / (1 - 0.38)));
        var rDEFc   = Math.max(0, Math.min(rDAMAGEc + 0.1, (rDEF    - 0.10) / (1 - 0.10)));
        var WN8 = 980*rDAMAGEc + 210*rDAMAGEc*rFRAGc + 155*rFRAGc*rSPOTc + 75*rDEFc*rFRAGc + 145*Math.min(1.8,rWINc);
        if( isNaN(WN8)){ WN8 = 0;}
        return WN8;
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

StatsManager.stats = ['GPL', 'WIN', 'DEF', 'SUR', 'FRG', 'SPT', 'ACR', 'DMG', 'CPT', 'DPT', 'EXP', 'WN7', 'WN8', 'EFR', 'SC3'];
