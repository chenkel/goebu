"use strict";

var async = require("async"),
    mongoose = require("mongoose"),
    _ = require("underscore"),
    utils = require("./utils");

//var timeCheatSet = 59700;
//var timeCheat = timeCheatSet - utils.timeToSeconds(new Date());

var timeCheat = null,
    timeCheatSet = null;


if (typeof timeCheatSet !== 'undefined' && timeCheatSet !== null) {
    global.log.warn("[Time Cheat activated] Time is set to: ", timeCheatSet, " -->", utils.secondsToTime(timeCheatSet));
}

//var dayCheat = 'friday';
//var dateCheat = '20150327';
var dayCheat = null;
var dateCheat = null;

//function handleError(e) {
//    console.error(e || "Unknown Error");
//    process.exit(1);
//}

var db = mongoose.connect(global.config.mongo_url);

require("../models/Agency");
require("../models/Calendar");
require("../models/CalendarDate");
require("../models/FareAttribute");
require("../models/FareRule");
require("../models/FeedInfo");
require("../models/Frequencies");
require("../models/Route");
require("../models/Shape");
require("../models/Stop");
require("../models/StopTime");
require("../models/Transfer");
require("../models/Trip");

var Agency = db.model("Agency"),
    Route = db.model("Route"),
    Stop = db.model("Stop"),

    StopTime = db.model("StopTime"),
    Trip = db.model("Trip"),
    Calendar = db.model("Calendar"),
    CalendarDate = db.model("CalendarDate");

// TODO: checkFields deleted, fix that.

/**
 * errorResultCallback is a callback type and is displayed as a global symbol.
 *
 * @callback errorResultCallback - The callback that handles errors and responses.
 * @param {Object} error - If an error occurred pass the err object here.
 * @param {Object} result - Pass results back.
 */

/**
 * findServices adds all service_ids available today to goebu_params and executes the callback
 *
 * @param {Object} goebu_params - option parameters for findServices
 * optional:
 * @param {string} [goebu_params.agency_key]
 * @param {number[]} [goebu_params.service_ids]
 *
 * @return {number[]} [goebu_params.service_ids]
 *
 * @param {errorResultCallback} cb - callback
 */
function findServices(goebu_params, cb) {
    goebu_params = utils.checkAndInitiateMissingVars(goebu_params, ['service_ids']);

    var today = new Date();

    var calendar_query = {},
        calendar_date_query = {},
        todayFormatted = utils.formatDay(today),
        calendar_date_ids = [];


    if (dateCheat) {
        global.log.warn("Applying date cheat");
        global.log.info("Date: ", dateCheat);
        todayFormatted = dateCheat;
    }

    calendar_date_query.date = todayFormatted;
    calendar_date_query.exception_type = 1;

    //build calendar_query
    if (goebu_params.agency_key) {
        calendar_query.agency_key = goebu_params.agency_key;
        calendar_date_query.agency_key = goebu_params.agency_key;
    }

    if (typeof dayCheat !== 'undefined' && dayCheat !== null) {
        global.log.warn("Applying day cheat");
        global.log.info("Day of the week: ", dayCheat);
        calendar_query[dayCheat] = 1;
    } else {
        calendar_query[utils.getDayName(today).toLowerCase()] = 1;
    }

    async.series([
        function (callback) {
            Calendar
                .find(calendar_query)
                .where("start_date").lte(todayFormatted)
                .where("end_date").gte(todayFormatted)
                .exec(function (e, services) {
                    if (e) {
                        global.log.error(e.message);
                        return callback(e, null);
                    } else {
                        if (services.length > 0) {
                            for (var i = 0, len = services.length; i < len; i++) {
                                goebu_params.service_ids.push(services[i].service_id);
                            }
                            return callback(null, goebu_params);
                        } else {
                            // TODO: decide if Error or normal response is fine
                            global.log.error("No Service for this date");
                            return callback(new Error("No Service for this date"), goebu_params);
                        }
                    }
                });
        },
        function (callback) {
            CalendarDate
                .find(calendar_date_query)
                .exec(function (e, service_dates) {
                    if (e) {
                        global.log.error(e.message);
                        return callback(e, null);
                    } else {
                        if (service_dates.length > 0) {
                            for (var i = 0, len = service_dates.length; i < len; i++) {
                                calendar_date_ids.push(service_dates[i].service_id);
                                //goebu_params.service_ids.push(service_dates[i].service_id);
                            }
                            return callback(null, goebu_params);
                        } else {
                            // TODO: decide if Error or normal response is fine
                            global.log.error("No Service for this date");
                            return callback(new Error("No Service for this date"), goebu_params);
                        }
                    }
                });
        }
    ], function (e, service_ids) {
        if (e) {
            global.log.error(e.message);
            global.log.warn("service_ids", service_ids);
            return cb(e, null);
        } else {
            if (calendar_date_ids.length > 0) {
                goebu_params.service_ids = calendar_date_ids;
            }

            return cb(null, goebu_params);
        }
    });

}

/**
 * findTripsWithServiceRouteDirection adds all trip_ids that match the given goebu_params object.
 *
 * @param {Object} goebu_params - goebu_params holds all of the data.
 * optional:
 * @param {string} [goebu_params.agency_key]
 * @param {number[]} [goebu_params.service_ids] - Array of Service Ids
 * @param {number} [goebu_params.route_id] - Route Id to filter Trips
 * @param {number} [goebu_params.direction_id] - Direction Id
 * @param {number[]} goebu_params.trip_ids - Trip Ids filtered by goebu_params
 *
 * @return {number[]} goebu_params.trip_ids - Trip Ids filtered by goebu_params
 *
 * @param {errorResultCallback} cb - callback
 */
function findTripsWithServiceRouteDirection(goebu_params, cb) {

    var tripQuery = {};
    //build query
    if (goebu_params.agency_key) {
        tripQuery.agency_key = goebu_params.agency_key;
    }
    if (goebu_params.route_id) {
        tripQuery.route_id = goebu_params.route_id;
    }
    if ((goebu_params.direction_id === 1) || (goebu_params.direction_id === 2)) {
        // TODO: add a new direction_id key to goebu_params.trip_ids
        tripQuery.direction_id = goebu_params.direction_id;
    } else {
        tripQuery.$or = [{direction_id: 1}, {direction_id: 2}];
    }

    var query = Trip.find(tripQuery);

    if (goebu_params.service_ids) {
        query = query.where("service_id").in(goebu_params.service_ids);
    }

    query.exec(function (e, trips) {

        if (e) {
            global.log.error(e.message);
            return cb(e, null);
        } else {
            goebu_params = utils.checkAndInitiateMissingVars(goebu_params, ['trip_ids']);
            for (var i = 0, len = trips.length; i < len; i++) {
                if (typeof trips[i].trip_id !== 'undefined' && trips[i].trip_id !== null) {
                    if (!goebu_params.trip_ids[trips[i].direction_id]) {
                        goebu_params.trip_ids[trips[i].direction_id] = [];
                    }
                    goebu_params.trip_ids[trips[i].direction_id].push(trips[i].trip_id);
                }
            }
            return cb(null, goebu_params);
        }
    });
}

/**
 * findStopTimesForStopWithTripsTimeHorizon returns stop times for a defined stop_id.
 *
 * required:
 * @param {Object} goebu_params
 * optional:
 * @param {number} [goebu_params.stop_id]
 * @param {string} [goebu_params.agency_key]
 * @param {number} [goebu_params.time_horizon] - If <0: past, =0: everything, >0 future
 *
 * @param {string[]} [goebu_params.past_times]
 * @param {string[]} [goebu_params.times]
 * @param {string[]} [goebu_params.future_times]
 *
 * @return {string[]} [goebu_params.past_times]
 * @return {string[]} [goebu_params.times]
 * @return {string[]} [goebu_params.future_times]
 *
 * @param {errorResultCallback} cb - callback
 */
function findStopTimesForStopWithTripsTimeHorizon(goebu_params, cb) {
    var timeInSeconds = utils.timeToSeconds(new Date()),
        stopTimeQuery = {},
        seconds_before = 0,
        seconds_after = 864000;

    if (typeof timeCheat !== 'undefined' && timeCheat !== null) {
        timeInSeconds = timeInSeconds + timeCheat;
    }



    goebu_params.now = utils.secondsToTime(timeInSeconds);

    if (goebu_params.stop_id && goebu_params.stop_id > 0) {
        stopTimeQuery.stop_id = String(goebu_params.stop_id);
    }

    if (goebu_params.agency_key) {
        stopTimeQuery.agency_key = goebu_params.agency_key;
    }

    var times_key = "times";
    if (goebu_params.time_horizon) {
        if (goebu_params.time_horizon < 0) {
            seconds_before = 1800;
            seconds_after = 0;
            times_key = "past_times";
        } else if (goebu_params.time_horizon > 0) {
            seconds_before = 0;
            seconds_after = 1800;
            times_key = "future_times";
        }
    }

    var query = StopTime.find(stopTimeQuery)
        .select("stop_id departure_time stop_sequence -_id")
        .where("departure_time").gte(timeInSeconds - seconds_before)
        .where("departure_time").lte(timeInSeconds + seconds_after)
        .sort("departure_time") //asc has been removed in favor of sort as of mongoose 3.x
        .limit(1000);

    for (var i = 0, len = goebu_params.trip_ids.length; i < len; i++) {
        if (typeof goebu_params.trip_ids[i] !== 'undefined' &&
            goebu_params.trip_ids[i] !== null &&
            goebu_params.trip_ids[i].length > 0) {

            query = query.where("trip_id").in(goebu_params.trip_ids[i]);
        }

    }
    query.exec(function (e, stopTimes) {
        if (e) {
            global.log.error(e.message);
            return cb(e, null);
        } else {
            var len = stopTimes.length;
            if (len > 0) {
                goebu_params[times_key] = [];
            } else {
                global.log.warn("No StopTime found. time_key=" + times_key);
            }
            for (var i = 0; i < len; i++) {
                goebu_params[times_key].push({
                    stop_id: stopTimes[i].stop_id,
                    time: stopTimes[i].departure_time,
                    time_human: utils.secondsToTime(stopTimes[i].departure_time),
                    sequence: stopTimes[i].stop_sequence
                });
            }
            //global.log.info("goebu_params[times_key]", goebu_params[times_key]);
            //TODO: direction_id is missing
            return cb(null, goebu_params);
        }
    });

}

/**
 * getStopsByStopIds returns stops for specified stop_ids.
 *
 * required:
 * @param {Object} goebu_params
 * @param {number[]} goebu_params.stop_ids
 * optional:
 * @param {string} [goebu_params.agency_key]
 * @param {number[]} [goebu_params.direction_ids]
 * @param {Object[]} [goebu_params.stops]
 *
 * @return {Object[]} [goebu_params.stops]
 *
 * @param {errorResultCallback} cb - callback
 */
function getStopsByStopIds(goebu_params, cb) {
    // TODO: decide whether stop_ids should be saved with different direction_ids or without it at all!
    if (!goebu_params.stop_ids || goebu_params.stop_ids.length === 0) {
        return cb(new Error("goebu_params.stop_ids is undefined or empty."), goebu_params);
    }

    var stop_query = {};
    if (!goebu_params.direction_ids) {
        global.log.warn("No direction_ids in getStopsByStopIds!");
        goebu_params.direction_ids = [1, 2];
    }

    if (goebu_params.agency_key) {
        stop_query.agency_key = goebu_params.agency_key;
    }

    async.forEach(
        goebu_params.direction_ids,
        function (direction_id, callback) {
            if (!goebu_params.stop_ids[direction_id]) {
                return callback(new Error("No stop_ids for direction_id " + direction_id +
                "in getStopsByStopIds"), goebu_params);
            }
            goebu_params = utils.checkAndInitiateMissingVars(goebu_params, ['stops'],
                'object');

            // TODO: check if stop_ids[direction_id] is empty
            //      if so choose to iterate over stop_ids only
            //var results = [];
            //if (direction_id) {
            //    results = stops[direction_id] || [];
            //} else {
            //    _.each(stops, function (stop, direction_id) {
            //        results.push({direction_id: direction_id, stops: stop || []});
            //    });
            //}
            async.forEachSeries(
                goebu_params.stop_ids[direction_id],
                function (stop_id, cb) {
                    stop_query.stop_id = stop_id;
                    Stop.findOne(stop_query)
                        .select("stop_id stop_name stop_desc stop_lat stop_lon -_id")
                        .exec(function (e, stop) {
                            if (e) {
                                global.log.error(e.message);
                                return cb(e, null);
                            } else {

                                if (!goebu_params.stops[direction_id]) {
                                    goebu_params.stops[direction_id] = [];
                                }

                                if (goebu_params.stops[direction_id].indexOf(stop) === -1) {
                                    goebu_params.stops[direction_id].push(stop);
                                }
                                return cb();
                            }
                        });
                }.bind(direction_id),
                function (e) {
                    callback(e);
                }
            );
        }, function (e) {
            if (e) {
                global.log.error(e.message);
                return cb(new Error("No stops found"), goebu_params);
            } else {
                return cb(null, goebu_params);
            }
        });
}

/**
 * getStopIdsByTripIds returns stop times for specified trip_ids.
 *
 * required:
 * @param {Object} goebu_params
 * @param {number[]} goebu_params.trip_ids
 * optional:
 * @param {number[]} [goebu_params.direction_ids]
 * @param {string} [goebu_params.agency_key]
 * @param {Object[]} [goebu_params.stop_ids]
 *
 * @return {Object[]} [goebu_params.stops]
 *
 * @param {errorResultCallback} cb - callback
 */
function getStopIdsByTripIds(goebu_params, cb) {
    if (!goebu_params.trip_ids || goebu_params.trip_ids.length === 0) {
        return cb(new Error("goebu_params.trip_ids is undefined or empty."), goebu_params);
    }

    goebu_params = utils.checkAndInitiateMissingVars(goebu_params, ['stops', 'stop_ids'], "object");
    if (goebu_params.direction_id) {
        goebu_params.direction_ids = [goebu_params.direction_id];
    }
    if (!goebu_params.direction_ids) {
        goebu_params.direction_ids = [1, 2];
    }

    var stop_time_query = {};
    if (goebu_params.agency_key) {
        stop_time_query.agency_key = goebu_params.agency_key;
    }

    async.forEach(
        goebu_params.direction_ids,
        function (direction_id, callback) {
            if (!goebu_params.trip_ids[direction_id]) {
                global.log.error("No trip_ids for direction_id " +
                direction_id + " in getStopIdsByTripIds");
                return cb(new Error("No trip_ids for direction_id " +
                direction_id + " in getStopIdsByTripIds"), goebu_params);
            }
            if (!goebu_params.stops[direction_id]) {
                goebu_params.stops[direction_id] = [];
            }
            if (!goebu_params.stop_ids[direction_id]) {
                goebu_params.stop_ids[direction_id] = [];
            }

            StopTime.find(stop_time_query)
                .where({
                    trip_id: {
                        $in: goebu_params.trip_ids[direction_id]
                    }
                })
                .distinct("stop_id")
                .exec(function (e, distinct_stop_ids) {
                    if (e) {
                        global.log.error(e, goebu_params);
                        callback(e, null);
                    } else {
                        goebu_params.stop_ids[direction_id] = distinct_stop_ids;

                        return callback(null, goebu_params);
                    }
                });

        }, function (e) {
            if (e) {
                global.log.error(e.message);
                return cb(new Error("No stops found"), goebu_params);
            } else {
                return cb(null, goebu_params);
            }
        }
    );
}

///**
// * isDistinctSequencePart checks if sequences are distinct.
// *
// * required:
// * @param {Object} past
// * @param {Object} future
// * @param direction_id
// *
// * @return {Boolean} Is space between first and second big enough
// */
//function isDistinctSequencePart(past, future, direction_id) {
//    if (typeof past === 'undefined' || past === null) {
//        return false;
//    }
//    if (typeof future === 'undefined' || future === null) {
//        return false;
//    }
//
//    if (direction_id > 0) {
//        if (past.sequence > future.sequence) {
//            return false;
//        }
//    } else {
//        if (past.sequence < future.sequence) {
//            return false;
//        }
//    }
//
//    var sequence_gap_limit = 10;
//    var sequence_diff = Math.abs(past.sequence - future.sequence);
//    if (direction_id <= 0) {
//        sequence_diff = sequence_diff - 1 + 1;
//    }
//
//    return sequence_diff >= sequence_gap_limit;
//}

/**
 * findDistinctSequencesForTimes returns stop times for specified trip_ids.
 *
 * required:
 * @param {Object} goebu_params
 * @param {number[]} goebu_params.future_times
 * optional:
 * @param {Object[]} [goebu_params.distinct_sequences]
 *
 * @return {Object[]} [goebu_params.distinct_sequences]
 *
 * @param {errorResultCallback} cb - callback
 */
function findDistinctSequencesForTimes(goebu_params, cb) {
    if (!goebu_params.future_times || goebu_params.future_times.length === 0) {
        return cb(new Error("goebu_params.future_times is undefined or empty."), goebu_params);
    }
    if (!goebu_params.direction_id || goebu_params.direction_id.length === 0) {
        return cb(new Error("goebu_params.direction_id is undefined or empty."), goebu_params);
    }

    goebu_params = utils.checkAndInitiateMissingVars(goebu_params, ['distinct_sequences']);

    if (typeof goebu_params.future_times[0] === 'undefined') {
        return cb(new Error("future_times required - gtfs.findDistinctSequencesForTimes"), goebu_params);
    }
    goebu_params.distinct_sequences.push(goebu_params.future_times[0]);

    // TODO: check with other parameters from the specific method
    var slots_ahead = 6;
    var sequence_gap_limit = 7;

    var loops = Math.min(slots_ahead, goebu_params.future_times.length - 1);

    for (var i = 1; i <= loops; i++) {
        var distinct_flag = true;
        for (var j = 0, len = goebu_params.distinct_sequences.length; j < len; j++) {

            var sequence_diff = Math.abs(
                goebu_params.future_times[i].sequence - goebu_params.distinct_sequences[j].sequence
            );
            if ((sequence_diff < sequence_gap_limit)) {

                distinct_flag = false;
            }

        }
        if (distinct_flag) {
            goebu_params.distinct_sequences.push(goebu_params.future_times[i]);
        }
    }
    if ((goebu_params.distinct_sequences.length <= 0)) {
        global.log.warn("no distinct sequences found in findDistinctSequencesForTimes");
    }

    return cb(null, goebu_params);
}

/**
 * constructLiveSequences returns next and previous stops of live_sequences from past times and distinct sequences.
 *
 * required:
 * @param {Object} goebu_params
 * @param {number[]} goebu_params.past_times
 * @param {Object[]} goebu_params.distinct_sequences
 * optional:
 * @param {Object[]} [goebu_params.live_sequences]
 * @param {number[]} [goebu_params.live_sequences_stop_ids]
 *
 * @return {Object[]} [goebu_params.distinct_sequences]
 * @return {number[]} [goebu_params.live_sequences_stop_ids]
 *
 * @param {errorResultCallback} cb - callback
 */
function constructLiveSequences(goebu_params, cb) {
    if (!goebu_params.past_times || goebu_params.past_times.length === 0) {
        return cb(new Error("goebu_params.past_times is undefined or empty."), goebu_params);
    } else if (!goebu_params.distinct_sequences || goebu_params.distinct_sequences.length === 0) {
        return cb(new Error("goebu_params.distinct_sequences is undefined or empty."), goebu_params);
    } else if (!goebu_params.direction_id || goebu_params.direction_id.length === 0) {
        return cb(new Error("goebu_params.direction_id is undefined or empty."), goebu_params);
    }

    goebu_params = utils.checkAndInitiateMissingVars(goebu_params, ['live_sequences', 'live_sequences_stop_ids']);

    if (goebu_params.distinct_sequences.length === 1) {
        if (goebu_params.distinct_sequences[0].sequence === 0) {
            goebu_params.live_sequences.push({
                "next": goebu_params.distinct_sequences[0],
                "previous": goebu_params.distinct_sequences[0]
            });
            goebu_params.live_sequences_stop_ids.push(goebu_params.distinct_sequences[0].stop_id);
            return cb(null, goebu_params);
        }
    }
    for (var i = 0, len = goebu_params.distinct_sequences.length; i < len; i++) {
        var past_time_found = false;

        var nPast_times = goebu_params.past_times.length - 1;
        for (var j = nPast_times; j >= 0; j--) {
            if (past_time_found) {
                break;
            }
            var sequence_diff = Math.abs(goebu_params.past_times[j].sequence -
            goebu_params.distinct_sequences[i].sequence);
            if (sequence_diff <= 3) {
                if (goebu_params.direction_id === 1) {
                    if (goebu_params.past_times[j].sequence < goebu_params.distinct_sequences[i].sequence) {
                        goebu_params.live_sequences.push({
                            "next": goebu_params.distinct_sequences[i],
                            "previous": goebu_params.past_times[j]
                        });
                        goebu_params.live_sequences_stop_ids.push(goebu_params.distinct_sequences[i].stop_id);
                        goebu_params.live_sequences_stop_ids.push(goebu_params.past_times[j].stop_id);
                        past_time_found = true;
                    }
                } else if (goebu_params.direction_id === 2) {
                    if (goebu_params.past_times[j].sequence > goebu_params.distinct_sequences[i].sequence) {
                        goebu_params.live_sequences.push({
                            "next": goebu_params.distinct_sequences[i],
                            "previous": goebu_params.past_times[j]
                        });
                        goebu_params.live_sequences_stop_ids.push(goebu_params.distinct_sequences[i].stop_id);
                        goebu_params.live_sequences_stop_ids.push(goebu_params.past_times[j].stop_id);
                        past_time_found = true;
                    }
                } else {
                    global.log.error("Unknown direction_id:" + goebu_params.direction_id);
                }
            }
        }

    }

    return cb(null, goebu_params);
}

/**
 * lookupStopIds returns array of stops for specified live_sequences_stop_ids.
 *
 * required:
 * @param {Object} goebu_params
 * @param {number[]} goebu_params.live_sequences_stop_ids
 * optional:
 * @param {Object[]} [goebu_params.resolved_stops]
 *
 * @return {Object[]} [goebu_params.resolved_stops]
 *
 * @param {errorResultCallback} cb - callback
 */
function lookupStopIds(goebu_params, cb) {
    if (!goebu_params.live_sequences_stop_ids || goebu_params.live_sequences_stop_ids.length === 0) {
        return cb(new Error("goebu_params.live_sequences_stop_ids is undefined or empty."), goebu_params);
    }
    goebu_params = utils.checkAndInitiateMissingVars(goebu_params, ['resolved_stops'], "object");

    Stop
        .find()
        .where("stop_id").in(goebu_params.live_sequences_stop_ids)
        .select("stop_id stop_lat stop_lon -_id")
        .exec(function (e, stops) {
            if (e) {
                global.log.error(e.message);
                return cb(e, goebu_params);
            } else {
                goebu_params.resolved_stops = stops;
                return cb(null, goebu_params);
            }
        });

}

/**
 * assignResolvedStopsToLiveSequence retrieves lat/lon of stops for specified live_sequences and resolved_stops.
 *
 * required:
 * @param {Object} goebu_params
 * @param {number[]} goebu_params.resolved_stops
 * @param {number[]} goebu_params.live_sequences
 *
 * @return {Object[]} [goebu_params.live_sequences]
 *
 * @param {errorResultCallback} cb - callback
 */
function assignResolvedStopsToLiveSequence(goebu_params, cb) {
    if (!goebu_params.resolved_stops || goebu_params.resolved_stops.length === 0) {
        return cb(new Error("goebu_params.resolved_stops is undefined or empty."), goebu_params);
    }
    if (!goebu_params.live_sequences || goebu_params.live_sequences.length === 0) {
        return cb(new Error("goebu_params.live_sequences is undefined or empty."), goebu_params);
    }
    for (var i = 0, len = goebu_params.live_sequences.length; i < len; i++) {
        // TODO: fix the ugly resolved_stops[0] thingy
        for (var j = 0, len2 = goebu_params.resolved_stops.length; j < len2; j++) {
            if (goebu_params.resolved_stops[j].stop_id === goebu_params.live_sequences[i].next.stop_id) {
                goebu_params.live_sequences[i].next.stop_lat = goebu_params.resolved_stops[j].stop_lat;
                goebu_params.live_sequences[i].next.stop_lon = goebu_params.resolved_stops[j].stop_lon;
            }
            if (goebu_params.resolved_stops[j].stop_id === goebu_params.live_sequences[i].previous.stop_id) {
                goebu_params.live_sequences[i].previous.stop_lat = goebu_params.resolved_stops[j].stop_lat;
                goebu_params.live_sequences[i].previous.stop_lon = goebu_params.resolved_stops[j].stop_lon;
            }
        }
    }
    return cb(null, goebu_params);
}

/**
 * calculatePositionForLiveSequence interpolates live bus positions with live_sequences.
 *
 * required:
 * @param {Object} goebu_params
 * @param {number[]} goebu_params.live_sequences
 *
 * @return {Object[]} [goebu_params.live_sequences]
 *
 * @param {errorResultCallback} cb - callback
 */
function calculatePositionForLiveSequence(goebu_params, cb) {

    for (var i = 0, len = goebu_params.live_sequences.length; i < len; i++) {
        var time_total = goebu_params.live_sequences[i].next.time - goebu_params.live_sequences[i].previous.time;
        if (time_total === 0) {
            time_total = 0.0000001;
        }

        var today = new Date();
        var nowTimeInSeconds = utils.timeToSeconds(today); // minus 12 hours
        if (typeof timeCheat !== 'undefined' && timeCheat !== null) {
            nowTimeInSeconds =  nowTimeInSeconds + timeCheat;
        }
        var progress = (nowTimeInSeconds - goebu_params.live_sequences[i].previous.time) / time_total;

        var vec_lat = goebu_params.live_sequences[i].next.stop_lat - goebu_params.live_sequences[i].previous.stop_lat;
        var vec_lon = goebu_params.live_sequences[i].next.stop_lon - goebu_params.live_sequences[i].previous.stop_lon;

        goebu_params.live_sequences[i].lat = goebu_params.live_sequences[i].previous.stop_lat + progress * vec_lat;
        goebu_params.live_sequences[i].lon = goebu_params.live_sequences[i].previous.stop_lon + progress * vec_lon;
    }
    return cb(null, goebu_params);
}

module.exports = {
    /**
     * agencies gets gets a list of all agencies
     * @param cb
     */
    agencies: function (cb) {
        Agency.find({}, cb);
    },

    /**
     * getRoutesByAgency gets routes for one agency
     * @param agency_key
     * @param cb
     */
    getRoutesByAgency: function (agency_key, cb) {

        Route.find({agency_key: agency_key}, cb);
    },

    /**
     * getAgenciesByDistance gets all agencies within a radius.
     * @param lat
     * @param lon
     * @param radius
     * @param cb
     */
    getAgenciesByDistance: function (lat, lon, radius, cb) {
        lat = parseFloat(lat);
        lon = parseFloat(lon);

        var radiusInDegrees = Math.round(radius / 69 * 100000) / 100000;

        Agency
            .where("agency_center")
            .near(lon, lat).maxDistance(radiusInDegrees)
            .exec(cb);
    },

    getStopsByDistance: function (lat, lon, radius, cb) {
        //gets all stops within a radius

        if (_.isFunction(radius)) {
            cb = radius;
            radius = 1; //default is 1 mile
        }

        var results = [],
            radiusInDegrees = Math.round(radius / 69 * 100000) / 100000;

        lat = parseFloat(lat);
        lon = parseFloat(lon);

        Stop
            .where("loc")
            .near(lon, lat).maxDistance(radiusInDegrees)
            .select("stop_id stop_name stop_desc stop_lat stop_lon -_id")
            .exec(function (e, stops) {
                if (e) {
                    global.log.debug(e, "getStopsByDistance - error");
                    cb(e, null);
                } else {
                    results = {stops: stops || []};
                    cb(e, results);
                }
            });
    },

    /**
     * getStopsByRoute gets stops for one route
     * @param agency_key
     * @param route_id
     * @param direction_id
     * @param cb
     */
    getStopsByRoute: function (agency_key, route_id, direction_id, cb) {

        var goebu_params = {
            agency_key: String(agency_key),
            route_id: Number(route_id),
            direction_id: Number(direction_id)
        };

        async.waterfall([
                async.apply(findServices, goebu_params),
                findTripsWithServiceRouteDirection,
                getStopIdsByTripIds,
                getStopsByStopIds,
                function (results, cb) {
                    var tmpResults = results;
                    results = {};
                    results.stops = tmpResults.stops;
                    cb(null, results);
                }
            ],
            utils.returnResults(cb));
    },

    /**
     * getTimesByStop gets stop times with optional filters.
     *
     * optional:
     * @param [agency_key]
     * @param [route_id]
     * @param [stop_id]
     * @param [direction_id]
     *
     * @return {string[]} [goebu_params.times]
     *
     * @param {errorResultCallback} cb - callback
     */
    getTimesByStop: function (agency_key, route_id, stop_id, direction_id, cb) {
        var goebu_params = {
            time_horizon: 0,
            agency_key: String(agency_key),
            route_id: Number(route_id),
            stop_id: Number(stop_id),
            direction_id: Number(direction_id)
        };

        async.waterfall([
                async.apply(findServices, goebu_params),
                findTripsWithServiceRouteDirection,
                findStopTimesForStopWithTripsTimeHorizon,
                function (results, cb) {
                    //var tmpResults = results;
                    //results = {};
                    //results.times = tmpResults.times;
                    cb(null, results);
                }
            ],
            utils.returnResults(cb));

    },

    /**
     * getAllLiveBusShapes interpolates live bus positions.
     *
     * optional:
     * @param [agency_key]
     * @param [stop_id]
     * @param [direction_id]
     *
     * @return {Object[]} [goebu_params.live_sequences]
     *
     * @param {errorResultCallback} cb - callback
     */
    getAllLiveBusShapes: function (agency_key, route_id, direction_id, stop_id, cb) {
        var goebu_params = {
            agency_key: String(agency_key),
            route_id: Number(route_id),
            direction_id: Number(direction_id)
        };

        async.waterfall([
                async.apply(findServices, goebu_params),
                findTripsWithServiceRouteDirection,
                function (goebu_params, cb) {
                    goebu_params.time_horizon = 1;
                    return cb(null, goebu_params);
                },
                findStopTimesForStopWithTripsTimeHorizon,
                findDistinctSequencesForTimes,
                function (goebu_params, cb) {
                    goebu_params.time_horizon = -1;
                    return cb(null, goebu_params);
                },
                findStopTimesForStopWithTripsTimeHorizon,
                constructLiveSequences,
                lookupStopIds,
                assignResolvedStopsToLiveSequence,
                calculatePositionForLiveSequence,
                function (results, cb) {
                    //var tmpResults = results;
                    //results = {};
                    //results.live_sequences = tmpResults.live_sequences;
                    cb(null, results);
                }
            ],
            utils.returnResults(cb));
    }
};