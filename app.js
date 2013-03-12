var cls = require("./lib/class"),
    _ = require("underscore"),
    Player = require("./player"),
    Request = require("./request"),
    DBTypes = require("./db_types"),
    MemberListRequest = require("./member_list_request"),
    ClanLoader = require("./clan_loader");

module.exports = app = cls.Class.extend({
	init: function(){
		console.log('Initialising app');
		this.loaders = {};
	},
	
	statusGlobal: function(options) {		
		var self = this,
			wait_callback = null
			times = [],
			ret = {updated:{"1h":0,"2h":0,"3h":0,"4h":0,"5h":0,"6h":0,"7h":0,"8h":0,"9h":0,"10h":0,"11h":0,"12h":0}},
			l = 13,
			testForEnd = function(){
				l--;
				if(l == 0)wait_callback(ret);
			};
			
		for(var i=1;i<=12;i++){
			var time = new Date();
			time.setTime(time.getTime()-i*3600000);
			times[i] = time;
		}	
		
		_.each(times,function(time,key){
			DBTypes.Player.count({updated_at:{$gt:time}},function(err, count){
				ret.updated[key+"h"] = count;
				testForEnd();
			});
		});
		
		DBTypes.Player.count({},function(err, count){
			ret.total_count = count;
			testForEnd();
		});
		
		return function(callback) {
			wait_callback = callback;
		}
	},
	
	statusClan: function(options) {
		var wait_callback = null,
			wid = options[0],
			self = this;
			forceLoad = options[2],
			last = options[1],
			waitTime = 1000,
			waitInterval = null,
			wait = function() {
				waitInterval = setInterval(function(){
					if(self.loaders[wid].isDone()){
						clearInterval(waitInterval);
						wait_callback(self.loaders[wid].getData(last));
						delete self.loaders[wid];
						console.log("Loader for clan "+wid+" deleted.");
					}else{
						waitTime -= 100;
						if(waitTime == 0){
							clearInterval(waitInterval);
							wait_callback(self.loaders[wid].getData(last));
						}
					}
				},100);
			};
		
		return function(callback) {
			wait_callback = callback;
			
			if(self.loaders[wid]){
				if(self.loaders[wid].isDone()){
					wait_callback(self.loaders[wid].getData(last));
					delete self.loaders[wid];
					console.log("Loader for clan "+wid+" deleted.");
				}else{
					wait();
				}
			}else{
				console.log("Creating loader for clan "+wid);
				self.loaders[wid] = new ClanLoader(wid,forceLoad);
				self.loaders[wid].setPlayerLoadFunction(function(player,callback){
					self.loadPlayer(player,callback);
				});
				wait();
			}
		}
	},
	
	updateScores: function() {
		var o = {
			map: function () { 
				emit(this.clan_id, {
					EFR: this.stats_current?this.stats_current.EFR:0,
					SCR: this.stats_current?this.stats_current.SCR:0,
					WIN: this.stats_current?this.stats_current.WIN:0,
					GPL: this.stats_current?this.stats_current.GPL:0
				}); 
			},
			reduce: function (k, vals) { 
				ret = {
					WIN: 0,
					GPL: 0,
					SCR: 0,
					EFR: 0
				};
				for(i in vals){
					ret.SCR += vals[i].SCR;
					ret.EFR += vals[i].EFR;
					ret.WIN += vals[i].WIN;
					ret.GPL += vals[i].GPL;
				}	
				ret.EFR = ret.EFR / vals.length;
				ret.WR = ret.WIN / ret.GPL * 100;
				return ret;
			},
			out:{merge: 'clan_stats'}
		};
		
		console.log("Updateing scores.");
		
		DBTypes.Player.mapReduce(o,function (err, results) {
			if(err)console.log(err);
		});
	},
	
	scores: function(options) {
		var self = this,
			wait_callback = null,
			wid = options[0];
		
		return function(callback) {
			wait_callback = callback;
			
			if(wid){
				DBTypes.ClanStats.findOne({_id:wid}).sort("-value.SCR").exec(function(err, doc){
					var ret = {
						status: "ok",
						scores: doc.value
					}
					wait_callback(ret);
				});
			}else{
				DBTypes.ClanStats.find().sort("-value.SCR").exec(function(err, docs){
					var ret = {
						status: "ok",
						scores: {}
					}
					_.each(docs,function(doc){
						ret.scores[doc._id] = doc.value;
					});
										
					wait_callback(ret);
				});
			}
		}
	},
	
	loadPlayer: function(player,callback) {
		req = new Request('accounts',player.wid,'1.8');
			
		req.onSuccess(function(data){
			player.parseData(data);
			player.save(function(err){
				console.log('Loaded: '+player.wid);
				callback();
			});
		});
		
		req.onTimeout(function(){
			console.log('Timeout: '+player.wid);
			wait_callback({status:"error",error:"timeout"});
		});
	},
	
	statsPlayer: function(options) {
		var player = new Player(options[1]),
			forceLoad = options[2],
			wait_callback = null,
			now = new Date(),
			self = this;
		
		return function(callback) {
			wait_callback = callback;
			
			player.find(function(){
				if(player.getUpdatedAt() < now.getTime() - 12*3600*1000 || forceLoad){
					self.loadPlayer(player,function(){player.getStats(wait_callback);});
				}else player.getStats(wait_callback);
			},true);
				
		}
	},
	
	statusPlayer: function(options) {
		if(options[0] == "stats")return this.statsPlayer(options);
		var player = new Player(options[0]),
			forceLoad = options[1],
			wait_callback = null,
			now = new Date(),
			self = this;
			
		return function(callback) {
			wait_callback = callback;
			
			player.find(function(){
				if(player.getUpdatedAt() < now.getTime() - 12*3600*1000 || forceLoad){
					self.loadPlayer(player,function(){player.getData(wait_callback)});
				}else player.getData(wait_callback);
			},true);
		}
	},
	
	updatePlayerLists: function(){
		var self = this,
			time = new Date();
		
		console.log("Updateing player list.");
		time.setTime(time.getTime()-5*3600*1000);
		
		DBTypes.Clan.find({players_updated_at:{$gt:time}}).limit(100).sort("players_updated_at").exec(function(err,docs){
			_.each(docs,function(clan){
				if(clan.members)
				_.each(clan.members[0],function(wid){
					DBTypes.Player.findOne({wid: wid},function(err,doc){
						if(!doc){
							var player = new DBTypes.Player({
								wid: wid,
								clan_id: clan.wid,
								locked: 0,
								status: "Not loaded",
								updated_at: 0
							});
							player.save(function(){
								console.log("Added new player to DB - "+wid);
							});
						}
					});
				});
				clan.players_updated_at = new Date();
				clan.save();
			});
		});
	},
});