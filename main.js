mongoose = require('mongoose')

function main(){
    var Server = require('./server'),
    	App = require('./app'),
    	DBTypes = require("./db_types"),
    	Config = require('./config');
        
    mongoose.connect(process.env.MONGOHQ_URL || Config.defaultMongo, { server: { poolSize: 25 }});
    
  	server = new Server(process.env.PORT || Config.defaultPort);
  	app = new App();
    
  	setInterval(function(){
		app.updateVehStats();
	},Config.updateVehStatsInterval);
	
	setInterval(function(){
		app.updatePlayerLists();
	},Config.updatePlayerListInterval);
	
	setInterval(function(){
		app.updateStatus();
	},Config.updateStatusInterval);
	
	setInterval(function(){
		app.updateScores();
	},Config.updateScoreInterval);
	
	setInterval(function(){
		app.updatePlayerStats();
	},Config.updatePlayerStatsInterval);
  	
  	server.setRoute('status',function(options){
  		return app.statusGlobal(options);
  	});
  	
  	server.setRoute('clan',function(options){
  		return app.statusClan(options);
  	});
  	
  	server.setRoute('player',function(options){
  		return app.statusPlayer(options);
  	});
  	
  	server.setRoute('loaders',function(options){
  		return app.loaderStatus(options);
  	});
  	
  	server.setRoute('names',function(options){
  		return app.translateNames(options);
  	});
  	
  	server.setRoute('stats',function(options){
  		return app.vehStats(options);
  	});
  	
  	server.setRoute('player_stats',function(options){
  		return app.playerStats(options);
  	});
  	
  	server.setRoute('set_sim',function(options){
  		return app.setSimultaneousReqs(options);
  	});
}

main();