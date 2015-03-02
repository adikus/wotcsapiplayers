var cls = require("./../lib/class");
var config = require('./../config');
var _ = require("underscore");
var clc = require('cli-color');

var LOG_LEVEL = config.logger.logLevel;
var LOG_LEVELS = {
    debug: 0,
    info: 1,
    warning: 2,
    error: 3
};

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
            return '[' + clc.cyan(level.toUpperCase()) + ']';
        case 'info':
            return '[' + clc.green(level.toUpperCase()) + ' ]';
        case 'warning':
            return '[' + clc.yellow('WARN') + ' ]';
        case 'error':
            return '[' + clc.red(level.toUpperCase()) + ']';
    }
    return '';
};

Logger.log = function(message, level, banner) {
    if(LOG_LEVEL > LOG_LEVELS[level])return;
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
