var cls = require("./lib/class"),
    _ = require("underscore"),
    Player = require("./player"),
    Request = require("./request"),
    DBTypes = require("./db_types"),
    ClanLoader = require("./clan_loader"),
    Config = require("./config"),
    ReqManager = require("./req_manager");
    
module.exports = App = cls.Class.extend({
	init: function(){
		console.log('Initialising app');
		this.loaders = {};
		this.rm = new ReqManager(Config.simultaneousClans,Config.simultaneousReqsClan,Config.simultaneousReqsNoClan);
	},
	
	setSimultaneousReqs: function(options){
		if(options[0]){
			this.rm.setSimultaneous(options[0]);
			return {status:"ok"};
		} else return {status:"error", error:"Number not defined"};
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
					if(key > 0)
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
	
	busyLoaders: function(options) {
		var ret = 0;
		_.each(this.loaders,function(loader){
			ret += loader.l > 0?1:0;
		});
		return ret;
	},
	
	createLoader: function(wid, force) {
		var self = this;
		
		console.log("Creating loader for clan "+wid);
		this.loaders[wid] = new ClanLoader(wid);
		this.loaders[wid].setPlayerLoadFunction(function(player,callback,beforeSave){
			return self.loadPlayer(player,wid,callback,beforeSave);
		});
		this.loaders[wid].start(force);
		this.loaders[wid].deleteCallback(function(){
			console.log("Deleting loader for clan "+wid);
			delete self.loaders[wid];
		});
	},
	
	onLoaderReady: function(wid, force, retry, forceUpdatePlayerList, callback, ready_callback) {
		var self = this;
		
		if(this.loaders[wid]){
      if(forceUpdatePlayerList){
				DBTypes.Clan.findOne({wid:wid},function(err,doc){
					self.updatePlayerListForClan(doc,false,function(){
						if(retry && self.loaders[wid].isDone())self.loaders[wid].start(force);
  			    ready_callback();
					});
				});
			}else{
  			if(retry && this.loaders[wid].isDone())this.loaders[wid].start(force);
  			ready_callback();
      }
		}else{
			if(self.busyLoaders() >= Config.maxBusyLoaders){
				callback({status:"wait"});
				return false;
			}
			if(forceUpdatePlayerList){
				DBTypes.Clan.findOne({wid:wid},function(err,doc){
					self.updatePlayerListForClan(doc,false,function(){
						self.createLoader(wid, force);
						ready_callback();
					});
				});
			} else {
				self.createLoader(wid, force);
				ready_callback();
			}
		}
	},
	
	getDataFromLoader: function(wid,last){
		var ret = this.loaders[wid].getData(last);
		ret.last_pos = this.rm.pos(this.loaders[wid].lastWid,wid);
		return ret;
	},
	
	waitForLoader: function(callback, wid, last){
		var self = this,
			waitTime = Config.loaderWaitTime,
			waitInterval = setInterval(function(){
			if(self.loaders[wid] && self.loaders[wid].isDone()){
				clearInterval(waitInterval);
				callback(self.getDataFromLoader(wid,last));
			}else{
				waitTime -= 100;
				if(waitTime <= 0){
					clearInterval(waitInterval);
					if(self.loaders[wid])callback(self.getDataFromLoader(wid,last));
					else callback({members:[],status:"loader deleted",last:0,is_done:true});
				}
			}
		},100);
	},
	
	statusClan: function(options) {
		var self = this,
			wid = options[0],
			force = options["f"] == "true"?true:false,
			retry = options["r"] == "true"?true:false,
			forceUpdatePlayerList = options["upl"] == "true"?true:false,
			last =  options["l"]?options["l"]:0;
			
		return function(callback) {
			self.onLoaderReady(wid,force,retry,forceUpdatePlayerList,callback,function(){
				if(self.loaders[wid].isDone()){
					callback(self.getDataFromLoader(wid,last));				
				}else{
					self.waitForLoader(callback,wid,last);
				}
			});
		};
	},
	
	playerStats: function(options) {
		return function(callback) {
			var ret = {lengths:{},counts:{},stats:{}};
			DBTypes.PlayerStats.find(function(err,docs){
				_.each(docs,function(doc){
					var t = doc._id.split(":")[0],
						v = parseFloat(doc._id.split(":")[1])
					if(!ret.stats[t]){
						ret.stats[t] = {};
						ret.lengths[t] = 0;
						ret.counts[t] = 0;
					}
					ret.lengths[t]++;
					ret.counts[t] += doc.value;
					ret.stats[t][v] = doc.value;
				});
				callback(ret);
			});
		}
	},
	
	updatePlayerStats:function() {
		var o = {
			map: function () {
				if(this.stats_current){ 
					var GPL = Math.round(this.stats_current.GPL/200)*200;
					emit("GPL:"+GPL,1);  
					var WIN = Math.round(this.stats_current.WIN/this.stats_current.GPL*500)/5;
					emit("WIN:"+WIN,1); 
					var SUR = Math.round(this.stats_current.SUR/this.stats_current.GPL*500)/5;
					emit("SUR:"+SUR,1); 
					var FRG = Math.round(this.stats_current.FRG/this.stats_current.GPL*100)/100;
					emit("FRG:"+FRG,1);
					var KD = Math.round(this.stats_current.FRG/(this.stats_current.GPL-this.stats_current.SUR)*40)/40;
					emit("KD:"+KD,1);
					var SPT = Math.round(this.stats_current.SPT/this.stats_current.GPL*50)/50;
					emit("SPT:"+SPT,1);
					var DMG = Math.round(this.stats_current.DMG/this.stats_current.GPL/10)*10;
					emit("DMG:"+DMG,1);
					var CPT = Math.round(this.stats_current.CPT/this.stats_current.GPL*25)/25;
					emit("CPT:"+CPT,1);
					var DPT = Math.round(this.stats_current.DPT/this.stats_current.GPL*50)/50;
					emit("DPT:"+DPT,1);
					var EXP = Math.round(this.stats_current.EXP/this.stats_current.GPL/5)*5;
					emit("EXP:"+EXP,1);
					var EFR = Math.round(this.stats_current.EFR/10)*10;
					emit("EFR:"+EFR,1);
					var WN7 = Math.round(this.stats_current.WN7/10)*10;
					emit("WN7:"+WN7,1);
					var SC3 = Math.round(this.stats_current.SC3/250)*250;
					emit("SC3:"+SC3,1);
				}
			},
			reduce: function (k, vals) { 
				var ret = 0;
				for(i in vals){
					ret += vals[i];
				}
				return ret;
			},
			out:{replace: 'player_stats'}
		},
		start = new Date();
		
		console.log("Updating player stats.");
		
		DBTypes.Player.mapReduce(o,function (err, results) {
			if(err)console.log(err);
			var end = new Date(),
				duration = end.getTime() - start.getTime();
			console.log("Player stats updated ("+duration+" ms).");
		});
	},
	
	
	updateScores: function() {
		var o = {
			map: function () {
				emit(parseInt(this.clan_id), {
					EFR: this.stats_current?this.stats_current.EFR:0,
					SCR: this.stats_current?this.stats_current.SCR:0,
					SC3: this.stats_current?this.stats_current.SC3:0,
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
					SC3: 0,
					EFR: 0,
					WN7: 0
				};
				for(i in vals){
					ret.SCR += vals[i].SCR;
					ret.SC3 += vals[i].SC3;
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
	
	loaderStatus: function(options) {
		var ret = {status:"ok",reqs_pending_total:0,saves_pending_total:0,speed:0,average_req_time:0,loaders:[]},
			r = 0,
			s = 0,
			self = this;
		_.each(this.loaders,function(loader) {
			r += loader.reqsP;
			s += loader.savesP;
			ret.loaders.push({
				wid:loader.wid,
				created:loader.created,
				last_access:loader.lastAccessed,
				queue:self.rm.clans[loader.wid],
				last_pos:self.rm.pos(loader.lastWid,loader.wid),
				to_be_done:loader.l,
				reqs_pending:loader.reqsP,
				saves_pending:loader.savesP,
				error:loader.errors});
		});
		ret.speed = Math.round(this.rm.speed()*100)/100 + " req/s";
		ret.reqs_pending_total = r;
		ret.saves_pending_total = s;
		ret.average_req_time = Math.round(this.rm.getAverageTime()*100)/100 + " ms";
		return ret;
	},
	
	translateNames: function(options) {
		return function(callback) {
			var wids = options,
				ret = {status:"ok",players:{}};
				
			DBTypes.Player.find({wid:{$in:wids}}).select('wid name').exec(function(err,docs){
				_.each(docs,function(player){
					ret.players[player.wid] = player.name;
				});
				
				callback(ret);
			});
		}
	},
	
	loadPlayer: function(player,wid,callback,beforeSave) {
		return this.rm.addReq(wid,'accounts',player.wid,function(data){
			if(!player.parseData(data)){
				callback({status:"error",error:"parse error",wid:player.wid});
			}else{
				if(beforeSave)beforeSave();
				player.save(function(err){
					//console.log('Data returned');
					if(err)console.log(err);
					callback();
				});
			}
		},function(){
			console.log('Timeout: '+player.wid);
			callback({status:"error",error:"timeout"});
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
					self.loadPlayer(player,false,function(err){
						if(err)wait_callback({status:"error"});
						else player.getStats(wait_callback);
					});
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
					self.loadPlayer(player,false,function(err){
						if(err)wait_callback({status:"error"});
						else player.getData(wait_callback);
					});
				}else player.getData(wait_callback);
			},true);
		}
	},
	
	updatePlayerListForClan: function(clan,player_ids,callback){
		var self = this,
			start = new Date(),
			count = 0,
			compareIds = function(player_ids) {
				_.each(clan.members,function(wid){
					if(!_.contains(player_ids,wid)){
						var player = new DBTypes.Player({
							wid: wid,
							clan_id: clan.wid,
							locked: 0,
							status: "Not loaded",
							updated_at: 0
						});
						DBTypes.Player.findOne({wid:wid},function(err,doc){
							if(!doc){
								player.save(function(err){
									if(err)console.log(err);
								});
							}else{
								doc.clan_id = clan.wid;
								doc.save(function(err){
									if(err)console.log(err);
								});
							}
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
				DBTypes.Player.find({clan_id: clan.wid}).select("wid").exec(function(err, docs){
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
		
		DBTypes.Clan.find({}).limit(100).sort("players_updated_at").exec(function(err,docs){
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
	
	updateVehStats: function() {
		var o = {
			map: function () { 
				emit(this.veh, {
					battles: this.battles,
					wins: this.wins,
					count: 1
				}); 
			},
			reduce: function (k, vals) { 
				ret = {
					battles: 0,
					wins: 0,
					count: 0
				};
				for(i in vals){
					ret.battles += vals[i].battles;
					ret.wins += vals[i].wins;
					ret.count += vals[i].count;
				}	
				ret.winrate = ret.wins / ret.battles * 100;
				ret.battles_average = ret.battles / ret.count;
				return ret;
			},
			out:{merge: 'veh_stats'}
		},
		start = new Date();
		
		console.log("Updating vehicle statistics.");
		
		DBTypes.PlVeh.mapReduce(o,function (err, results) {
			if(err)console.log(err);
			var end = new Date(),
				duration = end.getTime() - start.getTime();
			console.log("Vehicle statistics updated ("+duration+" ms).");
		});
	},
	
	vehStats: function(options) {
		var self = this,
			ret = {status:"ok",vehs:{}};
		
		return function(callback) {
			DBTypes.VehStats.find(function(err,docs){
				_.each(docs,function(doc){
					ret.vehs[doc.id] = {
						wins: doc.value.wins,
						battles: doc.value.battles,
						winrate: doc.value.winrate,
						battles_average: doc.value.battles_average,
					};
				});
				DBTypes.Veh.find(function(err,docs){
					_.each(docs,function(veh){
						if(ret.vehs[veh._id]){
							if(veh.tier == 10 || (veh.type == 4 && veh.tier == 8)){
								ret.vehs[veh._id].name = veh.lname;
								ret.vehs[veh._id].type = veh.type;
								ret.vehs[veh._id].tier = veh.tier;
							}
							else delete ret.vehs[veh._id];
						}
					});
				
					callback(ret);
				});
			});
		};
	},
});