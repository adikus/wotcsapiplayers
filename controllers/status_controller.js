var cls     = require("./../lib/class");
var _       = require("underscore");
var DB      = require('./../core/db');

module.exports = StatusController = cls.Class.extend({
    index: function(req, callback) {
        var status = {updated: _.object(_(12).times(function (n) { return [(n+1)+'h', 0]; }))};

        DB.PlayerStatus.find(function(err, docs){
            _.each(docs,function(doc){
                var key = doc._id.toString()+"h";
                if(key == "0h"){
                    status.total = doc.value;
                }
                if(status.updated[key] != undefined){
                    status.updated[key] = doc.value;
                }
            });
            for(var i=12; i>1; i--){
                status.updated[i+"h"] -= status.updated[(i-1)+"h"];
            }
            callback(err, status);
        });
    },

    errors: function(req, callback) {
        var skip = req.query.s || -1;

        DB.ErrorLog.find().sort("-t").skip(skip>=0?skip:0).limit(skip>=0?1:1000).exec(function(err, errors){
            callback(err, _(errors).map(function(error){
                return {
                    error: error.e.split("\n")[0],
                    stack_trace: error.e.split("\n").slice(1),
                    time: error.t
                }
            }));
        });
	}
});
