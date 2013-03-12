var cls = require("./lib/class"),
    _ = require("underscore"),
    http = require("http"),
    Router = require("./router");

module.exports = server = cls.Class.extend({
	init: function(port){
		this.router = new Router();
		var self = this;
		
		http.createServer(function (request, response) {
			 
		    response.writeHead(200, {
		    	'Content-Type': 'text/plain',
		    	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		    	'Access-Control-Allow-Credentials': true,
		    	'Access-Control-Allow-Origin': '*',
		    	'Access-Control-Allow-Headers': 'Content-Type, *'
		    }); 
		    this.data = '';
		    request.on('data', function(chunk) {
				this.data += chunk.toString('utf8');
		    });
		    
		    request.on('end', function(chunk) {
		    	if(chunk)this.data += chunk.toString('utf8');
		    	
		    	var responseData = self.router.route(request.url,self.data);
		    	
		    	if(typeof responseData == 'function'){
		    		responseData(function(finalResponseData){
		    			response.end(JSON.stringify(finalResponseData, null, "\t"));
		    		});
		    	}else{
		    		response.end(JSON.stringify(responseData, null, "\t"));
		    	}
		    });
		}).listen(port);   
		console.log('Server running on port '+port);
	},

	setRoute: function(route,callback){
		this.router.setRoute(route,callback);
	}
});