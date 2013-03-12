var cls = require("./lib/class"),
    _ = require("underscore"),
    http = require("http");

module.exports = MemberListRequest = cls.Class.extend({
	init: function(wid){
		this.data = '';
		
		var	self = this,
			options = {
				  host: "wotcsapiclans.herokuapp.com",
				  port: 80,
				  path: '/status/'+wid,
				  method: 'GET',
				};
		
		this.request = http.request(options, function(res) {
			var timeout = res.statusCode == 504;
			
			res.on('data', function (chunk) {
				if(!timeout)self.data += chunk.toString('utf8');
			});
			
			res.on('end', function (chunk) {
				if(!timeout){
					if(chunk)self.data += chunk.toString('utf8');
					var data = JSON.parse(self.data);
					self.success_callback(data.members[0]);
				}else {
					if(self.timeout_callback)self.timeout_callback();
				}
			});
		});

		this.request.on('error', function(e) {
			console.log('problem with request: ' + e.message);
		});

		this.request.end();
	},
	
	onSuccess: function(callback){
		this.success_callback = callback;
	},
	
	onTimeout: function(callback){
		this.timeout_callback = callback;
	}
});