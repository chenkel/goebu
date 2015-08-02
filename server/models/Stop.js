var mongoose = require('mongoose'),
    Stop = mongoose.model('Stop', new mongoose.Schema({
        agency_key: {type: String, index: true},
        stop_id: {type: String, index: true},
        stop_code: {type: String},
        stop_name: {type: String},
        stop_desc: {type: String},
        icon: {type: String},
        stop_lat: {type: Number},
        stop_lon: {type: Number},
        loc: {type: Array, index: '2d'},
        zone_id: {type: Number},
        stop_url: {type: String},
        location_type: {type: String},
        parent_station: {type: String},
        stop_timezone: {type: String}})
);


// Infos: https://developers.google.com/transit/gtfs/reference#stops_fields
