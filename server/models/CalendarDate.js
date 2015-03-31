var mongoose = require('mongoose'),
    CalendarDate = mongoose.model('CalendarDate', new mongoose.Schema({
        agency_key: {type: String, index: true},
        service_id: {type: String},
        date: {type: String},
        exception_type: {type: String}
    }));

// Info: https://developers.google.com/transit/gtfs/reference#calendar_dates_fields