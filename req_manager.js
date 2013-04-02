var cls = require("./lib/class"),
    _ = require("underscore"),
    Config = require("./config");
    
module.exports = ReqManager = cls.Class.extend({
	init: function(simultaneous){
		this.s = simultaneous;
		this.r = 0;
		this.ids = [];
		this.successTimes = [];
		this.times = [];
		
		var self = this;
		setInterval(function(){self.step();},50);
	},
	
	addReq: function(req, wid, success, timeout){
		this.ids.push({r:req,w:wid,s:success,t:timeout});
		return this.ids.length-1;
	},
	
	step: function(){
		while(this.r < this.s && this.ids.length > 0){
			this.startRequest(this.ids.shift());
		}
	},
	
	pos: function(wid){
		for(var i = 0;i<this.ids.length;i++){
			console.log(i);
			console.log(this.ids[i].w);
			if(this.ids[i].w = wid)return this.ids.length-i;
		}
		return -1;
	},
	
	getAverageTime: function() {
		var total = _.reduce(this.times, function(memo, time){ return memo + time; }, 0);
		return this.times.length > 0 ? total / this.times.length : 0;
	},
	
	speed: function(){
		if(this.successTimes.length > 0){
			var diff = this.getDiff(this.successTimes[0],_.last(this.successTimes))/1000;
			return this.successTimes.length / diff;
		} else return 0;
	},
	
	setSimultaneous: function(simultaneous) {
		this.s = simultaneous;
	},
	
	getDiff: function(t1,t2) {
		return t2.getTime() - t1.getTime();
	},
	
	addTime: function(t,s) {
		if(this.successTimes.length > 0 && this.getDiff(_.last(this.successTimes),t) > 30000)this.successTimes = [];
		this.successTimes.push(t);
		if(this.successTimes.length > 100)this.successTimes.shift();
		
		this.times.push(this.getDiff(s,t));
		if(this.times.length > 100)this.times.shift();
	},
	
	startRequest: function(id){
		var self = this,
			time = new Date();
		
		req = new Request(id.r,id.w);
			
		req.onSuccess(function(data){
			id.s(data);
			self.r--;
			self.addTime(new Date(),time);
		});
		
		req.onTimeout(function(){
			id.t();
		});
		
		this.r++;
	},
});