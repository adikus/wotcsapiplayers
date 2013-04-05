var cls = require("./lib/class"),
    _ = require("underscore"),
    Vehicle = require("./vehicle"),
    Stat = require("./stat"),
    DBTypes = require("./db_types"),
    Config = require("./config");
    
module.exports = Player = cls.Class.extend({
	init: function(wid){
		this.wid = wid;
		this.vehicles = [];
		this.stats = {};
		this.score = 0;
		this.score2 = 0;
		this.score3 = 0;
		this.vl = 0;
		this.bestTiers = [0,0,0,0,0];
		this.best = [{tier:0,tanks:[],scouts:[]},
		             {tier:0,tanks:[]},
		             {tier:0,tanks:[]},
		             {tier:0,tanks:[]},
		             {tier:0,tanks:[]}];
		this.saved = {main:true,vehs:true,stats:true};
	},
	
	find: function(callback){
		var self = this;
		
		if(!this.doc || this.doc.wid != this.wid){
			
			var q = DBTypes.Player.findOne({wid:self.wid});
			q.exec(function(err, doc){
				if(!doc){
					doc = new DBTypes.Player();
					doc.wid = self.wid;
				}
				self.doc = doc;
				callback(err);
			});
		} else {
			callback(null);
		}
	},
	
	parseData: function(data){
		var self = this;
		
		try{
	        playerData = JSON.parse(data);
	    }catch(e){
	        //console.log(e);
	        return false;
	    }
		
		if(playerData.status == "error"){
			console.log(playerData.status_code+" - "+this.wid);
			this.doc.status = playerData.status_code;
			this.doc.updated_at = new Date();
			return true;
		}else{
			this.saved.main = false;
			
			this.vehicles = this.parseVehicles(playerData.data.vehicles);
			this.findBest(this.vehicles);
			this.saved.vehs = this.vl == 0;
			for(var i=0;i<5;i++){
				self.savePlayerVehicles(self.best[i].tanks);
			}
			self.savePlayerVehicles(self.best[0].scouts,true);
			
			this.saved.stats = false;
			this.stats = new Stat();
			this.stats.pid = this.doc._id;
			this.stats.averageTier = this.averageTier;
			this.stats.score = this.score;
			this.stats.score2 = this.score2;
			this.stats.score3 = this.score3;
			this.stats.parseData(playerData);
			/*this.stats.save(function(err){
				if(err)console.log(err);
				self.removeOldStats();
			});*/
			this.doc.stats_current = this.stats.data;
			this.doc.markModified('stats_current');
			
			if(playerData.data.clan.clan)this.doc.clan_id = playerData.data.clan.clan.id;
				else this.doc.clan_id = 0;
				
			this.doc.name = playerData.data.name;
			this.doc.status = 'Loaded';
			this.doc.updated_at = new Date();
			return true;
		}
	},
	
	parseVehicles: function(vehData) {
		var ret = [],
			tierNum = 0,
			tierTotal = 0;
		for(i in vehData){
			ret.push(new Vehicle(vehData[i],this.doc._id));
			tierNum += _.last(ret).battles;
			tierTotal += _.last(ret).tier*_.last(ret).battles;
			if(tierNum > 0)this.averageTier = tierTotal/tierNum;else this.averageTier = 9e99;
			this.score += _.last(ret).getScore();
			this.score2 += _.last(ret).getScore2();
			this.score3 += _.last(ret).getScore3();
			if(this.bestTiers[_.last(ret).type] < _.last(ret).tier)this.bestTiers[_.last(ret).type] = _.last(ret).tier;
		}
		
		return ret;
	},
	
	findBest: function(vehicles) {
		var self = this;
		
		_.each(vehicles,function(vehicle){
			if(self.bestTiers[vehicle.type] == vehicle.tier){
				self.best[vehicle.type].tanks.push(vehicle);
				self.vl++;
			}
			if(self.bestTiers[vehicle.type] != 5 && vehicle.type == 0 && vehicle.tier == 5 && vehicle.nation != 5 && vehicle.nation != 6){
				self.best[vehicle.type].scouts.push(vehicle);
				self.vl++;
			}
		});
	
		_.each(this.bestTiers,function(tier,type){
			self.best[type].tier = tier;
		});
	},
	
	removeOldStats: function() {
		var self = this;
		
		DBTypes.Stat.count({player: this.doc._id},function(err, count){
			if(count > Config.maxStats){
				DBTypes.Stat.findOne({player: self.doc._id}).sort("updated_at").exec(function(err,doc){
					//console.log("Removed stat from: "+doc.updated_at);
					doc.remove(function(){
						self.saved.stats = true;
						if(self.allSaved())self.saved_callback();
					});
				});
			}else{
				self.saved.stats = true;
				if(self.allSaved())self.saved_callback();
			}
		});
	},
	
	savePlayerVehicles: function(vehs,scouts) {
		var self = this;
		
		_.each(vehs,function(tank){
			tank.isScout = scouts;
			tank.findVehicle();
			tank.onFind(function(){
				self.vl--;
				if(self.vl == 0){
					self.saved.vehs = true;
					if(self.allSaved())self.saved_callback();
				}
			});
		});
	},
	
	allSaved: function() {
		return this.saved.main && this.saved.vehs /*&& this.saved.stats*/;
	},
	
	save: function(callback){
		var self = this;
		
		this.doc.save(function(err){
			self.saved.main = true;
			if(self.allSaved())callback();
			else self.saved_callback = callback;
		});
	},
	
	vehLength: function() {
		return 	this.best[0].tanks.length +
				this.best[0].scouts.length +
				this.best[1].tanks.length +
				this.best[2].tanks.length +
				this.best[3].tanks.length +
				this.best[4].tanks.length;
	},
	
	getStats: function(callback) {
		var ret = {stats: []},
			self = this;
			
		DBTypes.Stat.find({player:this.doc._id}).sort("-updated_at").exec(function(err,docs){
			_.each(docs,function(doc){
				var stat = new Stat(doc);
				ret.stats.push(stat.filteredData());
			});
			ret.status = "ok";
			callback(ret);
		});
	},
	
	filterVehs: function(best) {
		var ret = [{tier:0,tanks:[],scouts:[]},
		             {tier:0,tanks:[]},
		             {tier:0,tanks:[]},
		             {tier:0,tanks:[]},
		             {tier:0,tanks:[]}];
		for(var i in best){
			for(var j in best[i].tanks){
				if(best[i].tanks[j].tier > ret[i].tier)ret[i].tier = best[i].tanks[j].tier;
			}
		}
		for(var i in best){
			for(var j in best[i].tanks){
				if(best[i].tanks[j].tier == ret[i].tier)ret[i].tanks.push(best[i].tanks[j]);
			}
		}
		ret[0].scouts = best[0].scouts;
		return ret;
	},
	
	getData: function(callback) {
		var ret = {},
			self = this,
			vehsLoaded = false;
			
		ret.name = this.doc.name;
		ret.wid = this.doc.wid;
		ret.clan_id = this.doc.clan_id;
		ret.updated_at =this.doc.updated_at;
		ret.stats_current = this.doc.stats_current;
		
		if(this.vehLength() > 0){
			ret.vehs = this.best;
			for(var i in ret.vehs){
				for(var j in ret.vehs[i].tanks){
					ret.vehs[i].tanks[j] = ret.vehs[i].tanks[j].filteredData();
				}
				if(i == 0)for(var j in ret.vehs[i].scouts){
					ret.vehs[i].scouts[j] = ret.vehs[i].scouts[j].filteredData();
				}
				ret.vehs = self.filterVehs(ret.vehs);
			}
			vehsLoaded = true;
		}else{
			DBTypes.PlVeh.find({player:this.doc._id},function(err, docs){
				
				var l = docs.length;
				if(l == 0){
					ret.vehs = self.best;
					
					ret.status = "ok";
					callback(ret);
				}
				
				_.each(docs,function(doc){
					var veh = new Vehicle();
					veh.doc = doc;
					veh.findVehicle(function(){
						if(veh.vehDoc.type > -1)self.best[veh.vehDoc.type].tanks.push(veh.filteredData());
						else self.best[0].scouts.push(veh.filteredData());
						
						l--;
						if(l == 0){
							vehsLoaded = true;
							ret.vehs = self.filterVehs(self.best);
							
							ret.status = "ok";
							callback(ret);
						}
					});
				});
				
				
			});
		}
		
		if(vehsLoaded){
			ret.status = "ok";
			callback(ret);
		}
	},
	
	getUpdatedAt: function() {
		return (this.doc && this.doc.updated_at)?this.doc.updated_at.getTime():0;
	},
});