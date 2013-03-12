mongoose = require('mongoose')

function main(){
    var Server = require('./server'),
        App = require('./app');
        
    mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/wotcsapi');
	
  	server = new Server(process.env.PORT || 3000);
  	app = new App();
	
	app.updatePlayerLists();
	setInterval(function(){
		app.updatePlayerLists();
	},600000);
	
	setInterval(function(){
	},3600000);
  	
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
}

main();