var cls = require("./lib/class"),
    _ = require("underscore"),
    DBTypes = require("./db_types");

module.exports = Vehicle = cls.Class.extend({
	init: function(data,pid){
		if(data){
			this.name = data.name;
			this.lname = data.localized_name;
			this.tier = parseInt(data.level);
			this.battles = parseInt(data.battle_count);
			this.nation = parseInt(this.parseNation(data.nation));
			this.nation_string = data.nation;
			this.wins = parseInt(data.win_count);
			this.type = parseInt(this.parseType(data["class"]));
		}
		this.pid = pid;
	},
	
	findPlayerVehicle: function() {
		var self = this;
		
		if(self.find_callback)self.find_callback();
		
		DBTypes.PlVeh.findOne({player:self.pid,veh:self.vehDoc._id},function(err, doc){
			if(!doc){
				self.doc = new DBTypes.PlVeh();
				self.doc.player = self.pid;
				self.doc.veh = self.vehDoc._id;
			}else {
				self.doc = doc;
			}	
			self.doc.updated_at = Date.now();
			self.doc.battles = self.battles;
			self.doc.wins = self.wins;
		
			self.doc.save(function(err){
				//console.log('Veh '+self.vehDoc.name+' saved');
				if(err)console.log(err);
			});		
		});
	},
	
	findVehicle: function(callback) {
		var self = this;
		
		var q = this.doc?DBTypes.Veh.findOne({_id:self.doc.veh}):DBTypes.Veh.findOne({name:self.name});
		q.exec(function(err, doc){
			if(!doc){
				self.vehDoc = new DBTypes.Veh();
				self.vehDoc.name = self.name;
				self.vehDoc.lname = self.lname;
				self.vehDoc.tier = self.tier;
				self.vehDoc.nation = self.nation;
				self.vehDoc.type = self.isScout?-1:self.type;
				
				self.vehDoc.save(function(){
					self.findPlayerVehicle();
				});
			}else {
				self.vehDoc = doc;
				if(!self.doc)self.findPlayerVehicle();
				else if(callback)callback();
			}			
		});
	},
	
	onFind: function(callback) {
		this.find_callback = callback;
	},
	
	getScore: function(){
		if(	this.tier == 10 && this.type == 1 ){
			return 1000+(this.wins/10);
		}else if( this.tier == 10 && this.type == 2){
			return 1000+(this.wins/10);
		}else if( this.tier == 10 && this.type == 3 ){
			return 900+(this.wins/10);
		}else if( this.tier == 8 && this.type == 4 ){
			return 900+(this.wins/10);
		}else return 0;
	},
	
	getScore2: function(){
		var percentage = this.wins/this.battles*100,
			add = (percentage-40)*50;
		if(	this.tier == 10 && this.type == 1 ){
			return 1000+add;
		}else if( this.tier == 10 && this.type == 2){
			return 1000+add;
		}else if( this.tier == 10 && this.type == 3 ){
			return 900+add;
		}else if( this.tier == 8 && this.type == 4 ){
			return 900+add;
		}else return 0;
	},
	
	getScore3: function(){
		var percentage = this.wins/this.battles*100,
			factor = (percentage-35)/15*Math.min(this.battles,75)/75;
		if(	this.tier == 10 && this.type == 1 ){
			return 1000*factor;
		}else if( this.tier == 10 && this.type == 2){
			return 1000*factor;
		}else if( this.tier == 10 && this.type == 3 ){
			return 900*factor;
		}else if( this.tier == 8 && this.type == 4 ){
			return 900*factor;
		}else return 0;
	},
	
	filteredData: function() {
		return {
					"name": this.vehDoc.name,
					"lname": this.fixName(this.vehDoc.lname),
					"tier": this.vehDoc.tier,
					"battles": this.doc?this.doc.battles:this.battles,
					"nation": this.vehDoc.nation,
					"wins": this.doc?this.doc.wins:this.wins,
					"type": this.vehDoc.type,
					"updated_at": this.doc?this.doc.updated_at:Date.now(),
				}
	},
	
	fixName: function(name) {
		if(name.indexOf("_") == -1)return name;
		else {
			p = name.split("_");
			delete p[0];
			return p.join(" ");
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
		}
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
	}
});