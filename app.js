var cls = require("./lib/class"),
    _ = require("underscore"),
    Player = require("./player"),
    Request = require("./request"),
    DBTypes = require("./db_types"),
    ClanLoader = require("./clan_loader"),
    Config = require("./config"),
    ReqManager = require("./req_manager"),
    StatsManager = require("./stats_manager"),
    JobManager = require("./job_manager");
    
module.exports = App = cls.Class.extend({
	init: function(callback){
		var self = this;
		console.log('Initialising app');
		this.loaders = {};
		this.rm = new ReqManager(Config.loader.simClans,Config.loader.reqsPerClan,Config.loader.reqsNoClan);
		this.jm = new JobManager();
		this.loadVehicleData(callback);
	},
	
	jobs: function(options) {
		var self = this;
		
		return function(callback){
			self.jm.getLog(callback);
		}
	},
	
	/*
	 * Load vehicle data to memory
	 */
	loadVehicleData: function(callback){
		DBTypes.Veh.find(function(err,docs){
			_.each(docs,function(doc){
				VEHICLE_DATA[doc.name] = {
					t: doc.type,
					n: doc.nation,
					l: doc.tier,
					ln: doc.lname,
				};
			});
			if(callback)callback();
		});
	},
	
	/*
	 * Show errors
	 */
	errors: function(options) {
		var s = options[0]?options[0]:-1;
		
		return function(callback) {
			DBTypes.ErrorLog.find().sort("-t").skip(s>=0?s:0).limit(s>=0?1:1000).exec(function(err,docs){
				ret = [];
				_.each(docs,function(doc){
					ret.push({e:doc.e.split("\n")[0],tr:doc.e.split("\n").slice(1),t:doc.t});
				})
				callback(ret);
			});
		}
	},
	
	/*
	 * Set how many simultaneous request per clan are alowed
	 */
	setSimultaneousReqs: function(options){
		if(options[0]){
			this.rm.setSimultaneous(options[0]);
			return {status:"ok"};
		} else return {status:"error", error:"Number not defined"};
	},
	
	/*
	 * Request manager interaction
	 */
	loadPlayer: function(player,wid,callback,beforeSave) {
		return this.rm.addReq(wid,'accounts',player.wid,function(data){
			if(!player.parseData(data)){
				callback({status:"error",error:"parse error",wid:player.wid});
			}else{
				if(beforeSave)beforeSave();
				player.save(function(err){
					if(err)console.log(err);
					callback();
				});
			}
		},function(){
			console.log('Timeout: '+player.wid);
			callback({status:"error",error:"timeout"});
		});
	},
	
	/*
	 * Clan loading function below
	 */
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
				self.loaders[wid].isDone();
				DBTypes.Clan.findOne({_id:wid},function(err,doc){
					self.updatePlayerListForClan(doc,false,function(){
						if(retry && self.loaders[wid] && self.loaders[wid].isDone())self.loaders[wid].start(force);
  			    		ready_callback();
					},true);
				});
			}else{
  				if(retry && this.loaders[wid].isDone())this.loaders[wid].start(force);
  				ready_callback();
      		}
		}else{
			if(self.busyLoaders() >= Config.loader.maxBusy){
				callback({status:"wait"});
				return false;
			}
			if(forceUpdatePlayerList){
				DBTypes.Clan.findOne({_id:wid},function(err,doc){
					self.updatePlayerListForClan(doc,false,function(){
						self.createLoader(wid, force);
						ready_callback();
					},true);
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
			waitTime = Config.loader.waitTimeout,
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
		if(options[0] == "stats")return this.statsFromDB(options);
		var self = this,
			wid = options[0],
			force = options["f"] == "true"?true:false,
			retry = options["r"] == "true"?true:false,
			forceUpdatePlayerList = options["upl"] == "true"?true:false,
			last =  options["l"]?options["l"]:0;
			
		return function(callback) {
			self.onLoaderReady(wid,force,retry,forceUpdatePlayerList,callback,function(){
				if(!self.loaders[wid]){
					callback({status:"error",is_done:true});
				}else if(self.loaders[wid].isDone()){
					callback(self.getDataFromLoader(wid,last));				
				}else{
					self.waitForLoader(callback,wid,last);
				}
			});
		};
	},
	
	updatePlayerListForClan: function(clan,player_ids,callback,waitTillDone){
		var self = this,
			start = new Date(),
			count = 0,
			compareIds = function(player_ids) {
				var waiting = 0;
				_.each(clan.ms,function(wid){
					if(!_.contains(player_ids,wid)){
						var player = new DBTypes.Player({
							_id: wid,
							c: clan._id,
							s: "0",
							updated_at: 0
						});
						waiting++;
						DBTypes.Player.findOne({_id:wid},function(err,doc){
							if(!doc){
								player.save(function(err){
									if(err)console.log(err);
									waiting--;
									if(waiting == 0 && waitTillDone)callback();
								});
							}else{
								doc.c = clan._id;
								doc.save(function(err){
									if(err)console.log(err);
									waiting--;
									if(waiting == 0 && waitTillDone)callback();
								});
							}
						});
						count++;
					}
				});
				var end = new Date(),
					duration = end.getTime() - start.getTime();
				console.log("Updating player list for clan: "+clan._id+" done("+count+" added; "+duration+" ms).");
				if(callback && (!waitTillDone || count == 0))callback();
			};
		
		if(clan.ms){
			if(!player_ids){
				DBTypes.Player.find({c: clan._id}).select("_id").exec(function(err, docs){
					var wids = _.map(docs,function(player){return player._id;});
					console.log(wids.length,clan.ms.length);
					compareIds(wids);
				});
			} else {
				compareIds(player_ids);
			}
		}else{if(callback)callback();}
		clan.players_updated_at = new Date();
		clan.save();
	},
	
	top: function(options) {
		var self = this,
			region = options["r"]?parseInt(options["r"]):-1,
			ret = {},
			addVehsToTotal = function(vehs,c) {
				if(!ret.clans[c].vehs){
					ret.clans[c].vehs = {};
					for(var i=1;i<5;i++)if(!ret.clans[c].vehs[i])ret.clans[c].vehs[i]=[];
				}
				_.each(vehs,function(typeVehs,type){
					_.each(typeVehs.tanks,function(veh){
						if(veh.tier == 10 || (veh.tier == 8 && veh.type == 4)){
							var found = false;
							for(var i in ret.clans[c].vehs[type]){
								if(veh.name == ret.clans[c].vehs[type][i].name){
									found = true;
									ret.clans[c].vehs[type][i].battles += veh.battles;
									ret.clans[c].vehs[type][i].wins += veh.wins;		
									ret.clans[c].vehs[type][i].count++;					
								}
							}
							if(!found){
								ret.clans[c].vehs[type].push(_.clone(veh));
								_.last(ret.clans[c].vehs[type]).count = 1;
								delete _.last(ret.clans[c].vehs[type]).updated_at;
							}
						}
					});
				});
			},addStatsToTotal = function(stats,c){
				if(!ret.clans[c].stats){
					ret.clans[c].stats = stats;
					ret.clans[c].stats.member_count = 1;
				}else{
					ret.clans[c].stats.GPL += stats.GPL;
					ret.clans[c].stats.WIN += stats.WIN;
					ret.clans[c].stats.DEF += stats.DEF;
					ret.clans[c].stats.SUR += stats.SUR;
					ret.clans[c].stats.FRG += stats.FRG;
					ret.clans[c].stats.SPT += stats.SPT;
					ret.clans[c].stats.ACR += stats.ACR;
					ret.clans[c].stats.DMG += stats.DMG;
					ret.clans[c].stats.CPT += stats.CPT;
					ret.clans[c].stats.DPT += stats.DPT;
					ret.clans[c].stats.EXP += stats.EXP;
					ret.clans[c].stats.WN7 += stats.WN7;
					ret.clans[c].stats.EFR += stats.EFR;
					ret.clans[c].stats.SC3 += stats.SC3;
					ret.clans[c].stats.member_count++;
				}
			};
		
		return function(callback) {
			var cond = {};
			switch(region){
			case 0:
				cond._id = {$lt:500000000,$gt:0};
				break;
			case 1:
				cond._id = {$lt:1000000000,$gt:500000000};
				break;
			case 2:
				cond._id = {$lt:2000000000,$gt:1000000000};
				break;
			case 3:
				cond._id = {$lt:2500000000,$gt:2000000000};
				break;
			case 4:
				cond._id = {$lt:3000000000,$gt:2500000000};
				break;
			case 5:
				cond._id = {$gt:3000000000};
				break;
			}
			
			DBTypes.Stat.find(cond).select("_id SC").sort("-SC").limit(100).exec(function(err, docs){
				var wids = _.map(docs,function(doc){return doc._id;});
				ret.clans = {};
				_.each(docs,function(clan){
					ret.clans[clan._id] = {SC:clan.SC};
				});
				DBTypes.Player.find({c: {$in:wids}},function(err, pdocs){
					ret.status = "ok";
					var players = _.map(pdocs,function(doc){var p = new Player(doc._id);p.doc = doc;return p;});
					var clans = {};
					_.each(players,function(player){
						if(!clans[player.doc.c])clans[player.doc.c] = {};
						var data = player.getData();
						addVehsToTotal(data.vehs,player.doc.c);
						if(data.stats_current)addStatsToTotal(data.stats_current,player.doc.c);
					});		
					var clans = ret.clans;
					ret.clans = [];		
					DBTypes.Clan.find({_id:{$in:wids}}).select("t n").exec(function(err,cdocs){
						_.each(cdocs,function(doc){clans[doc._id].name = doc.n;clans[doc._id].tag = doc.t;});
						
						_.each(docs,function(clan){
							ret.clans.push({wid:clan._id,SC:clan.SC,stats:clans[clan._id].stats,vehs:clans[clan._id].vehs,name:clans[clan._id].name,tag:clans[clan._id].tag});
						});
						callback(ret);
					});
				});
			});
		}
	},
	
	/*
	 * Player loading functions below
	 */
	statusPlayer: function(options) {
		if(options[0] == "stats")return this.statsFromDB(options);
		var player = new Player(options[0]),
			forceLoad = options["f"]=="true",
			now = new Date(),
			self = this;
			
		return function(callback) {			
			player.find(function(){
				if(player.getUpdatedAt() < now.getTime() - Config.player.updateInterval || forceLoad){
					self.loadPlayer(player,false,function(err){
						if(err)callback({status:"error"});
						else {
							player.getData(callback);
							player.save();
						}
					});
				}else player.getData(callback);
			},true);
		}
	},
	
	statsFromDB: function(options) {
		var sm = new StatsManager(),
			wid = options[1],
			now = new Date(),
			self = this;
		
		return function(callback) {
			sm.getStatsFromDB(wid,callback);
		}
	},
	
	translateNames: function(options) {
		return function(callback) {
			var wids = options,
				ret = {status:"ok",players:{}};
				
			DBTypes.Player.find({_id:{$in:wids}}).select('wid name').exec(function(err,docs){
				_.each(docs,function(player){
					ret.players[player.wid] = player.name;
				});
				
				callback(ret);
			});
		}
	},
	
	/*
	 * Statistical functions below
	 */
	playerStats: function(options) {
		return function(callback) {
			var ret = {lengths:{},counts:{},stats:{}};
			DBTypes.Statistic.find(function(err,docs){
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
	
	clanStats: function(options) {
		return function(callback) {
			var ret = {lengths:{},counts:{},stats:{}};
			DBTypes.CStatistic.find(function(err,docs){
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
	
	vehStats: function(options) {
		return function(callback) {
			var ret = {lengths:{},counts:{},stats:{}};
			DBTypes.VStatistic.find(function(err,docs){
				_.each(docs,function(doc){
					var veh = doc._id.split(":")[0],
						t = doc._id.split(":")[1],
						v = parseFloat(doc._id.split(":")[2])
					if(!ret.stats[veh]){
						ret.stats[veh] = {B:{},W:{},S:{}};
						ret.lengths[veh] = {B:0,W:0,S:0};
						ret.counts[veh] = 0;
					}
					ret.lengths[veh][t]++;
					if(t == "B")ret.counts[veh] += doc.value;
					ret.stats[veh][t][v] = doc.value;
				});
				callback(ret);
			});
		}
	},
	
	/*
	 * Status functions below
	 */
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
});