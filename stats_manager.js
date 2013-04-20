var cls = require("./lib/class"),
    _ = require("underscore"),
    Config = require('./config'),
    DBTypes = require("./db_types");

module.exports = VehManager = cls.Class.extend({
	init: function(data,score,avTier) {
		if(score!==undefined && avTier!==undefined){
			var stats = {};
			stats["GPL"] = data.summary.battles_count;
			stats["WIN"] = data.summary.wins;
			stats["DEF"] = data.summary.losses;
			stats["SUR"] = data.summary.survived_battles;
			stats["FRG"] = data.battles.frags;
			stats["SPT"] = data.battles.spotted;
			stats["ACR"] = data.battles.hits_percents;
			stats["DMG"] = data.battles.damage_dealt;
			stats["CPT"] = data.battles.capture_points;
			stats["DPT"] = data.battles.dropped_capture_points;
			stats["EXP"] = data.experience.xp;
			
			stats['WN7'] = this.getWN7(stats,avTier);
			stats['EFR'] = this.getEFR(stats,avTier);
			stats['SC3'] = this.getSC3(stats['WN7'],score);
			
			stats.u = new Date();
			
			this.stats = stats;
		}else if(data){
			data.u = data.updated_at
			delete data.updated_at;
			this.stats = data;
		}
		if(this.stats)
		for(var i in this.stats){
			if(this.isFloat(this.stats[i])){
				this.stats[i] = Math.round(this.stats[i]*100)/100;
			}
		}
	},
	
	getStatsFromDB: function(wid,callback){
		DBTypes.Stat.findOne({_id:wid},function(err,doc){
			if(err)callback(err);
			else if(doc){
				doc.s.d.updated_at = doc.s.d.u;
				delete doc.s.d.u;
				doc.s.days = doc.s.d;
				delete doc.s.d;
				if(doc.s.w){
					doc.s.w.updated_at = doc.s.w.u;
					delete doc.s.w.u;
					doc.s.weeks = doc.s.w;
					delete doc.s.w;
				}
				callback(doc.s);
			}else callback({status:"Not found."});
		});
	},
	
	isFloat: function(n){
		return typeof n === 'number' && !(n % 1 === 0);
	},
	
	save: function(wid,callback){
		var self = this,
			status = "";
		
		DBTypes.Stat.findOne({_id:wid},function(err,doc){
			if(err)console.log(err);
			if(!doc){
				var stats = {};
				for(var i in self.stats)stats[i] = [self.stats[i]];
				doc = new DBTypes.Stat({
					_id: wid,
					s: {d:stats}
				});
				status += " created-d";
			}else{
				if(self.dateMonthTS(_.last(doc.s.d.u)) == self.dateMonthTS(self.stats.u)){
					for(var i in self.stats)doc.s.d[i][doc.s.d[i].length-1] = self.stats[i];
					doc.markModified('s');
					status += " updated-d";
				}else{
					for(var i in self.stats)doc.s.d[i].push(self.stats[i]);
					if(doc.s.d.u.length > Config.stats.maxDays)for(var i in self.stats)doc.s.d[i].shift();
					doc.markModified('s');
					status += " pushed-d";
				}
			}
			if(self.stats.u.getDay() == 6){
				if(!doc.s.w){
					var stats = {};
					for(var i in self.stats)stats[i] = [self.stats[i]];
					doc.s.w = stats;
					status += " created-w";
				}else{
					if(self.dateMonthTS(_.last(doc.s.w.u)) == self.dateMonthTS(self.stats.u)){
						for(var i in self.stats)doc.s.w[i][doc.s.w[i].length-1] = self.stats[i];
						doc.markModified('s');
						status += " updated-w";
					}else{
						for(var i in self.stats)doc.s.w[i].push(self.stats[i]);
						if(doc.s.w.u.length > Config.stats.maxWeeks)for(var i in self.stats)doc.s.w[i].shift();
						doc.markModified('s');
						status += " pushed-w";
					}
				}
			}
			doc.SC = self.stats.SC3;
			doc.save(function(err){
				if(err)console.log(err);
				//console.log("Stats"+status+": "+wid);
				if(callback)callback();
			});		
		});
	},
	
	dateMonthTS: function(date){
		return date.getDate()+"-"+date.getMonth();
	},
	
	getStats: function(){
		return this.stats;
	},
	
	getWN7: function(stats,avTier){
		var wn7 = (1240-1040/Math.pow(Math.min(avTier,6),0.164))*stats['FRG']/stats['GPL'];
		wn7 += stats['DMG']/stats['GPL']*530/(184*Math.pow(Math.E,0.24*avTier)+130);
		wn7 += stats['SPT']/stats['GPL']*125*Math.min(avTier, 3)/3;
		wn7 += Math.min(stats['DPT']/stats['GPL'],2.2)*100;
		wn7 += ((185/(0.17+Math.pow(Math.E,((stats['WIN']/stats['GPL']*100-35)*-0.134))))-500)*0.45;
        wn7 += (5 - Math.min(avTier,5))*-125 / (1 + Math.pow(Math.E,( ( avTier - Math.pow((stats['GPL']/220),(3/avTier)) )*1.5 )));
		if( isNaN(wn7))wn7 = 0;
		
		return Math.round(wn7*100)/100;
	},
	
	getEFR: function(stats,avTier){
		if(avTier > 0)var f2 = 10/(avTier+2)*(0.23+2*avTier/100);
		else var f2=0;
		if(stats['GPL'] > 0)
			var efr=stats['FRG']/stats['GPL']*250 + 
					stats['DMG']/stats['GPL']*f2 + 
					stats['SPT']/stats['GPL']*150 + 
					Math.log(stats['CPT']/stats['GPL']+1)/Math.log(1.732)*150 + 
					stats['DPT']/stats['GPL']*150;
		else var efr = 0;
		
		return Math.round(efr*100)/100;
	},
	
	getSC3: function(wn7,score){
		return  Math.round(wn7/1500*score*100)/100;
	}
});