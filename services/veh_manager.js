var cls = require("./../lib/class");
var _ = require("underscore");
var VehicleData = require('./veh_data');

module.exports = VehManager = cls.Class.extend({
    init: function (parent) {
        this.parent = parent;

        this.topTiers = {};

        if (this.parent.doc && this.parent.doc.v) {
            this.vehicles = _(this.parent.doc.v).map(function (tank) {
                var finalTank = {
                    stats: {wins: tank.w, battles: tank.b},
                    info: VehicleData.find(tank.t)
                };

                this.topTiers[finalTank.info.type] = finalTank.info.level;

                return finalTank;
            }, this);
        } else {
            this.vehicles = [];
        }
    },

    parse: function (data) {
        this.best = null;
        this.totalBattles = 0;
        this.totalTierBattles = 0;
        this.topTiers = {};

        this.vehicles = _(data).map(function (tank) {
            var finalTank = {
                stats: {
                    wins: tank.statistics.wins,
                    battles: tank.statistics.battles,
                    mark_of_mastery: tank.mark_of_mastery
                },
                info: VehicleData.find(tank.tank_id)
            };

            if (!finalTank.info) {
                console.log('Unknown tank id:', tank.tank_id);
            }

            var tier = (finalTank.info && finalTank.info.level) || 0;
            if (tier) {
                this.totalBattles += finalTank.stats.battles;
                this.totalTierBattles += finalTank.stats.battles * tier;

                if (tier > (this.topTiers[finalTank.info.type] || 0)) {
                    this.topTiers[finalTank.info.type] = tier;
                }
            }

            return finalTank;
        }, this);

        return this;
    },

    getData: function () {
        return _(this.getBest()).map(function (tank) {
            return {
                t: (tank.info && tank.info.tank_id) || -1,
                w: tank.stats.wins,
                b: tank.stats.battles,
                u: new Date()
            };
        });
    },

    getBest: function () {
        if (!this.best) {
            this.best = _(this.vehicles).filter(function (tank) {
                return tank.info && tank.info.level == this.topTiers[tank.info.type];
            }, this);
        }
        return this.best;
    },

    getBestFormatted: function () {
        return _(this.getBest()).chain().map(function (tank) {
            return this.formatTank(tank);
        }, this).groupBy('type').pairs().map(function (pair) {
            var type = pair[0];
            var tanks = pair[1];
            return [type, {tier: this.topTiers[this.TYPES[type]], tanks: tanks}];
        }, this).object().value();
    },

    formatTank: function (tank) {
        return {
            wins: tank.stats.wins,
            battles: tank.stats.battles,
            nation: this.parseNation(tank.info.nation),
            tier: tank.info.level,
            icon: tank.info.contour_image,
            short_name: tank.info.short_name_i18n,
            name: tank.info.name_i18n,
            type: this.parseType(tank.info.type)
        };
    },

    getAverageTier: function () {
        return this.totalTierBattles / this.totalBattles;
    },

    getScore: function () {
        return _(this.vehicles).reduce(function (memo, tank) {
            if (!tank.info) {
                return memo;
            }

            var percentage = tank.stats.wins / tank.stats.battles * 100;
            var factor = (percentage - 35) / 15 * Math.min(tank.stats.battles, 75) / 75;
            var score = 0;

            var type = this.parseType(tank.info.type);
            var level = tank.info.level;

            if (level == 10 && type == 1) {
                score = 1000 * factor;
            } else if (level == 10 && type == 2) {
                score = 1000 * factor;
            } else if (level == 10 && type == 3) {
                score = 900 * factor;
            } else if (level == 10 && type == 4) {
                score = 900 * factor;
            }
            return memo + score;
        }, 0, this);
    },

    TYPES: ['lightTank', 'mediumTank', 'heavyTank', 'AT-SPG', 'SPG'],

    parseType: function (t) {
        switch (t) {
            case 'lightTank':
                return 0;
                break;
            case 'mediumTank':
                return 1;
                break;
            case 'heavyTank':
                return 2;
                break;
            case 'AT-SPG':
                return 3;
                break;
            case 'SPG':
                return 4;
                break;
            default:
                return 5;
        }
    },

    parseNation: function (n) {
        switch (n) {
            case 'ussr':
                return 1;
                break;
            case 'germany':
                return 2;
                break;
            case 'usa':
                return 3;
                break;
            case 'china':
                return 4;
                break;
            case 'france':
                return 5;
                break;
            case 'uk':
                return 6;
                break;
            case 'japan':
                return 7;
                break;
        }
    }
});
