var mongoose = require('mongoose')
    , FareRule = mongoose.model('FareRule', new mongoose.Schema({
        agency_key: {type: String, index: true}
        , fare_id: {type: String}
        , route_id: {type: String}
        , origin_id: {type: String}
        , destination_id: {type: String}
        , contains_id: {type: String}
    }));

// Info: https://developers.google.com/transit/gtfs/reference#fare_rules_fields