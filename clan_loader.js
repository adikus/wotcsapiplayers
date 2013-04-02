var cls = require("./lib/class"),
    _ = require("underscore"),
    DBTypes = require("./db_types"),
    Config = require("./config");
    
module.exports = ClanLoader = cls.Class.extend({
	init: function(wid){		
		this.lastAccessed = this.created = new Date();
		this.wid = wid;
		this.reqsP = 0;
		this.savesP = 0;
		
		var self = this;		
		this.deleteInterval = setInterval(function(){
			self.checkDelete();
		},1000);
	},
	
	checkDelete: function() {
		var now = new Date(),
			self = this,
			duration = now.getTime()-self.lastAccessed.getTime();
			
		if(duration > Config.loaderDeleteTime){
			clearInterval(self.deleteInterval);
			self.delete_callback();
		}
	},
	
	start: function(force) {
		this.lastAccessed = new Date();
		
		this.players = [];
		this.done = false;
		this.l = 99999999;
		
		this.errors = [];
		this.reqsP = 0;
		this.savesP = 0;
		this.lastWid = 0;
	
		var time = new Date(),
			self = this;
		time.setTime(time.getTime()-Config.playerUpdateInterval);
		
		console.log("Starting loader for clan: "+this.wid);
		
		DBTypes.Player.count({clan_id: this.wid},function(err,count){
			self.l = count;
			if(self.l == 0)self.done = true;
			if(!force)self.loadFromDB(time);
			self.loadFromWG(time,force);
		});
	},
	
	loadFromDB: function(time) {
		var cond = {clan_id: this.wid,updated_at:{$gt:time}},
			self = this;
		
		DBTypes.Player.find(cond,function(err,docs){
			var players = _.map(docs,function(doc){var p = new Player(doc.wid);p.doc = doc;return p;});
			_.each(players,function(player){
				player.getData(function(data){self.player_data_callback(data)});
			});
		});
	},
	
	loadFromWG: function(time, force) {
		var cond = {clan_id: this.wid,updated_at:{$lt: (force?new Date():time) }},
			self = this;
		
		DBTypes.Player.find(cond,function(err,docs){
			var players = _.map(docs,function(doc){var p = new Player(doc.wid);p.doc = doc;return p;});
			_.each(players,function(player){
				self.reqsP++;
				self.lastWid = player.wid;
				self.loadPlayer(player,function(err){
					self.reqsP--;
					if(!err) {
						self.savesP--;
						if(player.doc.clan_id == self.wid){
							player.getData(function(data){self.player_data_callback(data)});
						}else {
							self.playerDone();
						}
					} else self.handleError(err);
				},function(){self.savesP++;});
			});
		});
	},
	
	player_data_callback: function(data) {
		data.saved_at = (new Date()).getTime();
		//console.log(this.players);
		this.players.push(data);
		this.playerDone();
	},
	
	playerDone: function() {
		this.l--;
		if(this.l == 0)this.done = true;
	},
	
	handleError: function(err) {
		if(err)this.errors.push(err);
		this.playerDone();
	},
	
	isDone: function() {
		this.lastAccessed = new Date();
		return this.done;
	},
	
	deleteCallback: function(callback) {
		this.delete_callback = callback;
	},
	
	getData: function(last) {
		var ret = {members:[]},
			saved_last = 0,
			last = last?last:0;
		
		_.each(this.players,function(player){
			var time = new Date(player.saved_at);
			if(time.getTime() > last){
				if(time.getTime() > saved_last)saved_last = time.getTime();
				ret.members.push(player);
			}
		});
		
		ret.status = "ok";
		ret.last = saved_last;
		ret.is_done = this.done;
		
		return ret;
	},
	
	setPlayerLoadFunction: function(callback){
		this.loadPlayer = callback;
	},
});