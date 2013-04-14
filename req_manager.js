var cls = require("./lib/class"),
    _ = require("underscore"),
    Config = require("./config");
    
module.exports = ReqManager = cls.Class.extend({
	init: function(simultaneousClans,clanMax,noClanMax){
		this.noClanMax = noClanMax;
		this.clanMax = clanMax;
		this.r = [];
		this.ids = [];
		this.clans = {};
		this.clanCounts = {};
		for(var i=0;i<simultaneousClans+1;i++){
			this.ids.push([]);
			this.r.push(0);
		}
		this.successTimes = [];
		this.times = [];
		
		var self = this;
		setInterval(function(){self.step();},50);
	},
	
	findShortest: function(from, to){
		var min = this.ids[from].length,
			mini = from;
		for(var i=from;i<to;i++){
			if(this.ids[i].length < min){
				min = this.ids[i].length;
				mini = i;
			}
		}
		return mini;
	},
	
	findLongest: function(from, to){
		var max = 0,
			maxi = false;
		for(var i=from;i<to;i++){
			if(this.ids[i].length > max){
				max = this.ids[i].length;
				maxi = i;
			}
		}
		return maxi;
	},
	
	findQueue: function(cid){
		if(cid){
			if(!this.clans[cid]){
				this.clans[cid] = this.findShortest(1,this.ids.length);
				if(!this.clanCounts[cid])this.clanCounts[cid] = 0;
			}
			return this.clans[cid];
		}else{
			return this.findShortest(0, 1);
		}
	},
	
	addReq: function(cid, req, wid, success, timeout){
		var i = this.findQueue(cid);
		if(cid)this.clanCounts[cid]++;
		this.ids[i].push({r:req,w:wid,s:success,t:timeout, c:cid});
		return this.ids[i].length-1;
	},
	
	step: function(){
		for(var i=1;i<this.ids.length;i++){
			while(this.r[i] < this.clanMax && this.ids[i].length > 0){
				this.startRequest(this.ids[i].shift(),i);
			}
			if(this.ids[i].length == 0 && this.r[i] < this.clanMax){
				var q = this.findLongest(1,this.ids.length);
				if(q){
					this.startRequest(this.ids[q].shift(),i);
				}
			}
		}
		while(this.r[0] < this.noClanMax && this.ids[0].length > 0){
			this.startRequest(this.ids[0].shift(),0);
		}
		
		var now = new Date();
		if(this.successTimes[0] && this.successTimes[0].getTime() + 10000 < now.getTime())this.successTimes.shift();
	},
	
	startRequest: function(id,q){
		var self = this,
			time = new Date();
		
		req = new Request(id.r,id.w);
			
		req.onSuccess(function(data){
			id.s(data);
			self.r[q]--;
			if(id.c)self.clanCounts[id.c]--;
			if(self.clanCounts[id.c] == 0){
				delete self.clanCounts[id.c];
				delete self.clans[id.c];
			}
			self.addTime(new Date(),time);
		});
		
		req.onTimeout(function(){
			id.t();
			self.r[q]--;
		});
		
		this.r[q]++;
	},
	
	pos: function(wid,cid){
		var ret = 0,
			q = this.clans[cid];
		
		var f = _.find(this.ids[q],function(i){
			ret++;
			return i.w == wid;
		});
		if(!f)return -1;
		return ret;
	},
	
	getAverageTime: function() {
		var total = _.reduce(this.times, function(memo, time){ return memo + time; }, 0);
		return this.times.length > 0 ? total / this.times.length : 0;
	},
	
	speed: function(){
		if(this.successTimes.length > 0){
			var diff = this.getDiff(this.successTimes[0],_.last(this.successTimes))/1000;
			return diff == 0 ? 0 : this.successTimes.length / diff;
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
		
		this.times.push(this.getDiff(s,t));
		if(this.times.length > 100)this.times.shift();
	},
});