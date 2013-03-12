var cls = require("./lib/class"),
    _ = require("underscore"),
    Vehicle = require("./vehicle"),
    DBTypes = require("./db_types");

module.exports = Member = cls.Class.extend({
	init: function(wid){
		this.wid = wid;
		this.vehicles = [];
		this.stats = {};
		this.score = 0;
		this.populated = false;
		this.pending = 0;
		this.waitingForSave = false;
		this.updateVehsAfterSave = {heavys:[],meds:[],tds:[],lights:[],artys:[]};
		this.bestTiers = [0,0,0,0,0];
		this.best = [{tier:0,tier_roman:0,tanks:[],scouts:[]},
		             {tier:0,tier_roman:0,tanks:[]},
		             {tier:0,tier_roman:0,tanks:[]},
		             {tier:0,tier_roman:0,tanks:[]},
		             {tier:0,tier_roman:0,tanks:[]}];
	},
	
	find: function(callback,populate){
		var self = this;
		
		if(!this.db_model || this.db_model.wid != this.wid){
			
			var q = DBTypes.Player.findOne({wid:self.wid});
			if(populate){
				q.populate("stats").populate("heavys").populate("meds").populate("lights").populate("tds").populate("artys");
				this.populated = true;
			}
			q.exec(function(err, member_db){
				if(!member_db){
					member_db = new DBTypes.Player();
					member_db.wid = self.wid;
				}
				self.db_model = member_db;
				callback(err);
			});
		} else {
			callback(null);
		}
	},
	
	parseData: function(data){
		var self = this;
		
		playerData = JSON.parse(data);
		
		if(playerData.status == "error"){
			console.log(playerData.error+" - "+playerData.status_code+" - "+this.id);
		}
		else {
			this.vehicles = this.parseVehicles(playerData.data.vehicles);
			this.findBest(this.vehicles);
			this.stats = this.getStats(playerData);
			
			if(playerData.data.clan.member)this.joined = playerData.data.clan.member.since;
			
			this.db_model.name = playerData.data.name;
			this.db_model.status = 'Loaded';
			this.db_model.updated_at = new Date();
			if(playerData.data.clan.clan)this.db_model.clan_id = playerData.data.clan.clan.id;
				else this.db_model.clan_id = 0;
			
			this.pending = 1;
			this.updateStats(function(){
				self.deleteOldStats(function(){
					var types = ["lights","meds","heavys","tds","artys"];
					for(var i=0;i<5;i++){
						self.pending--;
						self.findPlayerVehiclesInDB(self.best[i].tanks,types[i]);
					}
				});
			});
		}
	},
	
	updateStats: function(callback) {
		var self = this;
		
		if(this.db_model.stats_current){
			var stat = new DBTypes.Stat(this.db_model.stats_current);
			stat.member = this.db_model._id;
			stat.save(function(err){
				if(err)console.log(err);
			});
			this.db_model.stats.push(stat);
			if(this.populated)this.db_model.stats[this.db_model.stats.length-1]._doc = this.db_model.stats_current;
			//console.log("Stat pushed: "+this.db_model.stats_current.updated_at);
		}
			
		this.db_model.stats_current = this.stats;
		this.db_model.markModified('stats_current');
		
		this.db_model.save(function(){
			//console.log("Stats array saved.");
			//console.log(self.db_model._doc.__v);
			callback();
		});
	},
	
	deleteOldStats: function(callback) {
		var self = this;
		
		if(this.db_model.stats.length > 7){
			var statToRemove = this.db_model.stats.shift();
			//console.log("Stat shifted: "+statToRemove.updated_at);
			DBTypes.Stat.remove({_id:statToRemove},function(err){
				if(err)console.log(err);
				self.db_model.save(function(){
					//console.log("Stats array saved.");
					//console.log(self.db_model._doc.__v);
					callback();
				});
			});
		}else callback();
	},
	
	parseVehicles: function(vehData) {
		var ret = [],
			tierNum = 0,
			tierTotal = 0;
		if(!this.db_model)console.log(this.wid);
		for(i in vehData){
			ret.push(new Vehicle(vehData[i],this.db_model._id));
			tierNum += _.last(ret).battles;
			tierTotal += _.last(ret).tier*_.last(ret).battles;
			if(tierNum > 0)this.averageTier = tierTotal/tierNum;else this.averageTier = 9e99;
			this.score += _.last(ret).getScore();
			if(this.bestTiers[_.last(ret).type] < _.last(ret).tier)this.bestTiers[_.last(ret).type] = _.last(ret).tier;
		}
		
		return ret;
	},
	
	findBest: function(vehicles) {
		var self = this;
		
		_.each(vehicles,function(vehicle){
			if(self.bestTiers[vehicle.type] == vehicle.tier)self.best[vehicle.type].tanks.push(vehicle);
			if(self.bestTiers[vehicle.type] != 5 && vehicle.type == 0 && vehicle.tier == 5 && vehicle.nation != 5 && vehicle.nation != 6)
				self.best[vehicle.type].scouts.push(vehicle);
		});
	
		_.each(this.bestTiers,function(tier,type){
			self.best[type].tier = tier;
			self.best[type].tier_roman = self.toRoman(tier,1);
		});
	},
	
	findPlayerVehiclesInDB: function(vehs,type) {
		var self = this;
		this.pending += vehs.length;
		_.each(vehs,function(tank){
			tank.findVehicle();
			tank.onFind(function(isNew){
				if(isNew){
					self.db_model[type].push(tank.db_model);	
					self.updateVehsAfterSave[type].push(tank.db_model);
				}else if(self.populated == true){
					self.updateCurrentVeh(tank.db_model,type);
				}
				self.pending--;
				if(self.waitingForSave)self.save();
			});
		});
	},
	
	updateCurrentVeh: function(doc, type){
		for(var i in this.db_model[type]){
			var id = this.db_model[type][i]._id?this.db_model[type][i]._id.toString():this.db_model[type][i].toString();
			if(id == doc._id.toString()){
				this.db_model[type][i]._doc = doc;
			}
		}
	},
	
	getStats: function(data) {
		var stats = {};
		
		stats["GPL"] = data.data.summary.battles_count;
		stats["WIN"] = data.data.summary.wins;
		stats["DEF"] = data.data.summary.losses;
		stats["SUR"] = data.data.summary.survived_battles;
		stats["FRG"] = data.data.battles.frags;
		stats["SPT"] = data.data.battles.spotted;
		stats["ACR"] = data.data.battles.hits_percents;
		stats["DMG"] = data.data.battles.damage_dealt;
		stats["CPT"] = data.data.battles.capture_points;
		stats["DPT"] = data.data.battles.dropped_capture_points;
		stats["EXP"] = data.data.experience.xp;
		stats.updated_at = new Date();
		
		if(this.averageTier > 0)f2 = 10/(this.averageTier+2)*(0.23+2*this.averageTier/100);
		else f2=0;
		if(stats['GPL'] > 0)
			var efr=stats['FRG']/stats['GPL']*250 + 
					stats['DMG']/stats['GPL']*f2 + 
					stats['SPT']/stats['GPL']*150 + 
					Math.log(stats['CPT']/stats['GPL']+1)/Math.log(1.732)*150 + 
					stats['DPT']/stats['GPL']*150;
		else efr = 0;
		
		var wn7 = (1240-1040/Math.pow(Math.min(this.averageTier,6),0.164))*stats['FRG']/stats['GPL'];
		wn7 += stats['DMG']/stats['GPL']*530/(184*Math.pow(Math.E,0.24*this.averageTier)+130);
		wn7 += stats['SPT']/stats['GPL']*125*Math.min(this.averageTier, 3)/3;
		wn7 += Math.min(stats['DPT']/stats['GPL'],2.2)*100;
		wn7 += ((185/(0.17+Math.pow(Math.E,((stats['WIN']/stats['GPL']*100-35)*-0.134))))-500)*0.45;
        wn7 += (5 - Math.min(this.averageTier,5))*-125 / (1 + Math.pow(Math.E,( ( this.averageTier - Math.pow((stats['GPL']/220),(3/this.averageTier)) )*1.5 )));
		if( isNaN(wn7))wn7 = 0;
		
		stats['WN7'] = Math.round(wn7*100)/100;
		stats['EFR'] = Math.round(efr*100)/100;
		stats['SCR'] = Math.round(efr/1200*this.score*100)/100;
		
		return stats;
	},
	
	save: function(callback) {
		var self = this;
		
		if(callback)this.save_callback = callback;
		if(this.pending == 0){
			if(this.saveTimeout)clearTimeout(this.saveTimeout);
			this.db_model.locked = 0;
			console.log(this.db_model["heavys"]);
			this.db_model.save(function(err){
				DBTypes.Player.findOne({wid:self.wid},function(err, doc){
					for(var i in self.updateVehsAfterSave){
						for(var j in self.updateVehsAfterSave[i]){
							console.log(i);
							self.updateCurrentVeh(self.updateVehsAfterSave[i][j],i);
							console.log(self.db_model[i]);
						}
					}
					
					if(self.save_callback){
						self.save_callback(err);
						self.save_callback = null;
					}
				});
			});
		} else {
			this.waitingForSave = true;
			this.saveTimeout = setTimeout(function(){
				DBTypes.Player.findOne({wid:self.wid},function(err, doc){
					if(doc.locked = 1){
						self.db_model.locked = 0;
						self.db_model.save(function(err){
							if(self.save_callback){
								self.save_callback(err);
								self.save_callback = null;
							}
						});
					}
				});
			},5000);
		}
	},
	
	getData: function(callback) {
		var ret = {},
			self = this;
		this.find(function(err){
			if(err){
				console.log(self.wid+" - error");
				console.log(err);
			}
			ret.name = self.db_model.name;
			ret.wid = self.db_model.wid;
			ret.clan_id = self.db_model.clan_id;
			ret.updated_at = self.db_model.updated_at;
			ret.stats_current = self.db_model.stats_current;
			ret.stats = self.mapStats();
			ret.artys = []; ret.tds = []; ret.heavys = []; ret.mediums = []; ret.lights = [];
			
			var l = self.db_model.heavys.length+self.db_model.meds.length+self.db_model.lights.length+self.db_model.artys.length+self.db_model.tds.length;
			
			if(l == 0)callback(ret);
			
			self.getVehsData(self.db_model.heavys,function(tank){
				ret.heavys.push(tank);
				l--;
				if(l == 0)callback(ret);
			});
			self.getVehsData(self.db_model.meds,function(tank){
				ret.mediums.push(tank);
				l--;
				if(l == 0)callback(ret);
			});
			self.getVehsData(self.db_model.lights,function(tank){
				ret.lights.push(tank);
				l--;
				if(l == 0)callback(ret);
			});
			self.getVehsData(self.db_model.artys,function(tank){
				ret.artys.push(tank);
				l--;
				if(l == 0)callback(ret);
			});
			self.getVehsData(self.db_model.tds,function(tank){
				ret.tds.push(tank);
				l--;
				if(l == 0)callback(ret);
			});
			setTimeout(function(){if(l > 0)callback(ret);},3000);
		},true);
	},
	
	getVehsData: function(tanks,callback) {
		_.each(tanks,function(tank){
			DBTypes.Veh.findOne({_id:tank.veh},function(err,vdoc){
				tank = {
					vehicle: {
						type: vdoc.type,
						nation: vdoc.nation,
						tier: vdoc.tier,
						name: vdoc.name,
						lname: vdoc.lname
					},
					battles: tank.battles,
					wins: tank.wins,
					updated_at: tank.updated_at
				};
				callback(tank);
			});
		});
	},
	
	mapStats: function() {
		return _.map(this.db_model.stats,function(stats){
			var ret = {};
			_.each(stats._doc,function(stat,name){
				if(name != "_id" && name != "__v")ret[name] = stat;
			});
			return ret;
		});
	},
	
	toRoman: function(n,s){
		// Convert to Roman Numerals
		// copyright 25th July 2005, by Stephen Chapman http://javascript.about.com
		// permission to use this Javascript on your web page is granted
		// provided that all of the code (including this copyright notice) is
		// used exactly as shown
		var r = '';var d; var rn = new Array('IIII','V','XXXX','L','CCCC','D','MMMM'); for (var i=0; i< rn.length; i++) {var x = rn[i].length+1;var d = n%x; r= rn[i].substr(0,d)+r;n = (n-d)/x;} if (s) {r=r.replace(/DCCCC/g,'CM');r=r.replace(/CCCC/g,'CD');r=r.replace(/LXXXX/g,'XC');r=r.replace(/XXXX/g,'XL');r=r.replace(/VIIII/g,'IX');r=r.replace(/IIII/g,'IV');}
		return r;		                  
	},
	
	
	getUpdatedAt: function() {
		return this.db_model.updated_at?this.db_model.updated_at.getTime():0;
	}
});