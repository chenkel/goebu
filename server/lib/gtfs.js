var async = require('async')
    , mongoose = require('mongoose')
    , _ = require('underscore')
    , utils = require('./utils')
    , debug = require('debug')('goebu:gtfs');

var timeCheat = 43850;


//load config.js
try {
    var config = require('../config.js');
} catch (e) {
    handleError(new Error('Cannot find config.js'));
}

var db = mongoose.connect(config.mongo_url);

require('../models/Agency');
require('../models/Calendar');
require('../models/CalendarDate');
require('../models/FareAttribute');
require('../models/FareRule');
require('../models/FeedInfo');
require('../models/Frequencies');
require('../models/Route');
require('../models/Shape');
require('../models/Stop');
require('../models/StopTime');
require('../models/Transfer');
require('../models/Trip');

var Agency = db.model('Agency')
    , Route = db.model('Route')
    , Shape = db.model('Shape')
    , Stop = db.model('Stop')
    , StopTime = db.model('StopTime')
    , Trip = db.model('Trip')
    , Calendar = db.model('Calendar');


module.exports = {
    agencies: function (cb) {
        //gets a list of all agencies
        Agency.find({}, cb);
    },

    getRoutesByAgency: function (agency_key, cb) {
        //gets routes for one agency
        Route.find({agency_key: agency_key}, cb);
    },

    getAgenciesByDistance: function (lat, lon, radius, cb) {
        //gets all agencies within a radius

        if (_.isFunction(radius)) {
            cb = radius;
            radius = 25; // default is 25 miles
        }

        lat = parseFloat(lat);
        lon = parseFloat(lon);

        var radiusInDegrees = Math.round(radius / 69 * 100000) / 100000;

        Agency
            .where('agency_center')
            .near(lon, lat).maxDistance(radiusInDegrees)
            .exec(cb);
    },

    getRoutesByDistance: function (lat, lon, radius, cb) {
        // TODO : fix getTrips with arguments - agency_key, route_id, direction_id, direction_ids, trip_ids
        //gets all routes within a radius

        if (_.isFunction(radius)) {
            cb = radius;
            radius = 1; //default is 1 mile
        }

        lat = parseFloat(lat);
        lon = parseFloat(lon);

        var radiusInDegrees = Math.round(radius / 69 * 100000) / 100000
            , stop_ids = []
            , trip_ids = []
            , route_ids = []
            , routes = [];

        async.series([
            async.apply(getStopsNearby, lon, lat, radiusInDegrees, stop_ids),
            getTrips,
            //async.apply(getTrips, agency_key, route_id, direction_id, direction_ids, trip_ids),
            async.apply(getRoutes, trip_ids, route_ids),
            async.apply(lookupRoutes, route_ids, routes)
        ], function (e, results) {
            if (e) {
                debug(e, "getRoutesByDistance - error");
                cb(e, null);
            } else {
                cb(e, routes);
            }
        });


    },

    getStopsByRoute: function (agency_key, route_id, direction_id, cb) {
        //gets stops for one route

        if (_.isFunction(direction_id)) {
            cb = direction_id;
            direction_id = null;
        }

        var stops = {}
            , trip_ids = {}
            , stop_ids = {}
            , direction_ids = [];

        async.series([
            async.apply(getTrips, agency_key, route_id, direction_id, direction_ids, trip_ids),
            async.apply(getStopTimes, agency_key, direction_ids, trip_ids, stop_ids),
            async.apply(getStops, agency_key, direction_ids, stop_ids, stops)
        ], function (e, res) {
            // transform results based on whether direction_id was
            // - specified (return stops for a direction)
            // - or not specified (return stops for all directions)
            if (e) {
                debug(e, "getStopsByRoute - error");
                cb(e, null);
            } else {
                var results = [];
                if (direction_id) {
                    results = stops[direction_id] || [];
                } else {
                    _.each(stops, function (stops, direction_id) {
                        results.push({direction_id: direction_id, stops: stops || []});
                    });
                }
                cb(e, results);
            }
        });


    },

    getStopsByDistance: function (lat, lon, radius, cb) {
        //gets all stops within a radius
        var results = [];

        if (_.isFunction(radius)) {
            cb = radius;
            radius = 1; //default is 1 mile
        }

        lat = parseFloat(lat);
        lon = parseFloat(lon);

        var radiusInDegrees = Math.round(radius / 69 * 100000) / 100000;

        Stop
            .where('loc')
            .near(lon, lat).maxDistance(radiusInDegrees)
            .select('stop_id stop_name stop_lat stop_lon -_id')
            .exec(function (e, stops) {
                if (e) {
                    debug(e, "getStopsByDistance - error");
                    cb(e, null);
                } else {
                    results.push({direction_id: 0, stops: stops || []});
                    cb(e, results);
                }
            });
    },

    getTimesByStop: function (agency_key, route_id, stop_id, direction_id, cb) {
        //to want to give it a numOfTimes argument. 1000 is probably at least 10x
        //more times than will be returned.

        //gets routes for one agency
        if (_.isFunction(direction_id)) {
            cb = direction_id;
            direction_id = null; //default is ~ 1/4 mile
        }

        var fields = {
            agency_key: agency_key,
            route_id: route_id,
            stop_id: stop_id,
            direction_id: direction_id
        };

        var service_ids = []
            , trip_ids = []
            , times = [];

        //Find service_id that matches todays date
        async.series([
            async.apply(checkFields, fields),
            async.apply(findServices, agency_key, service_ids),
            async.apply(findTrips, agency_key, route_id, direction_id, service_ids, trip_ids),
            async.apply(findTimeScheduleForStop, agency_key, stop_id, trip_ids, times, 1)
        ], function (e, results) {
            if (e) {
                debug(e, "getTimesByStop - error");
                cb(e, null);
            } else {
                cb(e, times);
            }

        });

    },

    findBothDirectionNames: function (agency_key, route_id, cb) {
        /*
         * Returns an object of {northData: "Headsign north", southData: "Headsign south"}
         */
        var findDirectionName = function (agency_key, route_id, direction_id, cb) {
            var query = {
                agency_key: agency_key,
                route_id: route_id,
                direction_id: direction_id
            };

            Trip
                .find(query)
                .limit(1)
                .run(function (e, trips) {
                    if (e) {
                        debug(e, "findBothDirectionNames - error");
                        cb(e, null);
                    } else {
                        cb(trips[0].trip_headsign);
                    }
                });
        };
    },

    getShapesByRoute: function (agency_key, route_id, direction_id, cb) {
        if (_.isFunction(direction_id)) {
            cb = direction_id;
            direction_id = null;
        }

        var shape_ids = [];
        var shapes = [];

        async.series([
            async.apply(getShapeIds, agency_key, route_id, direction_id, shape_ids),
            async.apply(getShapes, agency_key, shape_ids, shapes)
        ], function (err, result) {
            if (err) {
                debug(err, "getShapesByRoute - error");
                cb(err, null);
            } else {
                cb(null, shapes);
            }
        });


    },

    getInterpolatedBusPositions: function (cb) {
        //
        // get all routes --> route_ids [21,22]
        // get all trips with route_ids --> trip_ids [{route_id: 22: direction id: 0 [22001, 22002, 22003],
        // get all stoptimes for all direction_ids and trip_ids --> stop_ids, departure_time > NOW

        //  getTimesByStop
        //  agency_key, route_id, stop_id, direction_id, cb
    },

    getTimesByStopForAllRoutes: function (agency_key, stop_id, direction_id, cb) {
        //gets routes for one agency

        if (_.isFunction(direction_id)) {
            cb = direction_id;
            direction_id = null; //default is ~ 1/4 mile
        }

        var fields = {
            agency_key: agency_key,
            stop_id: stop_id
        };

        var service_ids = []
            , trip_ids = []
            , times = [];

        //Find service_id that matches todays date
        async.series([
            async.apply(checkFields, fields),
            async.apply(findServices, agency_key, service_ids),
            async.apply(findTrips, agency_key, null, direction_id, service_ids, trip_ids),
            async.apply(findTimeScheduleForStop, agency_key, stop_id, trip_ids, times, 0)
        ], function (e, results) {
            if (e) {
                debug(e, "getTimesByStopForAllRoutes - error");
                cb(e, null);
            } else {
                cb(e, times);
            }
        });
    },

    getAllLiveBusShapes: function (agency_key, stop_id, direction_id, cb) {
        //gets routes for one agency

        if (_.isFunction(direction_id)) {
            cb = direction_id;
            direction_id = null; //default is ~ 1/4 mile
        }

        var fields = {
            agency_key: agency_key,
            stop_id: stop_id
        };

        var service_ids = []
            , trip_ids = []
            , future_times = []
            , past_times = []
            , live_sequences = []
            , stop_ids = []
            , resolved_stops = []
            , distinct_sequences = [];

        //Find service_id that matches todays date
        async.series([
            async.apply(checkFields, fields),
            async.apply(findServices, agency_key, service_ids),
            async.apply(findTrips, agency_key, null, null, service_ids, trip_ids),
            async.apply(findTimeScheduleForStop, agency_key, stop_id, trip_ids, future_times, 1),
            async.apply(findDistinctSequences, distinct_sequences, future_times),
            async.apply(findTimeScheduleForStop, agency_key, stop_id, trip_ids, past_times, -1),
            async.apply(constructLiveSequences, past_times, distinct_sequences, stop_ids, live_sequences),
            async.apply(lookupStopIds, stop_ids, resolved_stops),
            async.apply(assignResolvedStopsToLiveSequence, resolved_stops, live_sequences),
            async.apply(calculatePositionForLiveSequence, live_sequences)

        ], function (e, results) {
            debug(results, "results");
            if (e) {
                debug(e, "getTimesByStopForAllRoutes - error");
                cb(e, null);
            } else {
                cb(e, live_sequences);
            }
        });
    }
};

function checkFields(fields, cb) {
    for (var field in fields) {
        if (fields.hasOwnProperty(field)) {
            if (fields[field] === null || typeof fields[field] === 'undefined') {
                debug('No ' + field + ' specified');
                cb(new Error('No ' + field + ' specified'), 'fields');
            }
        } else {
            debug("Unknown key specified");
            cb(new Error('Unknown key specified'), 'fields');
        }
    }
    cb(null, 'fields');
}

function findServices(agency_key, service_ids, cb) {
    var today = new Date();

    var query = {agency_key: agency_key}
        , todayFormatted = utils.formatDay(today);

    //build query
    query[utils.getDayName(today).toLowerCase()] = 1;

    Calendar
        .find(query)
        .where('start_date').lte(todayFormatted)
        .where('end_date').gte(todayFormatted)
        .exec(function (e, services) {
            if (e) {
                debug(e, "findServices - error");
                cb(e, null);
            } else {
                if (services.length) {
                    services.forEach(function (service) {
                        service_ids.push(service.service_id);
                    });
                    cb(null, 'service');
                } else {
                    debug("findServices - No Service for this date - error");
                    cb(new Error('No Service for this date'), 'service');
                }
            }
        });
}

function findTrips(agency_key, route_id, direction_id, service_ids, trip_ids, cb) {

    var query = {
        agency_key: agency_key
    };

    if (route_id !== null && typeof route_id !== 'undefined') {
        query.route_id = route_id;
    }

    if ((direction_id === 0) || (direction_id === 1)) {
        query.direction_id = direction_id;
    } else {
        query["$or"] = [{direction_id: 0}, {direction_id: 1}]
    }

    Trip
        .find(query)
        .where('service_id').in(service_ids)
        .exec(function (e, trips) {
            if (e) {
                debug(e, "findTrips - error");
                cb(e, null);
            } else {
                if (trips.length) {
                    trips.forEach(function (trip) {
                        trip_ids.push(trip.trip_id);
                    });
                    cb(null, 'trips')
                } else {
                    debug("findTrips - No trips for this date - error");
                    cb(new Error('No trips for this date'), 'trips');
                }
            }
        });
}

function getTrips(agency_key, route_id, direction_id, direction_ids, trip_ids, cb) {
    // TODO: merge with find Trips
    var tripQuery = {
        agency_key: agency_key
        , route_id: route_id
    };
    if (direction_id) {
        tripQuery.direction_id = direction_id;
    } // else match all direction_ids

    Trip
        .count(tripQuery, function (e, tripCount) {
            if (tripCount) {
                Trip
                    .find(tripQuery,
                    function (e, trips) {
                        if (e) {
                            debug(e, "findTrips - error");
                            cb(e, null);
                        } else {
                            _.each(trips, function (trip) {
                                if (!trip) return cb();
                                if (direction_ids.indexOf(trip.direction_id) < 0) direction_ids.push(trip.direction_id);
                                if (!trip_ids[trip.direction_id]) trip_ids[trip.direction_id] = [];
                                trip_ids[trip.direction_id].push(trip.trip_id);
                            });
                            cb(null, 'trips')
                        }
                    });
            } else {
                cb(new Error('Invalid agency_key or route_id'), 'trips');
            }
        });
}

function findTimeScheduleForStop(agency_key, stop_id, trip_ids, times, time_horizon, cb) {
    var today = new Date();
    //var timeInSeconds = utils.timeToSeconds(today);
    var timeInSeconds = utils.timeToSeconds(today) + timeCheat; // minus 12 hours

    var numOfTimes = 1000;
    var query = {
        agency_key: agency_key
        //, stop_id: stop_id
    };

    var seconds_before = 1200; // 20 * 60 seconds = 20 mins
    var seconds_after = 1200;

    if (typeof time_horizon !== 'undefined') {
        if (time_horizon < 0) {
            seconds_after = 0;
        } else if (time_horizon > 0) {
            seconds_before = 0;
        }
    }

    StopTime
        .find(query)
        .where('trip_id').in(trip_ids)
        .where('departure_time').gte(timeInSeconds - seconds_before)
        .where('departure_time').lte(timeInSeconds + seconds_after)
        .sort('departure_time') //asc has been removed in favor of sort as of mongoose 3.x
        .limit(numOfTimes)
        .exec(function (e, stopTimes) {
            if (e) {
                debug(e, "getStopTimes - error");
                cb(e, null);
            } else {
                //console.log(stopTimes, "stopTimes");
                if (stopTimes.length) {
                    //times = stopTimes;
                    //times.push(stopTimes);
                    stopTimes.forEach(function (stopTime) {
                        times.push({
                            stop_id: stopTime.stop_id,
                            time: stopTime.departure_time,
                            time_human: utils.secondsToTime(stopTime.departure_time),
                            sequence: stopTime.stop_sequence
                        });
                    });
                    cb(null, 'times');
                } else {
                    cb(new Error('No times available for this stop on this date'), 'times');
                }
            }
        });
}

function getStops(agency_key, direction_ids, stop_ids, stops, cb) {
    async.forEach(
        direction_ids,
        function (direction_id, cb) {
            if (!stop_ids[direction_id]) return cb();
            async.forEachSeries(
                stop_ids[direction_id],
                function (stop_id, cb) {
                    Stop.findOne()
                        .where({agency_key: agency_key, stop_id: stop_id})
                        .select('stop_id stop_name stop_lat stop_lon -_id')
                        .exec(function (e, stop) {
                            if (e) {
                                debug(e, "getStops - error");
                                cb(e, null);
                            } else {
                                if (!stops[direction_id]) stops[direction_id] = [];
                                if (stops[direction_id].indexOf(stop) === -1) {
                                    stops[direction_id].push(stop);
                                }
                                cb();
                            }
                        });
                }.bind(direction_id),
                function (e) {
                    cb(e);
                }
            );
        }, function (e) {
            if (e) {
                debug(e, "No stops found - error");
                cb(new Error('No stops found'), 'stops');
            } else {
                cb(null, 'stops');
            }
        });
}

function getStopTimes(agency_key, direction_ids, trip_ids, stop_ids, cb) {
    _.each(direction_ids,
        function (direction_id) {
            if (!trip_ids[direction_id]) return cb();
            if (!stop_ids[direction_id]) stop_ids[direction_id] = [];

            StopTime.find()
                //.sort('stop_sequence')
                .where({agency_key: agency_key, trip_id: {$in: trip_ids[direction_id]}})
                .distinct('stop_id')
                .exec(function (e, distinct_stop_ids) {
                    if (e) {
                        debug(e, "getStopTimes - error");
                        cb(e, null);
                    } else {
                        stop_ids[direction_id] = distinct_stop_ids;
                        return cb(null, 'times');
                    }
                })
        }
    );
}

function getStopsNearby(lon, lat, radiusInDegrees, stop_ids, cb) {
    Stop
        .where('loc')
        .near(lon, lat).maxDistance(radiusInDegrees)
        .exec(function (e, stops) {
            if (e) {
                debug(e, "getStopsNearby - error");
                cb(e, null);
            } else {
                if (stops.length) {
                    stops.forEach(function (stop) {
                        if (stop.stop_id) {
                            stop_ids.push(stop.stop_id);
                        }
                    });
                    cb(e, 'stops');
                } else {
                    cb(new Error('No stops within ' + radius + ' miles'), 'stops');
                }
            }
        });
}

function getRoutes(trip_ids, route_ids, cb) {
    Trip
        .distinct('route_id')
        .where('trip_id').in(trip_ids)
        .exec(function (e, results) {
            if (e) {
                debug(e, "getRoutes - error");
                cb(e, null);
            } else {
                if (results.length) {
                    route_ids = results;
                    cb(null, 'routes');
                } else {
                    cb(new Error('No routes to any stops within ' + radius + ' miles'), 'routes');
                }
            }
        });
}

function lookupRoutes(route_ids, routes, cb) {
    Route
        .where('route_id').in(route_ids)
        .exec(function (e, results) {
            if (e) {
                debug(e, "lookupRoutes - error");
                cb(e, null);
            } else {
                if (results.length) {
                    routes = results;
                    cb(null, 'lookup');
                } else {
                    cb(new Error('No information for routes'), 'lookup');
                }
            }
        });
}

function getShapeIds(agency_key, route_id, direction_id, shape_ids, cb) {
    var query = {
        agency_key: agency_key,
        route_id: route_id
    };

    if ((direction_id === 0) || (direction_id === 1)) {
        query.direction_id = direction_id;
    } else {
        query["$or"] = [{direction_id: 0}, {direction_id: 1}]
    }

    Trip
        .find(query)
        .distinct('shape_id', function (err, results) {
            if (err) {
                debug(err, "getShapeIds - error");
                cb(err, null);
            }
            if (results.length) {
                shape_ids = results;
                cb(null, 'shape_ids');
            } else {
                cb(new Error('No trips with shapes.'), 'trips')
            }
        });
}

function getShapes(agency_key, shape_ids, shapes, cb) {
    async.forEach(shape_ids, function (shape_id, cb) {
        Shape.find({
            agency_key: agency_key,
            shape_id: parseInt(shape_id, 10)
        }, function (err, shape_pts) {
            if (err) {
                debug(err, "getShapes - error");
                cb(err, null);
            }
            if (shape_pts.length) {
                shapes.push(shape_pts);
                cb(null, 'shape_pts');
            } else {
                debug(err, "getShapes - No shapes with shape_id.");
                cb(new Error('No shapes with shape_id.'), 'shape_pts')
            }
        });
    }, function (err) {
        if (err) {
            debug(err, "getShapes - error");
            cb(err, 'shapes');
        } else {
            cb(null, 'shapes');
        }
    })
}

function findDistinctSequences(distinct_sequences, times, cb) {
    distinct_sequences.push(times[0]);

    var slots_ahead = 7;
    var skip_sequence = 9;
    var tmp_sequence_diff;

    var loops = Math.min(slots_ahead, times.length - 1);

    for (var i = 1; i <= loops; i++) {
        var distinct_flag = true;
        for (var j in distinct_sequences) {
            if (distinct_sequences.hasOwnProperty(j)) {
                tmp_sequence_diff = Math.abs(times[i].sequence - distinct_sequences[j].sequence);
                if (tmp_sequence_diff < skip_sequence) {
                    distinct_flag = false;
                }
            }
        }
        if (distinct_flag) {
            distinct_sequences.push(times[i]);
        }
    }
    cb(null, 'find distinct_sequences');
}

function lookupStopIds(stop_ids, resolved_stops, cb) {
    Stop
        .find()
        .where('stop_id').in(stop_ids)
        .select('stop_id stop_lat stop_lon -_id')
        .exec(function (e, stops) {
            if (e) {
                debug(e, "getBusStopLatLon - error");
                cb(err, 'lookupStopIds');
            } else {
                resolved_stops.push(stops);
                cb(null, 'lookupStopIds');
            }
        });
}

function constructLiveSequences(past_times, distinct_sequences, stop_ids, live_sequences, cb) {
    var skip_sequence = 10;
    var tmp_sequence_diff;

    var nPast_times = past_times.length - 1;

    for (var j in distinct_sequences) {
        if (distinct_sequences.hasOwnProperty(j)) {
            live_sequences.push({});
            for (var i = nPast_times; i >= 0; i--) {
                tmp_sequence_diff = Math.abs(past_times[i].sequence - distinct_sequences[j].sequence);
                if (tmp_sequence_diff < skip_sequence) {
                    live_sequences[j]['next'] = distinct_sequences[j];
                    stop_ids.push(distinct_sequences[j].stop_id);
                    live_sequences[j]['previous'] = past_times[i];
                    stop_ids.push(past_times[i].stop_id);
                    break;
                }
            }
        }
    }
    cb(null, 'find live_sequences');
}

function assignResolvedStopsToLiveSequence(resolved_stops, live_sequences, cb) {
    if (live_sequences.length > 0 && resolved_stops.length > 0) {
        for (var j in live_sequences) {
            if (live_sequences.hasOwnProperty(j)) {
                for (var i in resolved_stops[0]) {
                    if (resolved_stops[0].hasOwnProperty(i)) {
                        if (resolved_stops[0][i].stop_id === live_sequences[j]['next'].stop_id) {
                            live_sequences[j]['next']['stop_lat'] = resolved_stops[0][i].stop_lat;
                            live_sequences[j]['next']['stop_lon'] = resolved_stops[0][i].stop_lon;

                        }
                        if (resolved_stops[0][i].stop_id === live_sequences[j]['previous'].stop_id) {
                            live_sequences[j]['previous']['stop_lat'] = resolved_stops[0][i].stop_lat;
                            live_sequences[j]['previous']['stop_lon'] = resolved_stops[0][i].stop_lon;

                        }
                    }
                }
            }
        }
    }
    cb(null, "assignResolvedStopsToLiveSequence");
}

function calculatePositionForLiveSequence(live_sequence, cb) {
    for (var i in live_sequence){
        if (live_sequence.hasOwnProperty(i)){
            var tGesamt = live_sequence[i]['next'].time - live_sequence[i]['previous'].time;
            //debug(live_sequence[i]['previous'].time, "live_sequence[i]['previous'].time");
            //debug(live_sequence[i]['next'].time, "live_sequence[i]['next'].time");
            //
            //debug(tGesamt, "tGesamt");

            var today = new Date();
            //var timeInSeconds = utils.timeToSeconds(today);
            var nowTimeInSeconds = utils.timeToSeconds(today) + timeCheat; // minus 12 hours
            //debug(nowTimeInSeconds, "nowTimeInSeconds");

            var fortschritt = (nowTimeInSeconds - live_sequence[i]['previous'].time) / tGesamt;
            // check for NAN an infinite
            //debug(fortschritt, "fortschritt");

            var vektor_lat = live_sequence[i]['next'].stop_lat - live_sequence[i]['previous'].stop_lat;
            var vektor_lon = live_sequence[i]['next'].stop_lon - live_sequence[i]['previous'].stop_lon;

            live_sequence[i]['lat'] = live_sequence[i]['previous'].stop_lat + fortschritt * vektor_lat;
            live_sequence[i]['lon'] = live_sequence[i]['previous'].stop_lon + fortschritt * vektor_lon;
        }
    }
    cb(null, "calculatePositionForLiveSequence");
}

function handleError(e) {
    console.error(e || 'Unknown Error');
    process.exit(1)
}
