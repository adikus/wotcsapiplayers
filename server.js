var cls = require("./lib/class"),
    _ = require("underscore"),
    http = require("http"),
    Router = require("./router"),
    zlib = require('zlib');

module.exports = server = cls.Class.extend({
	init: function(port){
		this.router = new Router();
		var self = this;
		
		http.createServer(function (request, response) {
			var acceptEncoding = request.headers['accept-encoding'];
		  	if (!acceptEncoding) {
		    	acceptEncoding = '';
		  	}
		  	var useGzip = acceptEncoding.match(/\bgzip\b/);
		  	
		  	response.writeHead(200, self.responseHeaders(useGzip));			
			
		    self.data = '';
		    request.on('data', function(chunk) {
				self.data += chunk.toString('utf8');
		    });
		    
		    request.on('end', function(chunk) {
		    	if(chunk)this.data += chunk.toString('utf8');
		    	
		    	var responseData = self.router.route(request.url,self.data);
		    	
		    	if(typeof responseData == 'function'){
		    		responseData(function(finalResponseData){
		    			self.endResponse(response, JSON.stringify(finalResponseData, null, "\t"), useGzip);
		    		});
		    	}else{
		    		self.endResponse(response, JSON.stringify(responseData, null, "\t"), useGzip);
		    	}
		    });
		}).listen(port);   
		console.log('Server running on port '+port);
	},
	
	responseHeaders: function(useGzip){
		var headers = {
		    	'Content-Type': 'text/plain',
		    	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		    	'Access-Control-Allow-Credentials': true,
		    	'Access-Control-Allow-Origin': '*',
		    	'Access-Control-Allow-Headers': 'Content-Type, *'
		    }
		if(useGzip){
			headers['content-encoding'] = 'gzip';
		}
		return headers;
	},
	
	endResponse: function(response, data, useGzip){
		if (useGzip) {
			zlib.gzip(data, function(err, buffer){
				if (!err) {
					response.end(buffer);
				}else{
					response.end(JSON.stringify(err, null, "\t"));
				}
			});
		}else{
			response.end(data);
		}
	},

	setRoute: function(route,callback){
		this.router.setRoute(route,callback);
	}
});