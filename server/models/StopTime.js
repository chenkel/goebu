var mongoose = require('mongoose'),
    utils = require('../lib/utils'),
    StopTime = mongoose.model('StopTime', new mongoose.Schema({
        agency_key: {type: String, index: true},
        trip_id: {type: String, index: true},
        arrival_time: {type: Number},
        departure_time: {type: Number, index: true},
        stop_id: {type: String, index: true},
        stop_sequence: {type: Number, index: true},
        stop_headsign: {type: String},
        pickup_type: {type: String},
        drop_off_type: {type: String},
        shape_dist_traveled: {type: String}
    }));

// Info: https://developers.google.com/transit/gtfs/reference#stop_times_fields