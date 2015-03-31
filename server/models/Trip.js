var mongoose = require('mongoose'),
    Trip = mongoose.model('Trip', new mongoose.Schema({
        agency_key: {type: String, index: true},
        route_id: {type: String, index: true},
        service_id: {type: String, index: true},
        trip_id: {type: String},
        trip_headsign: {type: String},
        trip_short_name: {type: String},
        direction_id: {type: Number, index: true, min: 1, max: 2},
        block_id: {type: Number},
        shape_id: {type: Number}
    }));

// Info: https://developers.google.com/transit/gtfs/reference#trips_fields