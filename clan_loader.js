var cls = require("./lib/class"),
    _ = require("underscore"),
    DBTypes = require("./db_types"),
    Config = require("./config"),
    StatsManager = require("./stats_manager");
    
module.exports = ClanLoader = cls.Class.extend({
	init: function(wid){		
		this.lastAccessed = this.created = new Date();
		this.wid = parseInt(wid);
		this.reqsP = 0;
		this.savesP = 0;
		
		var self = this;		
		this.deleteInterval = setInterval(function(){
			self.checkDelete();
		},1000);
	},
	
	checkDelete: function() {
		var now = new Date(),
			self = this,
			duration = now.getTime()-self.lastAccessed.getTime();
			
		if(duration > Config.loader.deleteTimeout){
			clearInterval(self.deleteInterval);
			self.delete_callback();
		}
	},
	
	start: function(force) {
		this.lastAccessed = new Date();
		
		this.players = [];
		this.done = false;
		this.l = 99999999;
		this.saved = false;
		
		this.errors = [];
		this.reqsP = 0;
		this.savesP = 0;
		this.lastWid = 0;
		
		this.total = {};
	
		var time = new Date(),
			self = this;
		time.setTime(time.getTime()-Config.player.updateInterval);
		
		console.log("Starting loader for clan: "+this.wid);
		
		DBTypes.Player.count({c: this.wid},function(err,count){
			self.l = count;

			if(self.l == 0)self.done = true;
            if(force !== false){
                self.loadFromDB(time,force);
            }
            if(force !== -1){
                self.loadFromWG(time,force);
            }
		});
	},
	
	loadFromDB: function(time, force) {
		var cond = {c: this.wid},
			self = this;

        if(force > -1){
            cond.u = {$gt:time};
        }

		DBTypes.Player.find(cond,function(err,docs){
			
			var players = _.map(docs,function(doc){var p = new Player(doc._id);p.doc = doc;return p;});
			_.each(players,function(player){
				player.getData(function(data){self.player_data_callback(data)});
			});
		});
	},
	
	loadFromWG: function(time, force) {
		var cond = {c: this.wid,$or: [{u: {$exists: false}}, {u: {$lt:(force?new Date():time)}}]},
			self = this;
		DBTypes.Player.find(cond,function(err,docs){
			var players = _.map(docs,function(doc){var p = new Player(doc._id);p.doc = doc;return p;});
			_.each(players,function(player){
				self.reqsP++;
				self.lastWid = player.wid;
				self.loadPlayer(player,function(err){
					self.reqsP--;
					if(!err) {
						self.savesP--;
						if(player.doc.c == self.wid){
							player.getData(function(data){self.player_data_callback(data)});
						}else {
							self.playerDone();
						}
					} else self.handleError(err);
				},function(){self.savesP++;});
			});
		});
	},
	
	player_data_callback: function(data) {
		data.saved_at = (new Date()).getTime();
		if(!this.total.stats_current){
			this.total.stats_current = _.clone(data.stats_current);
			if(this.total.stats_current)this.total.stats_current.member_count = 1;
			else {
				er = new DBTypes.ErrorLog({e:"No stats\n"+data.wid,t:new Date()});
				er.save();
			}
			this.total.vehs = {};
			for(var i=1;i<5;i++)if(!this.total.vehs[i])this.total.vehs[i]=[];
		}
		else if(data.stats_current)this.addStatsToTotal(data.stats_current);
		this.addVehsToTotal(data.vehs);
		this.players.push(data);
		this.playerDone();
	},
	
	addStatsToTotal: function(stats){
		this.total.stats_current.GPL += stats.GPL;
		this.total.stats_current.WIN += stats.WIN;
		this.total.stats_current.DEF += stats.DEF;
		this.total.stats_current.SUR += stats.SUR;
		this.total.stats_current.FRG += stats.FRG;
		this.total.stats_current.SPT += stats.SPT;
		this.total.stats_current.ACR += stats.ACR;
		this.total.stats_current.DMG += stats.DMG;
		this.total.stats_current.CPT += stats.CPT;
		this.total.stats_current.DPT += stats.DPT;
		this.total.stats_current.EXP += stats.EXP;
		this.total.stats_current.WN7 += stats.WN7;
		this.total.stats_current.EFR += stats.EFR;
		this.total.stats_current.SC3 += stats.SC3;
		this.total.stats_current.member_count++;
	},
	
	addVehsToTotal: function(vehs) {
		var self = this;
		_.each(vehs,function(typeVehs,type){
			_.each(typeVehs.tanks,function(veh){
				if(veh.tier == 10){
					var found = false;
					for(var i in self.total.vehs[type]){
						if(veh.name == self.total.vehs[type][i].name){
							found = true;
							self.total.vehs[type][i].battles += veh.battles;
							self.total.vehs[type][i].wins += veh.wins;		
							self.total.vehs[type][i].count++;					
						}
					}
					if(!found){
						self.total.vehs[type].push(_.clone(veh));
						_.last(self.total.vehs[type]).count = 1;
						delete _.last(self.total.vehs[type]).updated_at;
					}
				}
			});
		});
	},
	
	playerDone: function() {
		this.l--;
		if(this.l == 0)this.done = true;
	},
	
	handleError: function(err) {
		if(err)this.errors.push(err);
		this.playerDone();
	},
	
	isDone: function() {
		this.lastAccessed = new Date();
		return this.done;
	},
	
	deleteCallback: function(callback) {
		this.delete_callback = callback;
	},
	
	getData: function(last) {
		var ret = {members:[]},
			saved_last = 0,
			last = last?last:0;
		
		_.each(this.players,function(player){
			var time = new Date(player.saved_at);
			if(time.getTime() > last){
				if(time.getTime() > saved_last)saved_last = time.getTime();
				ret.members.push(player);
			}
		});
		if(this.done){
			if(this.total.stats_current){
				this.total.stats_current.updated_at = new Date();
			
				if(!this.saved){
					var sm = new StatsManager(this.total.stats_current);
					sm.save(this.wid);
					this.saved = true;
				}
			}
			ret.total = this.total;
		}
		ret.status = "ok";
		ret.last = saved_last;
		ret.is_done = this.done;
		
		return ret;
	},
	
	setPlayerLoadFunction: function(callback){
		this.loadPlayer = callback;
	},
});