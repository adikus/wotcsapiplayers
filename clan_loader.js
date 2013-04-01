var cls = require("./lib/class"),
    _ = require("underscore"),
    DBTypes = require("./db_types"),
    Config = require("./config"),
    http = require("http");
    
module.exports = ClanLoader = cls.Class.extend({
	init: function(wid,forceLoad){
		var self = this,
			time = new Date();
			
		this.lastAccessed = new Date();
		this.players = [];
		this.done = false;
		this.wid = wid;
		this.l = 99999999;
		this.errors = [];
		this.reqsP = 0;
		this.savesP = 0;
		this.created = new Date();
		
		this.deleteInterval = setInterval(function(){
			var now = new Date(),
				duration = now.getTime()-self.lastAccessed.getTime();
				
				if(duration > Config.loaderDeleteTime){
					clearInterval(self.deleteInterval);
					self.delete_callback();
				}
		},1000);
			
		time.setTime(time.getTime()-Config.playerUpdateInterval);
		if(forceLoad){
			cond1 = {clan_id: wid,updated_at:{$gt:new Date()}};
			cond2 = {clan_id: wid,updated_at:{$lt:new Date()}};
		}else{
			cond1 = {clan_id: wid,updated_at:{$gt:time}};
			cond2 = {clan_id: wid,updated_at:{$lt:time}};
		}
		
		
		DBTypes.Player.count({clan_id: wid},function(err,count){
			self.l = count;
			if(self.l == 0)self.done = true;
			DBTypes.Player.find(cond1,function(err,docs){
				var players = _.map(docs,function(doc){var p = new Player(doc.wid);p.doc = doc;return p;});
				_.each(players,function(player){
					player.getData(function(data){
						data.saved_at = (new Date()).getTime();
						self.players.push(data);
						self.l--;
						if(self.l == 0)self.done = true;
					});
				});
			});
			DBTypes.Player.find(cond2,function(err,docs){
				var players = _.map(docs,function(doc){var p = new Player(doc.wid);p.doc = doc;return p;});
				_.each(players,function(player){
					self.reqsP++;
					self.loadPlayer(player,function(err){
						self.reqsP--;
						if(!err){
							self.savesP--;
							if(player.doc.clan_id == wid){
								player.getData(function(data){
									data.saved_at = (new Date()).getTime();
									self.players.push(data);
									self.l--;
									if(self.l == 0)self.done = true;
								});
							}else {
								self.l--;
								if(self.l == 0)self.done = true;
							}
						}
						else {
							self.errors.push(err);
							self.l--;
							if(self.l == 0)self.done = true;
						}
					},function(){self.savesP++;});
				});
			});
		});
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