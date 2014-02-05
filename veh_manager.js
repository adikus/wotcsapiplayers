var cls = require("./lib/class"),
    _ = require("underscore"),
    DBTypes = require("./db_types");

module.exports = VehManager = cls.Class.extend({
	init: function(vehs) {
		this.vehs = vehs?vehs:[];
		this.best = {};
		this.score = 0;
		this.tierTotal = 0;
		this.battlesTotal = 0;
		
		var self = this;
		_.each(this.vehs,function(veh){
			if(VEHICLE_DATA[veh.v]){
				var tier = VEHICLE_DATA[veh.v].l,
					type = VEHICLE_DATA[veh.v].t;
				if(!self.best[type])self.best[type] = {tanks:[],tier:tier};
				self.best[type].tanks.push({
					name: veh.v,
					lname: VEHICLE_DATA[veh.v].ln,
					tier: tier,
					battles: veh.b,
					nation: VEHICLE_DATA[veh.v].n,
					wins: veh.w,
					type: type,
					updated_at: veh.u
				});
			}
		});
	},
	
	getVehs: function() {
		return this.vehs;
	},
	
	getBest: function() {
		return this.best;
	},
	
	getScore: function() {
		return this.score;
	},
	
	getAvTier: function() {
		return this.battlesTotal > 0?this.tierTotal/this.battlesTotal:0;
	},
	
	parseVehs: function(vehs) {
		var tiers = {},
			self = this;
		_.each(vehs,function(veh){
            var tankInfo = VEHICLE_DATA_BY_ID[veh.tank_id];
            if(!tankInfo){
                var tier = 0;
                var type = 5;
            }else{
                var tier = tankInfo.level;
                var type = self.parseType(tankInfo.type);
                veh.name = tankInfo.name.split(':')[1];
                veh.level = tankInfo.level;
                veh.class = tankInfo.type;
                veh.nation = tankInfo.nation;
                veh.lname = tankInfo.name_i18n;
            }
            veh.battle_count = veh.statistics.battles;
            veh.win_count = veh.statistics.wins;
			
			self.tierTotal += tier*veh.battle_count;
			self.battlesTotal += veh.battle_count;
			if(!tiers[type] || tiers[type] < tier)tiers[type] = tier;
		});
		
		this.vehs = [];
		this.best = {};
		
		_.each(vehs,function(veh){
			if(!VEHICLE_DATA[veh.name])self.addNewTank(veh);
			
			var tier = veh.level,
				type = self.parseType(veh.class);
				
			if(VEHICLE_DATA[veh.name].l != tier || VEHICLE_DATA[veh.name].t != type || 
        VEHICLE_DATA[veh.name].ln != veh.lname || VEHICLE_DATA[veh.name].n != self.parseNation(veh.nation))self.changeTank(veh);
			
			if(tier == tiers[type] && type > 0){
				self.vehs.push({
					v: veh.name,
					w: veh.win_count,
					b: veh.battle_count,
					u: new Date()
				});
				if(!self.best[type])self.best[type] = {tanks:[],tier:tiers[type]};
				self.best[type].tanks.push({
					name: veh.name,
					lname: VEHICLE_DATA[veh.name].ln,
					tier: tier,
					battles: veh.battle_count,
					nation: self.parseNation(veh.nation),
					wins: veh.win_count,
					type: type,
					updated_at: new Date()
				});
				self.score += self.calcScore(veh.win_count,veh.battle_count,type,tier);
			}
		});
	},
	
	calcScore: function(w,b,t,l){
		var percentage = w/b*100,
			factor = (percentage-35)/15*Math.min(b,75)/75;
		if(	l == 10 && t == 1 ){
			return 1000*factor;
		}else if( l == 10 && t == 2){
			return 1000*factor;
		}else if( l == 10 && t == 3 ){
			return 900*factor;
		}else if( l == 10 && t == 4 ){
			return 900*factor;
		}else return 0;
	},
	
	addNewTank: function(veh) {
		var vehicle = new DBTypes.Veh({
				name: veh.name,
				lname: veh.localized_name,
				tier: veh.level,
				nation: this.parseNation(veh.nation),
				type: this.parseType(veh.class),
		});
			
		vehicle.save(function(err){
			if(err)console.log(err);
			else console.log("New vehicle added: "+vehicle.name);
		});
		VEHICLE_DATA[vehicle.name] = {
			t: vehicle.type,
			n: vehicle.nation,
			l: vehicle.tier,
			ln: vehicle.lname,
		};
	},
	
	changeTank: function(veh) {
		var self = this;
		
		DBTypes.Veh.findOne({name:veh.name},function(err,vehicle){
			vehicle.tier = veh.level;
			vehicle.type = self.parseType(veh.class);
      vehicle.lname = veh.lname;     
      vehicle.nation = self.parseNation(veh.nation);
			vehicle.save(function(err){
				if(err)console.log(err);
			});
		});
			
    VEHICLE_DATA[veh.name].ln = veh.lname;
		VEHICLE_DATA[veh.name].l = veh.level;   
		VEHICLE_DATA[veh.name].n = self.parseNation(veh.nation);
		VEHICLE_DATA[veh.name].t = self.parseType(veh.class);
		
		console.log("Type, tier, name or nation changed for tank: "+veh.name,VEHICLE_DATA[veh.name]);
	},
	
	parseType: function(t){
		switch (t) {
			case 'lightTank':
				return 0;
				break;
			case 'mediumTank':
				return 1;
				break;
			case 'heavyTank':
				return 2;
				break;
			case 'AT-SPG':
				return 3;
				break;
			case 'SPG':
				return 4;
				break;
			default: return 5;
		}
	},
	
	parseNation: function(n){
		switch (n) {
			case 'ussr':
				return 1;
				break;
			case 'germany':
				return 2;
				break;
			case 'usa':
				return 3;
				break;
			case 'china':
				return 4;
				break;
			case 'france':
				return 5;
				break;
			case 'uk':
				return 6;
				break;
            case 'japan':
                return 7;
                break;
		}
	},
});