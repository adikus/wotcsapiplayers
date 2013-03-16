var cls = require("./lib/class"),
    _ = require("underscore"),
    DBTypes = require("./db_types");
    
module.exports = Stat = cls.Class.extend({
	init: function(doc){
		this.doc = doc;
	},
	
	parseData: function(data) {
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
		stats['SC2'] = Math.round(wn7/1000*this.score2*100)/100;
		stats['SC3'] = Math.round(wn7/1500*this.score3*100)/100;
		
		this.data = stats;
	},
	
	save: function(callback) {
		if(this.doc){
			this.doc._doc = this.data;
			this.doc.player = this.pid;
		}else{
			this.doc = new DBTypes.Stat(this.data);
			this.doc.player = this.pid;
		}
		this.doc.save(callback);
	},
	
	filteredData: function() {
		var ret = this.doc._doc;
		delete ret.player;
		delete ret.__v;
		delete ret._id;
		return ret;
	}
});