var cls = require("./lib/class"),
    _ = require("underscore"),
    Player = require("./player"),
    Request = require("./request"),
    DBTypes = require("./db_types"),
    ClanLoader = require("./clan_loader"),
    Config = require("./config");

module.exports = app = cls.Class.extend({
	init: function(){
		console.log('Initialising app');
		this.loaders = {};
	},
	
	updateStatus: function() {
		var times = [],
			start = new Date(),
			l = 13,
			testForEnd = function(){
				l--;
				if(l == 0){
					var end = new Date(),
						duration = end.getTime() - start.getTime();
					console.log("Status updated ("+duration+" ms).");
				}
			};
		
		console.log("Updating status.");
		
			for(var i=1;i<=12;i++){
				var time = new Date();
				time.setTime(time.getTime()-i*3600000);
				times[i] = time;
			}	
			
			DBTypes.PlayerStatus.remove(function(){
				_.each(times,function(time,key){
					DBTypes.Player.count({updated_at:{$gt:time}},function(err, count){
						playerStatus = new DBTypes.PlayerStatus({_id:key,value:count});
						playerStatus.save(function(){
							testForEnd();
						});
					});
				});
			});
			
			DBTypes.Player.count({},function(err, count){
				playerStatus = new DBTypes.PlayerStatus({_id:0,value:count});
				playerStatus.save(function(){
					testForEnd();
				});
			});
	},
	
	statusGlobal: function(options) {		
		var self = this,
			wait_callback = null,
			ret = {updated:{"1h":0,"2h":0,"3h":0,"4h":0,"5h":0,"6h":0,"7h":0,"8h":0,"9h":0,"10h":0,"11h":0,"12h":0}};
		
		DBTypes.PlayerStatus.find(function(err, docs){
			_.each(docs,function(doc){
				var key = doc._id.toString()+"h";
				if(key == "0h"){
					ret.total = doc.value;
				}
				if(ret.updated[key] != undefined){
					ret.updated[key] = doc.value;
				}
			});
			for(var i=12;i>1;i--){
				ret.updated[i+"h"] -= ret.updated[(i-1)+"h"];
			}
			wait_callback(ret);
		});
		
		return function(callback) {
			wait_callback = callback;
		}
	},
	
	statusClan: function(options) {
		var wait_callback = null,
			wid = options[0],
			self = this,
			forceLoad = options[2] == "1",
			forceUpdatePlayerList = options[3] == "1",
			last = options[1],
			waitTime = Config.loaderWaitTime,
			waitInterval = null,
			wait = function() {
				waitInterval = setInterval(function(){
					if(self.loaders[wid].isDone()){
						clearInterval(waitInterval);
						wait_callback(self.loaders[wid].getData(last));
					}else{
						waitTime -= 100;
						if(waitTime <= 0){
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
				}else{
					wait();
				}
			}else{
				var newLoader = function(){
					console.log("Creating loader for clan "+wid);
					self.loaders[wid] = new ClanLoader(wid,forceLoad);
					self.loaders[wid].setPlayerLoadFunction(function(player,callback){
						self.loadPlayer(player,callback);
					});
					self.loaders[wid].deleteCallback(function(){
						delete self.loaders[wid];
					});
					wait();
				}
				if(forceUpdatePlayerList){
					DBTypes.Clan.findOne({wid:wid},function(err,doc){
						self.updatePlayerListForClan(doc,false,newLoader);
					});
				}else newLoader();
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
					GPL: this.stats_current?this.stats_current.GPL:0,
					WN7: this.stats_current?this.stats_current.WN7:0
				}); 
			},
			reduce: function (k, vals) { 
				ret = {
					WIN: 0,
					GPL: 0,
					SCR: 0,
					EFR: 0,
					WN7: 0
				};
				for(i in vals){
					ret.SCR += vals[i].SCR;
					ret.EFR += vals[i].EFR;
					ret.WIN += vals[i].WIN;
					ret.GPL += vals[i].GPL;
					ret.WN7 += vals[i].WN7;
				}	
				ret.EFR = ret.EFR / vals.length;
				ret.WN7 = ret.WN7 / vals.length;
				ret.WR = ret.WIN / ret.GPL * 100;
				return ret;
			},
			out:{merge: 'clan_stats'}
		},
		start = new Date();
		
		console.log("Updating scores.");
		
		DBTypes.Player.mapReduce(o,function (err, results) {
			if(err)console.log(err);
			var end = new Date(),
				duration = end.getTime() - start.getTime();
			console.log("Scores updated ("+duration+" ms).");
		});
	},
	
	scores: function(options) {
		var self = this,
			wait_callback = null,
			wid = options[0] > 0,
			from = options[1]?options[1]*10:0;
		
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
				DBTypes.ClanStats.find().sort("-value.SCR").skip(from).limit(10).exec(function(err, docs){
					var ret = {
						status: "ok",
						scores: []
					}
					var wids = _.map(docs,function(doc){return doc._id;}),
						clans = docs;
					DBTypes.Clan.find({wid:{$in:wids}}).select("wid tag").exec(function(err,docs){
						var names = {};
						_.each(docs,function(doc){names[doc.wid] = doc.tag;});
						
						_.each(clans,function(doc){
							var retDoc = doc.value;
							retDoc.wid = doc._id;
							retDoc.tag = names[doc._id]?names[doc._id]:"";
							ret.scores.push(retDoc);
						});
						
						wait_callback(ret);
					});
				});
			}
		}
	},
	
	loaderStatus: function(options) {
		var ret = [];
		_.each(this.loaders,function(loader) {
			ret.push({wid:loader.wid,last_access:loader.lastAccessed,to_be_done:loader.l});
		});
		return ret;
	},
	
	translateNames: function(options) {
		return function(callback) {
			var wids = options,
				ret = {};
				
			DBTypes.Player.find({wid:{$in:wids}}).select('wid name').exec(function(err,docs){
				_.each(docs,function(player){
					ret[player.wid] = player.name;
				});
				
				callback(ret);
			});
		}
	},
	
	loadPlayer: function(player,callback) {
		req = new Request('accounts',player.wid,'1.8');
			
		req.onSuccess(function(data){
			player.parseData(data);
			player.save(function(err){
				//console.log('Loaded: '+player.wid);
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
	
	updatePlayerListForClan: function(clan,player_ids,callback){
		var self = this,
			start = new Date(),
			count = 0,
			compareIds = function(player_ids) {
				_.each(clan.members[0],function(wid){
					if(!_.contains(player_ids,wid)){
						var player = new DBTypes.Player({
							wid: wid,
							clan_id: clan.wid,
							locked: 0,
							status: "Not loaded",
							updated_at: 0
						});
						player.save(function(err){
							if(err)console.log(err);
						});
						count++;
					}
				});
				var end = new Date(),
					duration = end.getTime() - start.getTime();
				console.log("Updating player list for clan: "+clan.wid+" done("+count+" added; "+duration+" ms).");
				if(callback)callback();
			};
		
		if(clan.members){
			if(!player_ids){
				DBTypes.Player.find({clan_id: clan.wid}).select('wid').exec(function(err, docs){
					var wids = _.map(docs,function(player){return player.wid;});
					compareIds(wids);
				});
			} else {
				compareIds(player_ids);
			}
		}else{if(callback)callback();}
		clan.players_updated_at = new Date();
		clan.save();
	},
	
	updatePlayerLists: function(){
		var self = this,
			time = new Date(),
			start = new Date();
		
		console.log("Updateing player list.");
		time.setTime(time.getTime()-5*3600*1000);
		
		DBTypes.Clan.find({/*players_updated_at:{$not:{$gt:time}}*/}).limit(100).sort("players_updated_at").exec(function(err,docs){
			var wids = _.map(docs,function(clan){return clan.wid;}),
				clans = docs;
			DBTypes.Player.find({clan_id:{$in:wids}}).select('wid clan_id').exec(function(err,docs){
				var end = new Date(),
					duration = end.getTime() - start.getTime();
				console.log("Players loaded ("+docs.length+"; "+duration+" ms).");
				_.each(clans,function(clan){
					var players = _.filter(docs,function(player){return player.clan_id == clan.wid;}),
						player_ids = _.map(players,function(player){return player.wid;});
					self.updatePlayerListForClan(clan,player_ids);
				});
			});
		});
	},
	
	vehStats: function(options) {
		var self = this,
			ret = {};
		
		return function(callback) {
			DBTypes.Veh.find({$or:[{tier:10},{tier:8,type:4}]},function(err,docs){
				_.each(docs,function(veh){
					ret[veh._id] = {
						wins: 0,
						battles: 0,
						count: 0,
						name: veh.lname,
						type: veh.type
					};
				});
				var ids = _.map(docs,function(veh){return veh._id;});
				
				DBTypes.PlVeh.find({veh:{$in:ids}},function(err,docs){
					_.each(docs,function(plVeh){
						ret[plVeh.veh].wins += plVeh.wins;
						ret[plVeh.veh].battles += plVeh.battles;
						ret[plVeh.veh].count++;
					});
					
					for(var i in ret){
						ret[i].winrate = ret[i].wins/ret[i].battles*100;
						ret[i].battles_average = ret[i].battles/ret[i].count;
					}
				
					callback(ret);
				});
			});
		};
	},
});