var cls = require("./lib/class"),
    _ = require("underscore"),
    url = require("url");

module.exports = router = cls.Class.extend({
	init: function(){
		this.routes = {};
	},

	setRoute: function(route,callback){
		this.routes[route] = callback;
	},
	
	route: function(requrl,data){
		var url_parts = url.parse(requrl,true),
	    	path_parts = url_parts.path.split("/"),
	    	path = path_parts[1],
	    	options = [];
	    
	    for(var i=2;i<path_parts.length;i++){
	    	options.push(path_parts[i]);
	    }
	    options = this.parseOptions(options);

	    var ret = {};
	    if(path === ""){
	    	ret = this.routes["status"](options);
	    }else if(this.routes[path]){
	    	ret = this.routes[path](options);
	    }else{
	    	ret = {status:'Error',error:''};
	    	if(!path)ret.error += 'Method not defined;';
	    	if(path && !this.routes[path])ret.error += 'Method '+path+' does not exist;';
	    }
		return ret;
	},
	
	parseOptions: function(options){
		var ret = [];
		_.each(options,function(option){
			var i = option.indexOf("=");
			if(i != -1){
				var key = option.substring(0, i),
					val = option.substring(i+1);
			ret[key] = val;
			} else ret.push(option);
		});
		return ret; 
	}
});