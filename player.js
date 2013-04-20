var cls = require("./lib/class"),
    _ = require("underscore"),
    DBTypes = require("./db_types"),
    Config = require("./config"),
    VehManager = require("./veh_manager"),
    StatsManager = require("./stats_manager");
    
module.exports = Player = cls.Class.extend({
	init: function(wid){
		this.wid = wid;
	},
	
	find: function(callback){
		var self = this;
		
		if(!this.doc || this.doc._id != this.wid){
			
			var q = DBTypes.Player.findOne({_id:self.wid});
			q.exec(function(err, doc){
				if(!doc){
					doc = new DBTypes.Player();
					doc.wid = self._id;
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
			console.log(playerData.status_code+": "+this.wid);
			this.doc.s = playerData.status_code;
			this.doc.u = new Date();
			return true;
		}else{
			if(playerData.data.clan.clan)this.doc.c = playerData.data.clan.clan.id;
				else this.doc.c = 0;
			this.doc.n = playerData.data.name;
			this.doc.s = '1';
			this.doc.u = new Date();				
			this.vm = new VehManager(this.doc.v);
			this.vm.parseVehs(playerData.data.vehicles);
			this.doc.v = this.vm.getVehs();
			this.doc.markModified('v');
			this.best = this.vm.getBest();
			this.sm = new StatsManager(playerData.data,this.vm.getScore(),this.vm.getAvTier());
			this.doc.sc = this.sm.getStats();
			this.doc.markModified('sc');
			this.sm.save(this.wid);
			return true;
		}
	},
	
	save: function(callback){
		var self = this;
		
		callback();
		this.doc.save(function(err){
			if(err)console.log(err);
		});
	},
	getData: function(callback) {
		var ret = {},
			self = this,
			vehsLoaded = false;
			
		if(!this.best){
			this.vm = new VehManager(this.doc.v);
			this.best = this.vm.getBest();
		}
			
		ret.name = this.doc.n;
		ret.wid = this.doc._id;
		ret.clan_id = this.doc.c;
		ret.vehs = this.best;
		ret.updated_at =this.doc.u;
		ret.stats_current = _.clone(this.doc.sc);
		ret.stats_current.updated_at = ret.stats_current.u;
		delete ret.stats_current.u;
		ret.status = "ok";
		callback(ret);
	},
	
	getUpdatedAt: function() {
		return (this.doc && this.doc.u)?this.doc.u.getTime():0;
	},
});