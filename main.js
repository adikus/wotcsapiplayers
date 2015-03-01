var App = require('./core/app');

var app = new App();
app.run();

process.on('uncaughtException', function(err){
    app.logError(err);
});
