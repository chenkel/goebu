"use strict";

var async = require("async"),
    mongoose = require("mongoose"),
    moment = require("moment"),
    fixtures = require("../lib/fixtures"),
    utils = require("./utils");

//var timeCheatSet = 21600,
// timeCheat = timeCheatSet - utils.timeToSeconds(new Date());
//
var timeCheat = null,
    timeCheatSet = null;

if (typeof timeCheatSet !== 'undefined' && timeCheatSet !== null) {
    global.log.warn("[Time Cheat activated] Time is set to: ", timeCheatSet, " -->", utils.secondsToTime(timeCheatSet));
}

//var dayCheat = 'friday';
//var dateCheat = '20150327';
var dayCheat = null;
var dateCheat = null;

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

var Stop = db.model("Stop"),
    Route = db.model("Route"),
    StopTime = db.model("StopTime"),
    Trip = db.model("Trip"),
    Calendar = db.model("Calendar"),
    CalendarDate = db.model("CalendarDate");

///**
//* findServices gets routes for one agency
//* @param goebu_params
//* @param {errorResultCallback} cb - callback
//*/
function findServices(goebu_params, cb) {
    goebu_params = utils.checkAndInitiateMissingVars(goebu_params, ['service_ids']);

    var today = new Date();
    if (goebu_params.date) {
        today = goebu_params.date;
        console.log(today, "<-- today");

    }

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
                            // Thursday and Friday have two identical services with different ids.
                            // Just choose the first one.
                            goebu_params.service_ids.push(services[0].service_id);

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

                        }
                        return callback(null, goebu_params);

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
                goebu_params.service_ids = goebu_params.service_ids.concat(calendar_date_ids);
            }
            global.log.debug("goebu_params.service_ids", goebu_params.service_ids);

            return cb(null, goebu_params);
        }
    });

}

///**
//* getServicesByAgency gets routes for one agency
//* @param agency_key
//* @param cb
//*/
function getServicesByAgency(goebu_params, cb) {
    Calendar.aggregate({
        $match: {
            agency_key: goebu_params.agency_key
        }
    }, {
        $project: {
            _id: 0,
            service_id: 1
        }
    }, {
        $sort: {"service_id": 1}
    }, function onServiceFoundAggregate(err, foundService) {
        if (err) {
            return cb(err, null);
        } else {
            var service_ids = [];
            for (var i = 0, len = foundService.length; i < len; i++) {
                service_ids.push(foundService[i].service_id);
            }
            goebu_params.service_ids = service_ids;
            cb(null, goebu_params);
        }
    });
}

///**
//* getRoutesByAgency gets routes for one agency
//* @param agency_key
//* @param cb
//*/
function getStopsByAgency(goebu_params, cb) {
    Stop.aggregate({
        $match: {
            agency_key: goebu_params.agency_key
        }
    }, {
        $project: {
            _id: 0,
            stop_id: 1,
            stop_lat: 1,
            stop_lon: 1
        }
    }, function onStopFoundAggregate(err, foundStops) {
        if (err) {
            return cb(err, null);
        } else {
            goebu_params.stops = foundStops;
            cb(null, goebu_params);
        }
    });
}

///**
//* getRoutesByAgency gets routes for one agency
//* @param agency_key
//* @param cb
//*/
function getRoutesByAgency(goebu_params, cb) {
    Route.aggregate({
        $match: {
            agency_key: goebu_params.agency_key
        }
    }, {
        $project: {
            _id: 0,
            route_id: 1
        }
    }, {
        $sort: {"route_id": 1}
    }, function onRouteFoundAggregate(err, foundRoutes) {
        if (err) {
            return cb(err, null);
        } else {
            var routes = [];
            var route_ids = [];
            for (var i = 0, len = foundRoutes.length; i < len; i++) {
                routes.push({
                    route_id: foundRoutes[i].route_id
                });
                route_ids.push(foundRoutes[i].route_id);
            }
            goebu_params.routes = routes;
            console.log(route_ids, "<-- route_ids");
            cb(null, goebu_params);
        }
    });
}

function findStopsWithStopDescInRoutes(goebu_params, cb) {
    async.each(goebu_params.routes, function (route, callback) {

            function getStopIdsWithStopName(arrivalOrDeparture, parallelCallback) {

                if (route[arrivalOrDeparture].stop_name === 'Bahnhof/ZOB') {
                    route[arrivalOrDeparture].stop_ids = ['9101', '9104'];
                    parallelCallback(null, route[arrivalOrDeparture].stop_ids);
                } else if (route[arrivalOrDeparture].stop_name === 'Hiroshimaplatz/Neues Rathaus') {
                    route[arrivalOrDeparture].stop_ids = ['6171', '6172', '6012'];
                    parallelCallback(null, route[arrivalOrDeparture].stop_ids);
                } else if (route[arrivalOrDeparture].stop_name === 'Goldschmidtstraße') {
                    route[arrivalOrDeparture].stop_ids = ['3371', '3372', '3374'];
                    parallelCallback(null, route[arrivalOrDeparture].stop_ids);
                } else if (route[arrivalOrDeparture].stop_name === 'Asklepios Fachklinik') {
                    route[arrivalOrDeparture].stop_ids = ['6331', '6332'];
                    parallelCallback(null, route[arrivalOrDeparture].stop_ids);
                } else {
                    Stop.aggregate({
                        $match: {
                            stop_desc: route[arrivalOrDeparture].stop_name
                        }
                    }, {
                        $project: {
                            _id: 0,
                            stop_id: 1
                        }
                    }, function onStopFoundAggregate(err, stops) {
                        if (err) {
                            return parallelCallback(err, null);
                        } else {
                            var stop_ids = [];
                            for (var i = 0, len = stops.length; i < len; i++) {
                                stop_ids.push(stops[i].stop_id);
                            }
                            route[arrivalOrDeparture].stop_ids = stop_ids;
                            parallelCallback(null, stops);
                        }
                    });
                }
            }

            async.parallel({
                arrival: getStopIdsWithStopName.bind(null, 'stop_arrival'),
                departure: getStopIdsWithStopName.bind(null, 'stop_departure')
            }, function (err, results) {
                if (err) {
                    global.log.error("Error at findStopsWithStopDescInRoutes - async.parallel", err);
                    callback(err);
                } else {
                    if (results.arrival.length < 1 ) {
                        global.log.error(route.stop_arrival.stop_name, " - arrival information not found!!", results);

                    }
                    if (results.departure.length < 1){
                        global.log.error(route.stop_departure.stop_name, " - departure information not found!!", results);
                    }

                    callback();
                }
            });
        }, function (err) {
            if (err) {
                global.log.error("Error at findStopsWithStopDescInRoutes - async.each", err);
                cb(err, null);
            } else {
                global.log.trace("All routes have been successfully processed.");
                global.log.debug("goebu_params", JSON.stringify(goebu_params));
                cb(null, goebu_params);
            }
        }
    );
}

/**
 * attachTripsWithServiceIdsToRoutes adds all trip_ids that match the given goebu_params object.
 *
 * @param {Object} goebu_params - goebu_params holds all of the data.
 * optional:
 * @param {string} [goebu_params.agency_key]
 * @param {number[]} [goebu_params.service_ids] - Array of Service Ids
 * @param {object[]} [goebu_params.routes] - Routes to filter Trips
 * @param {number[]} goebu_params.trip_ids - Trip Ids filtered by goebu_params
 *
 * @return {number[]} goebu_params.trip_ids - Trip Ids filtered by goebu_params
 *
 * @param {errorResultCallback} cb - callback
 */
function attachTripsWithServiceIdsToRoutes(goebu_params, cb) {
    async.each(goebu_params.routes, function (route, eachCallback) {

            function getRouteIdsWithDirectionId(direction_id, parallelCallback) {
                Trip.aggregate({
                    $match: {
                        agency_key: goebu_params.agency_key,
                        service_id: {
                            $in: goebu_params.service_ids
                        },
                        route_id: route.route_id,
                        direction_id: direction_id
                    }
                }, {
                    $project: {
                        _id: 0,
                        trip_id: 1
                    }
                }, function onTripFoundAggregate(err, trips) {
                    if (err) {

                        return parallelCallback(err, null);
                    } else {
                        var trip_ids = [];
                        for (var i = 0, len = trips.length; i < len; i++) {
                            trip_ids.push(trips[i].trip_id);
                        }
                        if (trip_ids.length < 1) {
                            global.log.error("attachTripsWithServiceIdsToRoutes - No trips found for Route: " + route.route_id);
                        }
                        parallelCallback(null, trip_ids);
                    }
                });
            }

            async.parallel({
                0: getRouteIdsWithDirectionId.bind(null, 0),
                1: getRouteIdsWithDirectionId.bind(null, 1)
            }, function callbackAsyncParallelAttachTrips(err, results) {
                if (err) {
                    global.log.error("Error at attachTripsWithServiceIdsToRoutes - async.parallel", err);
                    eachCallback(err);
                } else {
                    route.trips = results;
                    //global.log.debug("results", results);
                    eachCallback();
                }
            });
        }, function callbackAsyncEachAttachTrips(err) {
            if (err) {
                global.log.error("Error at attachTripsWithServiceIdsToRoutes - async.each", err);
                return cb(err, null);
            } else {
                global.log.trace("All trips have been successfully processed.");
                //global.log.debug("goebu_params", JSON.stringify(goebu_params));
                return cb(null, goebu_params);
            }
        }
    );
}

function findOutDirectionIdForRoutes(goebu_params, cb) {
    async.each(goebu_params.routes, function (route, eachCallback) {

            function findParallelStopSequence(trip_ids, outerCallback) {
                async.parallel({
                        departure: function getDepartureStopSequence(parallelCallback) {
                            //global.log.debug("route.stop_departure.stop_ids", route.stop_departure.stop_ids);
                            StopTime
                                .findOne({

                                    agency_key: goebu_params.agency_key,
                                    trip_id: {
                                        $in: trip_ids
                                    },
                                    stop_id: {
                                        $in: route.stop_departure.stop_ids
                                    }
                                }, {stop_sequence: 1, _id: 0})
                                .sort({stop_sequence: 'desc'})
                                .exec(function (err, sequences) {
                                    if (err) {
                                        global.log.error("Error at findParallelStopSequence - async.parallel", err);
                                        parallelCallback(err, null);
                                    } else {
                                        //global.log.debug("Route: ", route.route_id, "departure sequences", sequences);
                                        parallelCallback(null, sequences);
                                    }

                                });
                        },
                        arrival: function getArrivalStopSequence(parallelCallback) {
                            //global.log.debug("route.stop_arrival.stop_ids", route.stop_arrival.stop_ids);
                            StopTime
                                .findOne({
                                    agency_key: goebu_params.agency_key,
                                    trip_id: {
                                        $in: trip_ids
                                    },
                                    stop_id: {
                                        $in: route.stop_arrival.stop_ids
                                    }
                                }, {stop_sequence: 1, _id: 0})
                                .sort({stop_sequence: 'desc'})
                                .exec(function (err, sequences) {
                                    if (err) {
                                        global.log.error("Error at findParallelStopSequence - async.parallel", err);
                                        parallelCallback(err, null);
                                    } else {
                                        //global.log.debug("Route: ", route.route_id, "arrival sequences", sequences);
                                        parallelCallback(null, sequences);
                                    }
                                });
                        }
                    }, function callbackAsyncParallelFindParallelStopSequence(err, results) {
                        if (err) {
                            global.log.error("Error at findParallelStopSequence - async.parallel", err);
                            outerCallback(err, null);
                        } else {
                            //global.log.debug("Route: ", route.route_id, "sequences", results);
                            outerCallback(null, results);

                        }
                    }
                );
            }

            async.parallel({
                //zero_direction: findParallelStopSequence.bind(null, directionZeroTripIds),
                zero_direction: findParallelStopSequence.bind(null, route.trips[0]),
                //one_direction: findParallelStopSequence.bind(null, directionOneTripIds)
                one_direction: findParallelStopSequence.bind(null, route.trips[1])
            }, function callbackAsyncParallelFindParallelStopSequence(err, results) {
                if (err) {
                    global.log.error("Error at findParallelStopSequence - async.parallel", err);
                    eachCallback(err);
                } else {
                    //global.log.debug("results", results);
                    route.direction_id = null;

                    if (results.zero_direction &&
                        results.zero_direction.departure &&
                        results.zero_direction.arrival &&
                        results.zero_direction.departure.stop_sequence < results.zero_direction.arrival.stop_sequence) {
                        route.direction_id = 0;
                    }
                    if (results.one_direction &&
                        results.one_direction.departure &&
                        results.one_direction.arrival &&
                        results.one_direction.departure.stop_sequence < results.one_direction.arrival.stop_sequence) {
                        route.direction_id = 1;
                    }

                    if (route.direction_id === null) {
                        global.log.error("Route: ", route.route_id, " --> direction_id not found!!");
                        global.log.error("results.zero_direction: ", results.zero_direction);
                        global.log.error("results.one_direction: ", results.one_direction);
                    }

                    eachCallback();
                }
            });

        }, function callbackAsyncEachAttachStopTimes(err) {
            if (err) {
                global.log.error("Error at findOutDirectionIdForRoutes - async.each", err);
                cb(err, null);
            } else {
                global.log.trace("Direction ID has been successfully processed.");
                //global.log.debug("goebu_params", JSON.stringify(goebu_params));
                cb(null, goebu_params);
            }
        }
    );
}

function attachArrivalStopSequenceToRouteWithTripsAndDirectionId(goebu_params, cb) {
    async.each(goebu_params.routes, function (route, eachCallback) {
            if (route.direction_id !== null) {
                async.parallel({
                        departure: function getDepartureStopSequence(parallelCallback) {
                            StopTime
                                .findOne({
                                    agency_key: goebu_params.agency_key,
                                    trip_id: {
                                        $in: route.trips[route.direction_id]
                                    },
                                    stop_id: {
                                        $in: route.stop_departure.stop_ids
                                    }
                                }, {stop_sequence: 1, _id: 0})
                                .sort({stop_sequence: 'desc'})
                                .exec(function (err, sequences) {
                                    if (err) {
                                        global.log.error("Error at AttachArrivalStopSequenceToRoute - async.parallel", err);
                                        parallelCallback(err, null);
                                    } else {
                                        //global.log.debug("departure sequences", sequences);
                                        parallelCallback(null, sequences);
                                    }

                                });
                        },
                        arrival: function getArrivalStopSequence(parallelCallback) {
                            StopTime
                                .findOne({
                                    agency_key: goebu_params.agency_key,
                                    trip_id: {
                                        $in: route.trips[route.direction_id]
                                    },
                                    stop_id: {
                                        $in: route.stop_arrival.stop_ids
                                    }
                                }, {stop_sequence: 1, _id: 0})
                                .sort({stop_sequence: 'desc'})
                                .exec(function (err, sequences) {
                                    if (err) {
                                        global.log.error("Error at AttachArrivalStopSequenceToRoute - async.parallel", err);
                                        parallelCallback(err, null);
                                    } else {
                                        //global.log.debug("arrival sequences", sequences);
                                        parallelCallback(null, sequences);
                                    }
                                });
                        }
                    }, function callbackAsyncParallelAttachArrivalStopSequenceToRoute(err, results) {
                        if (err) {
                            global.log.error("Error at AttachArrivalStopSequenceToRoute - async.parallel", err);
                            eachCallback(err);
                        } else {
                            //console.log(results, "<-- results");
                            route.stop_sequences = results;
                            eachCallback();

                        }
                    }
                );
            } else {
                eachCallback();
            }
        }, function callbackAsyncEachAttachStopTimes(err) {
            if (err) {
                global.log.error("Error at AttachArrivalStopSequenceToRoute - async.each", err);
                cb(err, null);
            } else {
                global.log.trace("Stop sequences have been successfully attached.");
                //global.log.debug("goebu_params", JSON.stringify(goebu_params));
                cb(null, goebu_params);
            }
        }
    );
}

function attachStopTimesWithServiceIdsAndTripsToRoutes(goebu_params, cb) {
    async.each(goebu_params.routes, function (route, eachCallback) {

            function getStopTimeWithDirectionId(direction_id, parallelCallback) {
                //console.log(route.trips[direction_id], "<-- route.trips[direction_id]");
                StopTime.aggregate({
                    $match: {
                        agency_key: goebu_params.agency_key,
                        trip_id: {
                            $in: route.trips[direction_id]
                        }
                    }
                }, {
                    $project: {
                        stop_id: 1,
                        stop_sequence: 1,
                        trip_id: 1
                    }
                }, {
                    $group: {
                        _id: {trip_id: "$trip_id"},
                        stop_ids: {$push: "$stop_id"},
                        stop_sequences: {$push: "$stop_sequence"},
                        count: {$sum: 1}
                    }
                }, {
                    $sort: {count: -1}
                }, function onStopTimeFoundAggregate(err, stopTimesWithDirection) {
                    if (err) {
                        return parallelCallback(err, null);
                    } else {
                        if (stopTimesWithDirection.length < 1) {
                            global.log.error("onStopTimeFoundAggregate - No stop times found route: " + route.route_id);
                        }

                        stopTimesWithDirection = stopTimesWithDirection[0];
                        if (stopTimesWithDirection.count && stopTimesWithDirection.count > 0) {
                            if (!route.stop_sequences) {
                                route.stop_sequences = {};
                            }

                            route.stop_sequences[direction_id] = new Array(stopTimesWithDirection.count);

                            if (!goebu_params[route.route_id]) {
                                goebu_params[route.route_id] = {};
                            }
                            if (!goebu_params[route.route_id][direction_id]) {
                                goebu_params[route.route_id][direction_id] = [];
                            }

                            for (var i = 0, len = stopTimesWithDirection.stop_ids.length; i < len; i++) {
                                var current_stop_time_stop_id = stopTimesWithDirection.stop_ids[i];
                                for (var y = 0, ylen = goebu_params.stops.length; y < ylen; y++) {
                                    var currentStop = goebu_params.stops[y];
                                    if (currentStop.stop_id === current_stop_time_stop_id) {
                                        goebu_params[route.route_id][direction_id].push(currentStop.stop_lat);
                                        goebu_params[route.route_id][direction_id].push(currentStop.stop_lon);

                                        route.stop_sequences[direction_id][stopTimesWithDirection.stop_sequences[i]] = {
                                            lat: currentStop.stop_lat,
                                            lon: currentStop.stop_lon
                                        };
                                        break;
                                    }
                                }

                            }
                        }

                        parallelCallback(null, stopTimesWithDirection);
                    }
                });
            }

            async.parallel({
                0: getStopTimeWithDirectionId.bind(null, 0),
                1: getStopTimeWithDirectionId.bind(null, 1)
            }, function callbackAsyncParallelAttachStopTimes(err, results) {
                if (err) {
                    global.log.error("Error at AttachStopTimes - async.parallel", err);
                    eachCallback(err);
                } else {
                    route.stop_times = results;
                    //global.log.debug("results", results);
                    eachCallback();
                }
            });
        }, function callbackAsyncEachAttachTrips(err) {
            if (err) {
                global.log.error("Error at attachStopTimesWithServiceIdsAndTripsToRoutes - async.each", err);
                cb(err, null);
            } else {
                global.log.trace("All trips have been successfully processed.");
                //global.log.debug("goebu_params", JSON.stringify(goebu_params));
                cb(null, goebu_params);
            }
        }
    );
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
 * @param {string} goebu_params.now
 * @param {number} goebu_params.nowInSeconds
 * @param {string} goebu_params.expiryTime
 *
 * @return {string[]} [goebu_params.past_times]
 * @return {string[]} [goebu_params.times]
 * @return {string[]} [goebu_params.future_times]
 *
 * @param {errorResultCallback} cb - callback
 *
 */
function findStopTimesWithTripsAndTimeHorizon(goebu_params, cb) {
    var timeInSeconds = utils.timeToSeconds(new Date()),
        stopTimeQuery = {},
        seconds_before = 3600,
        seconds_after = 3600;

    if (typeof timeCheat !== 'undefined' && timeCheat !== null) {
        timeInSeconds = timeInSeconds + timeCheat;
    }
    goebu_params.now = utils.secondsToTime(timeInSeconds);
    goebu_params.nowInSeconds = timeInSeconds;
    goebu_params.expiryTime = moment().add(seconds_after - 120, 'seconds').format();
    stopTimeQuery.agency_key = goebu_params.agency_key;

    async.each(goebu_params.routes, function (route, eachCallback) {
        if (route.direction_id !== null) {


            //global.log.debug("route", route);
            var query = StopTime.find(stopTimeQuery)
                .select("trip_id stop_id departure_time stop_sequence -_id")
                .where("departure_time").gte(timeInSeconds - seconds_before)
                .where("departure_time").lte(timeInSeconds + seconds_after)

                .sort("departure_time") //asc has been removed in favor of sort as of mongoose 3.x
                .limit(150);

            query = query.where({
                trip_id: {
                    $in: route.trips[route.direction_id]
                }
            });

            //if (route && route.stop_sequences && route.stop_sequences.arrival && route.stop_sequences.arrival.stop_sequence !== null) {
            //    var maxSequence = route.stop_sequences.arrival.stop_sequence + 2;
            //    query = query.where("stop_sequence").lte(maxSequence);
            //}
            //
            //if (route && route.stop_sequences && route.stop_sequences.departure && route.stop_sequences.departure.stop_sequence !== null) {
            //    var minSequence = route.stop_sequences.departure.stop_sequence - 10;
            //    if (minSequence < 0){
            //        minSequence = 0;
            //    }
            //    query = query.where("stop_sequence").gte(minSequence);
            //}

            query.exec(function (e, stopTimes) {
                if (e) {
                    global.log.error(e.message);
                    return cb(e, null);
                } else {
                    if (stopTimes.length > 0) {
                        route.stop_times = stopTimes;
                        route.stop_ids = [];
                        for (var i = 0, len = stopTimes.length; i < len; i++) {
                            var stopTime = stopTimes[i];
                            route.stop_ids.push(stopTime.stop_id);
                        }
                    } else {
                        global.log.error("No stop times found for Route:" + route.route_id);
                    }

                    eachCallback();
                }
            });
        } else {
            global.log.error("findStopTimesWithTripsAndTimeHorizon - Direction ID is missing ");
            eachCallback();
        }
    }, function callbackAsyncEachAttachStopTimes(err) {
        if (err) {
            global.log.error("Error at findStopTimesWithTripsAndTimeHorizon - async.each", err);
            cb(err, null);
        } else {
            global.log.trace("All stop times have been successfully added.");
            //global.log.debug("goebu_params", JSON.stringify(goebu_params));
            cb(null, goebu_params);
        }
    });

}

function attachStopsFromStopIdsForRoutes(goebu_params, cb) {
    goebu_params.titleText = 'Route wurde berechnet.';
    async.each(goebu_params.routes, function (route, eachCallback) {
        if (route.stop_ids && route.stop_ids.length > 0) {
            // TODO: fix so dass aktuelle Trips gezeigt werden
            route.color = fixtures.returnRouteColor(route.route_id);

            //global.log.debug("JSON.stringify", JSON.stringify(route));
            var query = Stop.find({
                agency_key: goebu_params.agency_key,
                stop_id: {
                    $in: route.stop_ids
                }
            }, {stop_id: 1, stop_desc: 1, stop_lat: 1, stop_lon: 1, _id: 0});
            query.exec(function (e, stops) {
                if (e) {
                    global.log.error(e.message);
                    return cb(e, null);
                } else {
                    route.stops = stops;
                    eachCallback();
                }
            });
        } else {
            eachCallback();
        }
    }, function callbackAsyncEachAttachStopTimes(err) {
        if (err) {
            global.log.error("Error at attachStopsFromStopIdsForRoutes - async.each", err);
            cb(err, null);
        } else {
            global.log.trace("All stop have been successfully added.");
            //global.log.debug("goebu_params", JSON.stringify(goebu_params));
            cb(null, goebu_params);
        }
    });

}

function cleanUpResultForUser(goebu_params, cb) {
    async.each(goebu_params.routes, function (route, eachCallback) {
        //delete route.stop_arrival;
        //delete route.stop_departure;
        delete route.trips;
        //if (route.hasOwnProperty('direction_id_proof')){
        //    delete route.direction_id_proof;
        //}

        delete route.stop_ids;
        eachCallback();
    }, function callbackAsyncEachAttachStopTimes(err) {
        if (err) {
            global.log.error("Error at cleanUpResultForUser - async.each", err);
            cb(err, null);
        } else {
            global.log.trace("Result has been cleaned up for user return ");
            //global.log.debug("goebu_params", JSON.stringify(goebu_params));
            cb(null, goebu_params);
        }
    });

}

function generateBusLineShapes(goebu_params, cb) {
    // TODO: generate BusLineShapes for the first trip starting with sequence 0 found
    // look for StopTime with sequence 0 and look 5 sequences ahead until no other StopTime with same trip id found
    // add every single one to array with StopID
    // lookup stop ids and add lat lng
    function findRelatedStopSequences(currentLiveSequenceStart, route) {
        var foundStopIds = [];
        foundStopIds.push(route.stop_times[currentLiveSequenceStart].stop_id);
        var currentTrip = route.stop_times[currentLiveSequenceStart].trip_id;
//    search ahead
        var gapLimit = 5;
        var gapCounter = 0;
        var currentIndex = currentLiveSequenceStart + 1;
        while (gapCounter < gapLimit) {
            if (route.stop_times[currentIndex] && route.stop_times[currentIndex].trip_id === currentTrip) {
                foundStopIds.push(route.stop_times[currentIndex].stop_id);
                gapCounter = 0;
            } else {
                gapCounter++;
            }
            currentIndex++;
        }
        // search backwards
        currentIndex = currentLiveSequenceStart - 1;
        gapCounter = 0;
        while (gapCounter < gapLimit) {
            if (route.stop_times[currentIndex] && route.stop_times[currentIndex].trip_id === currentTrip) {
                foundStopIds.unshift(route.stop_times[currentIndex].stop_id);
                gapCounter = 0;
            } else {
                gapCounter++;
            }
            currentIndex--;
        }
        return foundStopIds;
    }

    async.each(goebu_params.routes, function (route, eachCallback) {
            if (route.stop_times) {

                var currentLiveSequenceStart = null;

                for (var i = 0, len = route.stop_times.length; i < len; i++) {
                    var stop_time = route.stop_times[i];
                    if (stop_time.departure_time >= goebu_params.nowInSeconds) {
                        currentLiveSequenceStart = i - 1;
                        break;
                    }
                }
                if (currentLiveSequenceStart) {
                    var relatedStopIds = [];
                    var failCounter = 0;
                    while (relatedStopIds.length < 5 && failCounter < 5) {
                        relatedStopIds = findRelatedStopSequences(currentLiveSequenceStart, route);
                        currentLiveSequenceStart++;
                        failCounter++;
                    }
                    //console.log(route.route_id, " Route, ", failCounter, "<-- fail Counter");
                    //console.log(relatedStopIds, "<-- relatedStopIds");
                    //console.log(foundStopIds, "<-- foundStopIds");
                    var coords = [];
                    for (var j = 0, foundStopIdsLength = relatedStopIds.length; j < foundStopIdsLength; j++) {
                        var busLineStopId = relatedStopIds[j];
                        for (var k = 0, stopsLength = route.stops.length; k < stopsLength; k++) {
                            if (route.stops[k].stop_id === busLineStopId) {
                                coords.push(
                                    route.stops[k].stop_lat,
                                    route.stops[k].stop_lon
                                );
                                break;
                            }
                        }
                    }
                    if (!coords) {
                        global.log.error("Route: ", route.route_id, " - No coords found.");
                    }
                    route.coords = coords;
                } else {
                    global.log.error("Route: ", route.route_id, " - currentLiveSequenceStart not found");
                }
            }
            eachCallback();
        }, function callbackAsyncEachGenerateBusLineShapes(err) {
            if (err) {
                global.log.error("Error at generateBusLineShapes - async.each", err);
                cb(err, null);
            } else {
                global.log.trace("generateBusLineShapes successful");
                //global.log.debug("goebu_params", JSON.stringify(goebu_params));
                cb(null, goebu_params);
            }
        }
    );

}

function filterStopSequences(goebu_params, cb) {
    async.each(goebu_params.routes, function (route, eachCallback) {
            if (route.stop_sequences &&
                route.stop_sequences.departure && route.stop_sequences.departure.stop_sequence &&
                route.stop_sequences.arrival && route.stop_sequences.arrival.stop_sequence) {
                var maxSequence = Math.max(route.stop_sequences.arrival.stop_sequence, route.stop_sequences.departure.stop_sequence);
                var minSequence = Math.min(route.stop_sequences.arrival.stop_sequence, route.stop_sequences.departure.stop_sequence);

                //console.log(minSequence, maxSequence, "<-- minSequence, maxSequence");

                maxSequence = maxSequence + 4;
                minSequence = minSequence - 25;

                var cleanedStopTimes = [];
                if (route.stop_times) {

                    for (var i = 0, len = route.stop_times.length; i < len; i++) {
                        var stop_time = route.stop_times[i];
                        if (stop_time.stop_sequence <= maxSequence && stop_time.stop_sequence >= minSequence) {
                            cleanedStopTimes.push(stop_time);
                        }
                    }
                }
                route.stop_times = cleanedStopTimes;
            }
            eachCallback();
        }, function callbackAsyncEachGenerateBusLineShapes(err) {
            if (err) {
                global.log.error("Error at generateBusLineShapes - async.each", err);
                cb(err, null);
            } else {
                global.log.trace("generateBusLineShapes successful");
                //global.log.debug("goebu_params", JSON.stringify(goebu_params));
                cb(null, goebu_params);
            }
        }
    );
}

function cleanUpResultForBusLines(goebu_params, cb) {
    delete goebu_params.service_ids;
    delete goebu_params.agency_key;
    //delete goebu_params.stops;
    async.each(goebu_params.routes, function (route, eachCallback) {
        delete route.trips;
        delete route.stop_times;
        //delete route.stop_arrival;
        //delete route.stop_departure;
        //delete route.direction_id_proof;
        //delete route.stop_ids;
        eachCallback();
    }, function callbackAsyncEachAttachStopTimes(err) {
        if (err) {
            global.log.error("Error at cleanUpResultForBusLines - async.each", err);
            cb(err, null);
        } else {
            global.log.trace("Result has been cleaned up for user return ");
            //global.log.debug("goebu_params", JSON.stringify(goebu_params));
            cb(null, goebu_params);
        }
    });

}

module.exports = {

    getAllBusLineShapes: function (agency_key, cb) {

        var goebu_params = {
            agency_key: String(agency_key)
        };

        async.waterfall([
                async.apply(getRoutesByAgency, goebu_params),
                getServicesByAgency,
                getStopsByAgency,
                attachTripsWithServiceIdsToRoutes,
                attachStopTimesWithServiceIdsAndTripsToRoutes,
                cleanUpResultForBusLines,
                function (goebu_params, cb) {
                    //console.log(goebu_params, "<-- go");
                    cb(null, goebu_params);
                }
            ],
            utils.returnResults(cb));
    },

    getLiveBusPositions: function (agency_key, routesInString, startInString, endInString, cb) {
        var routeIds = routesInString.split(',');
        routeIds.pop();
        var starts = startInString.split(',');
        starts.pop();
        var ends = endInString.split(',');
        ends.pop();

        var routes = [];
        if (routeIds.length === starts.length && starts.length === ends.length) {
            for (var i = 0, len = routeIds.length; i < len; i++) {
                routes.push({
                    route_id: routeIds[i],
                    stop_arrival: {
                        stop_name: ends[i]
                    },
                    stop_departure: {
                        stop_name: starts[i]
                    }
                });
            }
        }

        var goebu_params = {
            agency_key: String(agency_key),
            routes: routes
        };

        async.waterfall([
                async.apply(findStopsWithStopDescInRoutes, goebu_params),
                findServices,
                attachTripsWithServiceIdsToRoutes,
                findOutDirectionIdForRoutes,
                attachArrivalStopSequenceToRouteWithTripsAndDirectionId,
                findStopTimesWithTripsAndTimeHorizon,
                attachStopsFromStopIdsForRoutes,
                generateBusLineShapes,

                filterStopSequences,

                cleanUpResultForUser
            ],
            utils.returnResults(cb));
    }

};

/**
 * errorResultCallback is a callback type and is displayed as a global symbol.
 *
 * @callback errorResultCallback - The callback that handles errors and responses.
 * @param {Object} error - If an error occurred pass the err object here.
 * @param {Object} result - Pass results back.
 */