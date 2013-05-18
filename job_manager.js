var cls = require("./lib/class"),
    _ = require("underscore"),
    Config = require("./config"),
    DBTypes = require("./db_types");

module.exports = JobManager = cls.Class.extend({
	init: function() {
		this.counter = 0;
		this.counterMax = 1;
		this.current = "";
		for(var i in Config.jobs.periodical){
			var period = parseInt(i);
			this.counterMax *= period;
		}
		
		var self = this;
		setInterval(function(){
			self.step();
		},1000);
		
		this.checkDBForJobs();
	},
	
	getLog: function(callback) {
		var ret = {current: this.current};
		DBTypes.Job.find({t:{$lt:new Date()}},function(err,docs){
			var jobs = _.map(docs,function(doc){return {job:doc.j,time:doc.t};});
			ret.done = jobs;
			DBTypes.Job.find({t:{$gt:new Date()}},function(err,docs){
				var jobs = _.map(docs,function(doc){return {job:doc.j,time:doc.t};});
				ret.planned = jobs;
				callback(ret);
			});
		});
	},
	
	step: function() {
		var self = this;
		
		this.counter++;
		for(var i in Config.jobs.periodical){
			var period = parseInt(i);
			if(this.counter % period == 0  && !this.busy)this.doJob(Config.jobs.periodical[i]);
		}
		if(this.counter == this.counterMax)this.counter = 0;
		
		if(!this.jobs)return false;
		for(var i in this.jobs){
			if(this.jobs[i].t <= new Date() && !this.busy){
				var a = i;
				var job = this.jobs[i];
				this.doJob(job.j,function(){
					console.log("tu",a);
					var newTime = new Date();
					newTime.setTime(job.t.getTime()+24*60*60*1000);
					var newJob = new DBTypes.Job({
						j: job.j,
						t: newTime
					});
					newJob.save();
					self.jobs[a] = newJob;
					console.log(self.jobs[a]);
				});
			}
		}
	},
	
	checkDBForJobs: function(){
		var self = this;
		
		var now = new Date();
		DBTypes.Job.find({t:{$gt:now}},function(err,docs){
			var jobs = [];
			if(docs.length == 0){
				for(var i in Config.jobs.timed){
					var time = new Date();
					var timeParts = i.split(":");
					time.setHours(timeParts[0]);
					time.setMinutes(timeParts[1]);
					time.setSeconds(timeParts[2]);
					if(time < now)time.setTime(time.getTime()+24*60*60*1000);
					var job = new DBTypes.Job({j:Config.jobs.timed[i],t:time});
					jobs.push(job);
					job.save();
				}
			}else{
				jobs = docs;
			}
			self.jobs = jobs;
		});
	},
	
	doJob: function(job,success) {
		var self = this;
		this.current = job;
		this.busy = true;
		this[job](function(){
			self.busy = false;
			self.current = "";
			if(success)success();
		});
	},
	
	updatePlayerStats:function(done_callback) {
		var o = {
			map: function () {
				if(this.sc){
					var s = this.sc;
					var GPL = Math.round(s.GPL/200)*200;
					emit("GPL:"+GPL,1);  
					var WIN = Math.round(s.WIN/s.GPL*500)/5;
					emit("WIN:"+WIN,1); 
					var SUR = Math.round(s.SUR/s.GPL*500)/5;
					emit("SUR:"+SUR,1); 
					var FRG = Math.round(s.FRG/s.GPL*100)/100;
					emit("FRG:"+FRG,1);
					var KD = Math.round(s.FRG/(s.GPL-s.SUR)*40)/40;
					emit("KD:"+KD,1);
					var SPT = Math.round(s.SPT/s.GPL*50)/50;
					emit("SPT:"+SPT,1);
					var DMG = Math.round(s.DMG/s.GPL/10)*10;
					emit("DMG:"+DMG,1);
					var CPT = Math.round(s.CPT/s.GPL*25)/25;
					emit("CPT:"+CPT,1);
					var DPT = Math.round(s.DPT/s.GPL*50)/50;
					emit("DPT:"+DPT,1);
					var EXP = Math.round(s.EXP/s.GPL/5)*5;
					emit("EXP:"+EXP,1);
					var EFR = Math.round(s.EFR/10)*10;
					emit("EFR:"+EFR,1);
					var WN7 = Math.round(s.WN7/10)*10;
					emit("WN7:"+WN7,1);
					var SC3 = Math.round(s.SC3/250)*250;
					emit("SC3:"+SC3,1);
				}
			},
			reduce: function (k, vals) { 
				var ret = 0;
				for(i in vals){
					ret += vals[i];
				}
				return ret;
			},
			out:{replace: 'statistics'}
		},
		start = new Date();
		
		console.log("Updating player stats.");
		
		DBTypes.Player.mapReduce(o,function (err, results) {
			if(err)console.log(err);
			var end = new Date(),
				duration = end.getTime() - start.getTime();
			console.log("Player stats updated ("+duration+" ms).");
			done_callback();
		});
	},
	
	updateClanStats:function(done_callback) {
		var o = {
			query: DBTypes.Stat.find({SC:{$exists:true}}),
			map: function () {
				if(this.s && this.s.d && this.s.d.member_count){
					var s = this.s,
						i = s.d.u.length-1,
						mc = this.s.d.member_count[i];
					var GPL = Math.round(s.d.GPL[i]/20000)*20000;
					emit("GPL:"+GPL,1);  
					var WIN = Math.round(s.d.WIN[i]/s.d.GPL[i]*500)/5;
					emit("WIN:"+WIN,1); 
					var SUR = Math.round(s.d.SUR[i]/s.d.GPL[i]*500)/5;
					emit("SUR:"+SUR,1); 
					var FRG = Math.round(s.d.FRG[i]/s.d.GPL[i]*100)/100;
					emit("FRG:"+FRG,1);
					var KD = Math.round(s.d.FRG[i]/(s.d.GPL[i]-s.d.SUR[i])*40)/40;
					emit("KD:"+KD,1);
					var SPT = Math.round(s.d.SPT[i]/s.d.GPL[i]*50)/50;
					emit("SPT:"+SPT,1);
					var DMG = Math.round(s.d.DMG[i]/s.d.GPL[i]/10)*10;
					emit("DMG:"+DMG,1);
					var CPT = Math.round(s.d.CPT[i]/s.d.GPL[i]*25)/25;
					emit("CPT:"+CPT,1);
					var DPT = Math.round(s.d.DPT[i]/s.d.GPL[i]*50)/50;
					emit("DPT:"+DPT,1);
					var EXP = Math.round(s.d.EXP[i]/s.d.GPL[i]/5)*5;
					emit("EXP:"+EXP,1);
					var EFR = Math.round(s.d.EFR[i]/1000)*1000;
					emit("EFR:"+EFR,1);
					var WN7 = Math.round(s.d.WN7[i]/1000)*1000;
					emit("WN7:"+WN7,1);
					var SC3 = Math.round(s.d.SC3[i]/25000)*25000;
					emit("SC3:"+SC3,1);
					var EFRA = Math.round(s.d.EFR[i]/mc/10)*10;
					emit("EFRA:"+EFRA,1);
					var WN7A = Math.round(s.d.WN7[i]/mc/10)*10;
					emit("WN7A:"+WN7A,1);
					var SC3A = Math.round(s.d.SC3[i]/mc/250)*250;
					emit("SC3A:"+SC3A,1);
					emit("MC:"+mc,1);
				}
			},
			reduce: function (k, vals) { 
				var ret = 0;
				for(i in vals){
					ret += vals[i];
				}
				return ret;
			},
			out:{replace: 'cstatistics'}
		},
		start = new Date();
		
		console.log("Updating clan stats.");
		
		DBTypes.Stat.mapReduce(o,function (err, results) {
			if(err)console.log(err);
			var end = new Date(),
				duration = end.getTime() - start.getTime();
			console.log("Clan stats updated ("+duration+" ms).");
			done_callback();
		});
	},
	
	updateVehStats:function(done_callback) {
		var o = {
			scope:{},
			map: function () {
				if(this.v){
					for(var i in this.v){
						var v = this.v[i],
							name = v.v.replace('-','__');
						try {var vData = eval(name);} catch(err) {var vData = false;}
						if(vData && (vData.l == 10 || (vData.l == 8 && vData.t == 4))){
							var B = Math.round(v.b/20)*20;
							emit(v.v+":B:"+B,1);  
							var W = Math.round(v.w/v.b*250)/2.5;
							emit(v.v+":W:"+W,1);
							if(this.sc){
								var percentage = v.w/v.b*100,
									factor = (percentage-35)/15*Math.min(v.b,75)/75,
									S = Math.round(this.sc.WN7/1500*(vData.l==10?1000:900)*factor/25)*25;
								emit(v.v+":S:"+S,1);
							}
						}
					}
				}
			},
			reduce: function (k, vals) {
				var ret = 0;
				for(i in vals){
					ret += vals[i];
				}
				return ret;
			},
			out:{replace: 'vstatistics'}
		},
		start = new Date();
		for(var i in VEHICLE_DATA){
			var name = i.replace('-','__');
			o.scope[name] = VEHICLE_DATA[i];
		}
		console.log("Updating vehicle stats.");
		
		DBTypes.Player.mapReduce(o,function (err, results) {
			if(err)console.log(err);
			var end = new Date(),
				duration = end.getTime() - start.getTime();
			console.log("Vehicle stats updated ("+duration+" ms).");
			done_callback();
		});
	},
	
	updateStatus: function(done_callback) {
		var times = [],
			start = new Date(),
			l = 13,
			testForEnd = function(){
				l--;
				if(l == 0){
					var end = new Date(),
						duration = end.getTime() - start.getTime();
					console.log("Status updated ("+duration+" ms).");
					done_callback();
				}
			};
		
		console.log("Updating status.");
		
			for(var i=1;i<=12;i++){
				var time = new Date();
				time.setTime(time.getTime()-i*60*60*1000);
				times[i] = time;
			}	
			
			DBTypes.PlayerStatus.remove(function(){
				_.each(times,function(time,key){
					if(key > 0)
					DBTypes.Player.count({u:{$gt:time}},function(err, count){
						playerStatus = new DBTypes.PlayerStatus({_id:key,value:count});
						playerStatus.save(function(){
							testForEnd();
						});
					});
				});
			});
			
			DBTypes.Player.count({},function(err, count){
				playerStatus = new DBTypes.PlayerStatus({_id:0,value:count});
				playerStatus.save(function(){
					testForEnd();
				});
			});
	},
});