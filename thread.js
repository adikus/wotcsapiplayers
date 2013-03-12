var cls = require("./lib/class"),
    _ = require("underscore"),
    Request = require("./request"),
    mongoose = require('mongoose');

module.exports = Thread = cls.Class.extend({
	init: function(player, callback){
		this.player = player;
		this.id = 0;
		this.r = 0;
		if(callback)this.onDone(callback);
	},
	
	start: function() {
		this.loadPlayer();
		console.log("Thread started.");
	},
	
	onDone: function(callback) {
		this.done_callback = callback;
	},
	
	onTimeout: function(callback) {
		this.timeout_callback = callback;
	},
	
	loadPlayer: function() {
		var self = this;
		
		if(!this.player){
			self.timeout = setTimeout(function(){
				var test = self.player
				self.player = self.done_callback();
				self.loadPlayer();
			},1000);
			return false;
		}
		
		this.player.find(function(err){
			
			self.r++;
			
			var wid = self.player.wid;
			
			req = new Request('worldoftanks.eu','accounts',wid,'1.8');
			
			req.onSuccess(function(data){
				if(!self.player)console.log(wid);
				self.player.parseData(data);
				self.player.save(function(err){
					if(err){
						console.log(self.player.wid+" - error:");
						console.log(err instanceof mongoose.Error.VersionError);
						throw err;
					}
					console.log('Loaded: '+self.player.wid);
					self.player = self.done_callback();
					//if(self.timeout)clearTimeout(self.timeout);
					self.loadPlayer();
				});
			});
			
			req.onTimeout(function(){
				if(self.timeout_callback){
					console.log('Timeout: '+self.player.wid);
					
					self.player = self.timeout_callback(self.player.wid);
					//if(self.timeout)clearTimeout(self.timeout);
					self.loadPlayer();
				}
			});
		});
	},
});