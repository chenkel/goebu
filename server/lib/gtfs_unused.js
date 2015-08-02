//Shape = db.model("Shape"),
//

//
//
//findBothDirectionNames: function (agency_key, route_id, cb) {
//    /*
//     * Returns an object of {northData: "Headsign north", southData: "Headsign south"}
//     */
//    var findDirectionName = function (agency_key, route_id, direction_id, cb) {
//        var query = {
//            agency_key: agency_key,
//            route_id: route_id,
//            direction_id: direction_id
//        };
//
//        Trip
//            .find(query)
//            .limit(1)
//            .run(function (e, trips) {
//                if (e) {
//                    log.debug(e, "findBothDirectionNames - error");
//                    cb(e, null);
//                } else {
//                    cb(trips[0].trip_headsign);
//                }
//            });
//    };
//},
//
//getShapesByRoute: function (agency_key, route_id, direction_id, cb) {
//    if (_.isFunction(direction_id)) {
//        cb = direction_id;
//        direction_id = null;
//    }
//
//    var shape_ids = [],
//        shapes = [];
//
//    async.series([
//        async.apply(getShapeIds, agency_key, route_id, direction_id, shape_ids),
//        async.apply(getShapes, agency_key, shape_ids, shapes)
//    ], function (err, result) {
//        if (err) {
//            log.debug(result, "result");
//            log.debug(err, "getShapesByRoute - error");
//            cb(err, null);
//        } else {
//            cb(null, shapes);
//        }
//    });
//
//
//},
//
//
//getRoutesByDistance: function (lat, lon, radius, cb) {
//    //gets all routes within a radius
//
//    if (_.isFunction(radius)) {
//        cb = radius;
//        radius = 1; //default is 1 mile
//    }
//
//    lat = parseFloat(lat);
//    lon = parseFloat(lon);
//
//    var radiusInDegrees = Math.round(radius / 69 * 100000) / 100000,
//        stop_ids = [],
//        trip_ids = [],
//        route_ids = [],
//        routes = [];
//
//    async.series([
//        async.apply(getStopsNearby, lon, lat, radiusInDegrees, stop_ids),
//        findTripsWithServiceRouteDirection,
//
//        async.apply(getRoutes, trip_ids, route_ids),
//        async.apply(lookupRoutes, route_ids, routes)
//    ], function (e, results) {
//        if (e) {
//            log.debug(results, "results");
//            log.debug(e, "getRoutesByDistance - error");
//            cb(e, null);
//        } else {
//            cb(e, routes);
//        }
//    });
//
//
//},
//
//function getStopsNearby(lon, lat, radiusInDegrees, stop_ids, cb) {
//    Stop
//        .where("loc")
//        .near(lon, lat).maxDistance(radiusInDegrees)
//        .exec(function (e, stops) {
//            if (e) {
//                log.debug(e, "getStopsNearby - error");
//                cb(e, null);
//            } else {
//                if (stops.length) {
//                    stops.forEach(function (stop) {
//                        if (stop.stop_id) {
//                            stop_ids.push(stop.stop_id);
//                        }
//                    });
//                    cb(e, "stops");
//                } else {
//                    cb(new Error("No stops within " + radiusInDegrees + " miles"), "stops");
//                }
//            }
//        });
//}
//
//function getRoutes(trip_ids, route_ids, cb) {
//    Trip
//        .distinct("route_id")
//        .where("trip_id").in(trip_ids)
//        .exec(function (e, results) {
//            if (e) {
//                log.debug(e, "getRoutes - error");
//                cb(e, null);
//            } else {
//                if (results.length) {
//                    route_ids = results;
//                    cb(null, "routes");
//                } else {
//                    cb(new Error("No routes to any stops within " + radius + " miles"), "routes");
//                }
//            }
//        });
//}
//
//function lookupRoutes(route_ids, routes, cb) {
//    Route
//        .where("route_id").in(route_ids)
//        .exec(function (e, results) {
//            if (e) {
//                log.debug(e, "lookupRoutes - error");
//                cb(e, null);
//            } else {
//                if (results.length) {
//                    routes = results;
//                    cb(null, "lookup");
//                } else {
//                    cb(new Error("No information for routes"), "lookup");
//                }
//            }
//        });
//}
//
//function getShapeIds(agency_key, route_id, direction_id, shape_ids, cb) {
//    var query = {
//        agency_key: agency_key,
//        route_id: route_id
//    };
//
//    if ((direction_id === 0) || (direction_id === 1)) {
//        query.direction_id = direction_id;
//    } else {
//        query["$or"] = [{direction_id: 0}, {direction_id: 1}]
//    }
//
//    Trip
//        .find(query)
//        .distinct("shape_id", function (err, results) {
//            if (err) {
//                log.debug(err, "getShapeIds - error");
//                cb(err, null);
//            }
//            if (results.length) {
//                shape_ids = results;
//                cb(null, "shape_ids");
//            } else {
//                cb(new Error("No trips with shapes."), "trips")
//            }
//        });
//}
//
//function getShapes(agency_key, shape_ids, shapes, cb) {
//    async.forEach(shape_ids, function (shape_id, cb) {
//        Shape.find({
//            agency_key: agency_key,
//            shape_id: parseInt(shape_id, 10)
//        }, function (err, shape_pts) {
//            if (err) {
//                log.debug(err, "getShapes - error");
//                cb(err, null);
//            }
//            if (shape_pts.length) {
//                shapes.push(shape_pts);
//                cb(null, "shape_pts");
//            } else {
//                log.debug(err, "getShapes - No shapes with shape_id.");
//                cb(new Error("No shapes with shape_id."), "shape_pts")
//            }
//        });
//    }, function (err) {
//        if (err) {
//            log.debug(err, "getShapes - error");
//            cb(err, "shapes");
//        } else {
//            cb(null, "shapes");
//        }
//    })
//}