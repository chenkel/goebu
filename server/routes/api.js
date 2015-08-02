"use strict";
var express = require("express");
var router = express.Router();
var gtfs = require("../lib/gtfs");
var survey = require("../lib/survey");

router.get("/shapes/:agency/q", function (req, res, next) {
    /** @namespace req.query.starts */
    /** @namespace req.query.ends */
    /** @namespace req.params.agency */

    var agency_key = req.params.agency,
        routes = req.query.routes,
        starts = req.query.starts,
        ends = req.query.ends;

    console.log(agency_key, routes, starts, ends, "<-- agency_key, routes, start, end");

    gtfs.getLiveBusPositions(agency_key, routes, starts, ends, function (e, data) {
        if (e) {
            global.log.error(e.message);
            return next(e);
        }
        res.send(data || {error: "No live bus shapes for agency combination."});
    });
});

router.get("/shapes/:agency/line/all", function (req, res, next) {
    var agency_key = req.params.agency;
    gtfs.getAllBusLineShapes(agency_key, function (e, data) {
        if (e) {
            global.log.error(e.message);
            return next(e);
        }
        res.send(data || {error: "No bus line shapes for agency combination."});
    });
});

var return_times_cb = function (res, next) {
    return function (e, data) {
        if (e) {
            global.log.error(e, "return_times_cb - e:");
            return next(e);
        }
        res.send(data || {error: "No times for agency/route/stop combination."});
    };
};

router.get("/survey/opened/:unix/group/:group", function (req, res, next) {
    var unixTime = req.params.unix,
        group_id = req.params.group;

    survey.returnSurveyByTimeAndGroup(unixTime, group_id, return_times_cb(res, next));
});

module.exports = router;
