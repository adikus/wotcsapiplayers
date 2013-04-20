VEHICLE_DATA = [];

function main(){
    var Server = require('./server'),
    	App = require('./app'),
    	DBTypes = require("./db_types"),
    	Config = require('./config'),
    	Routes = require("./routes"),
    	_ = require("underscore");
    
    var app = new App(function(){
  		var server = new Server(process.env.PORT || Config.server.defPort);
  		
  		_.each(Routes,function(fName,route){
			server.setRoute(route,function(options){
		  		return app[fName](options);
		  	});
		});
  	});
}

main();