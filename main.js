mongoose = require('mongoose')

function main(){
    var Server = require('./server'),
    	App = require('./app'),
    	Config = require('./config');
        
    mongoose.connect(process.env.MONGOHQ_URL || Config.defaultMongo, { server: { poolSize: 25 }});
	
  	server = new Server(process.env.PORT || Config.defaultPort);
  	app = new App();
	
	setInterval(function(){
		app.updatePlayerLists();
	},Config.updatePlayerListInterval);
	
	setInterval(function(){
		app.updateStatus();
	},Config.updateStatusInterval);
	
	setInterval(function(){
		app.updateScores();
	},Config.updateScoreInterval);
  	
  	server.setRoute('status',function(options){
  		return app.statusGlobal(options);
  	});
  	
  	server.setRoute('clan',function(options){
  		return app.statusClan(options);
  	});
  	
  	server.setRoute('player',function(options){
  		return app.statusPlayer(options);
  	});
  	
  	server.setRoute('scores',function(options){
  		return app.scores(options);
  	});
  	
  	server.setRoute('loaders',function(options){
  		return app.loaderStatus(options);
  	});
  	
  	server.setRoute('names',function(options){
  		return app.translateNames(options);
  	});
}

main();