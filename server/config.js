"use strict";

var _ = require('underscore');

if (process.env.NODE_ENV === 'test') {
    module.exports = require('test/config');
    return;
}

var conf = {
    default: {
        mongo_url: process.env.MONGOHQ_URL || 'mongodb://localhost:27017/gtfs',
        agencies: [
            /*
             Put agency_key names from gtfs-data-exchange.com.
             Optionally, specify a download URL to use a dataset not from gtfs-data-exchange.com
             */
            //'auckland-transport'
            {
                agency_key: 'goevb',
                url: 'https://www.dropbox.com/s/ec8bgs52wckrsh0/latest.zip?dl=1'
            }
        ],
        server_host: 'http://goebu.christopherhenkel.de:3000/',
        logging: {
            level: "info"
        }
    },
    development: {
        logging: {
            level: "debug"
        }
    }
};

module.exports = function (env) {
    //console.log('Loading ->', env, '<- config!');
    if (!env) {
        console.error('NODE_ENV empty.');
        return conf.default;
    } else {
        return _.defaults(conf[env], conf.default);
    }
};