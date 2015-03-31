"use strict";
var express = require("express");
var router = express.Router();
var gtfs = require("../lib/gtfs");

///* AgencyList */
//router.get("/agencies", function (req, res, next) {
//    gtfs.agencies(function (e, data) {
//        if (e) {
//            return next(e);
//        }
//        res.send(data || {error: "No agencies in database"});
//    });
//});

//
//router.get("/agenciesNearby/:lat/:lon/:radiusInMiles", function (req, res, next) {
//    var lat = req.params.lat,
//        lon = req.params.lon,
//        radius = req.params.radiusInMiles;
//    gtfs.getAgenciesByDistance(lat, lon, radius, function (e, data) {
//        if (e) return next(e);
//        res.send(data || {error: "No agencies within radius of " + radius + " miles"});
//    });
//});
//
//
//router.get("/agenciesNearby/:lat/:lon", function (req, res, next) {
//    var lat = req.params.lat,
//        lon = req.params.lon;
//    gtfs.getAgenciesByDistance(lat, lon, function (e, data) {
//        if (e) return next(e);
//        res.send(data || {error: "No agencies within default radius"});
//    });
//});

//
///* Routelist */
//router.get("/routes/:agency", function (req, res, next) {
//    var agency_key = req.params.agency;
//    gtfs.getRoutesByAgency(agency_key, function (e, data) {
//        if (e) return next(e);
//        res.send(data || {error: "No routes for agency_key " + agency_key});
//    });
//});
//
//
//router.get("/routesNearby/:lat/:lon/:radiusInMiles", function (req, res, next) {
//    var lat = req.params.lat,
//        lon = req.params.lon,
//        radius = req.params.radiusInMiles;
//    gtfs.getRoutesByDistance(lat, lon, radius, function (e, data) {
//        if (e) return next(e);
//        res.send(data || {error: "No routes within radius of " + radius + " miles"});
//    });
//});
//
//
//router.get("/routesNearby/:lat/:lon", function (req, res, next) {
//    var lat = req.params.lat,
//        lon = req.params.lon;
//    gtfs.getRoutesByDistance(lat, lon, function (e, data) {
//        if (e) return next(e);
//        res.send(data || {error: "No routes within default radius"});
//    });
//});
//
//
///* Shapes */
//router.get("/shapes/:agency/:route_id/:direction_id", function (req, res, next) {
//    var agency_key = req.params.agency,
//        route_id = req.params.route_id,
//        direction_id = parseInt(req.params.direction_id, 10);
//    gtfs.getShapesByRoute(agency_key, route_id, direction_id, function (e, data) {
//        if (e) return next(e);
//        res.send(data || {error: "No shapes for agency/route/direction combination."});
//    });
//});
//
//
//router.get("/shapes/:agency/:route_id", function (req, res, next) {
//    var agency_key = req.params.agency,
//        route_id = req.params.route_id;
//    gtfs.getShapesByRoute(agency_key, route_id, function (e, data) {
//        if (e) return next(e);
//        res.send(data || {error: "No shapes for agency/route combination."});
//    });
//});

router.get("/shapes/:agency/direction/:direction_id/stop/:stop_id", function (req, res, next) {
    var agency_key = req.params.agency,
        stop_id = req.params.stop_id,
        direction_id = parseInt(req.params.direction_id, 10);
    gtfs.getAllLiveBusShapes(agency_key, null, direction_id, stop_id, function (e, data) {
        if (e) {
            global.log.error(e.message);
            return next(e);
        }
        res.send(data || {error: "No live bus shapes for agency combination."});
    });
});

router.get("/shapes/:agency/route/:route_id/direction/:direction_id/stop/:stop_id", function (req, res, next) {
    var agency_key = req.params.agency,
        stop_id = req.params.stop_id,
        route_id = req.params.route_id,
        direction_id = parseInt(req.params.direction_id, 10);
    gtfs.getAllLiveBusShapes(agency_key, route_id, direction_id, stop_id, function (e, data) {
        if (e) {
            global.log.error(e.message);
            return next(e);
        }
        res.send(data || {error: "No live bus shapes for agency combination."});
    });
});

/* Stoplist */
router.get("/stops/:agency/route/:route_id/direction/:direction_id", function (req, res, next) {
    var agency_key = req.params.agency,
        route_id = req.params.route_id,
        direction_id = parseInt(req.params.direction_id, 10);

    gtfs.getStopsByRoute(agency_key, route_id, direction_id, function (e, data) {
        if (e) {
            return next(e);
        }
        res.send(data || {error: "No stops for agency/route/direction combination."});
    });
});

router.get("/stops/:agency/:route_id", function (req, res, next) {
    var agency_key = req.params.agency,
        route_id = req.params.route_id;
    gtfs.getStopsByRoute(agency_key, route_id, function (e, data) {
        if (e) {
            return next(e);
        }
        res.send(data || {error: "No stops for agency/route combination."});
    });
});

//
router.get("/stopsNearby/:lat/:lon/:radiusInMiles", function (req, res, next) {
    var lat = req.params.lat,
        lon = req.params.lon;
    var radius = req.params.radiusInMiles;
    gtfs.getStopsByDistance(lat, lon, radius, function (e, data) {
        if (e) {
            return next(e);
        }
        res.send(data || {error: "No stops within radius of " + radius + " miles"});
    });
});
//
//
//router.get("/stopsNearby/:lat/:lon", function (req, res, next) {
//    var lat = req.params.lat,
//        lon = req.params.lon;
//    gtfs.getStopsByDistance(lat, lon, function (e, data) {
//        if (e) return next(e);
//        res.send(data || {error: "No stops within default radius"});
//    });
//});

/* Times */
var return_times_cb = function (res, next) {
    return function (e, data) {
        if (e) {
            global.log.error(e, "return_times_cb - e:");
            return next(e);
        }
        res.send(data || {error: "No times for agency/route/stop combination."});
    };
};

router.get("/times/:agency/stop/:stop_id", function (req, res, next) {
    var agency_key = req.params.agency,
        stop_id = req.params.stop_id;

    gtfs.getTimesByStop(agency_key, null, stop_id, null, return_times_cb(res, next));
});

router.get("/times/:agency/direction/:direction_id/stop/:stop_id/", function (req, res, next) {
    var agency_key = req.params.agency,
        stop_id = req.params.stop_id,
        direction_id = parseInt(req.params.direction_id, 10);
    gtfs.getTimesByStop(agency_key, null, stop_id, direction_id, return_times_cb(res, next));
});

router.get("/times/:agency/route/:route_id/stop/:stop_id", function (req, res, next) {
    var agency_key = req.params.agency,
        route_id = req.params.route_id,
        stop_id = req.params.stop_id;
    if (route_id === "0") {
        gtfs.getTimesByStop(agency_key, null, stop_id, null, return_times_cb(res, next));
    } else {
        gtfs.getTimesByStop(agency_key, route_id, stop_id, null, return_times_cb(res, next));
    }
});

router.get("/times/:agency/route/:route_id/direction/:direction_id/stop/:stop_id", function (req, res, next) {
    var agency_key = req.params.agency,
        route_id = req.params.route_id,
        stop_id = req.params.stop_id,
        direction_id = parseInt(req.params.direction_id, 10);
    gtfs.getTimesByStop(agency_key, route_id, stop_id, direction_id, return_times_cb(res, next));
});

module.exports = router;
