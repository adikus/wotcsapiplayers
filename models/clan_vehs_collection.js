var cls = require("./../lib/class");
var _ = require("underscore");

module.exports = ClanVehsCollection = cls.Class.extend({
    init: function () {
        this.vehs = {0: [], 1: [], 2: [], 3: [], 4: []};
    },

    addVehs: function (data) {
        var vehs = data.vehs;

        _.each(vehs, function (typeVehs, type) {
            _.each(typeVehs.tanks, function (veh) {
                if (veh.tier == 10) {
                    var found = _(this.vehs[type]).any(function (clanVeh) {
                        if (veh.id == clanVeh.id) {
                            clanVeh.battles += veh.battles;
                            clanVeh.wins += veh.wins;
                            clanVeh.count++;
                            return true;
                        }
                        return false;
                    });
                    if (!found) {
                        var newVeh = _.clone(veh);
                        newVeh.count = 1;
                        delete newVeh.updated_at;

                        this.vehs[type].push(newVeh);
                    }
                }
            }, this);
        }, this);
    },

    getData: function() {
        return this.vehs;
    }
});
