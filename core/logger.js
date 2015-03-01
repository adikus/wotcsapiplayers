var cls = require("./../lib/class");
var config = require('./../config');
var _ = require("underscore");
var chalk = require('chalk');

var Logger = cls.Class.extend({
    init: function (banner) {
        this.banner = banner;
    },

    log: function (mesage, level) {
        Logger.log(mesage, level, this.banner);
    },

    debug: function (message) {
        this.log(message, 'debug');
    },

    info: function (message) {
        this.log(message, 'info');
    },

    warning: function (message) {
        this.log(message, 'warning');
    },

    error: function (message) {
        this.log(message, 'error');
    }
});

Logger.banner = function(banner) {
    return banner ? '[' + banner + '] ' : ' ';
};

Logger.tag = function(level) {
    switch(level){
        case 'debug':
            return '[' + chalk.cyan(level.toUpperCase()) + ']';
        case 'info':
            return '[' + chalk.green(level.toUpperCase()) + ']';
        case 'warning':
            return '[' + chalk.yellow(level.toUpperCase()) + ']';
        case 'error':
            return '[' + chalk.red(level.toUpperCase()) + ']';
    }
    return '';
};

Logger.log = function(message, level, banner) {
    var fullMessage = "%s: %s%s%s";
    var time = (new Date).toISOString();
    if(level == 'error'){
        console.error(fullMessage, time, this.tag(level), this.banner(banner), message);
    }else{
        console.log(fullMessage, time, this.tag(level), this.banner(banner), message);
    }
};

Logger.info = function(message) {
    this.log(message, 'info');
};

Logger.warning = function(message) {
    this.log(message, 'warning');
};

Logger.error = function(message) {
    this.log(message, 'error');
};

Logger.debug = function(message) {
    this.log(message, 'debug');
};

module.exports = Logger;
