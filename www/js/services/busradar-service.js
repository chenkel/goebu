"use strict";
var host = "http://localhost:3000/";
//var host = "http://goebu.christopherhenkel.de:3000/";

angular.module("goebu.services").factory('busRadar', function ($http) {
    var busRadar = {};

    var previousBusLineQuery = '',
        previousStartQuery = '',
        previousEndQuery = '';
    var previousResult = {};

    busRadar.livePositions = [];
    busRadar.nextUpdate = moment();

    function timeToSeconds(time) {
        var timeParts;
        if (time instanceof Date) {
            timeParts = [time.getHours(), time.getMinutes(), time.getSeconds()];
        } else {
            timeParts = time.split(":");
            if (timeParts.length !== 3) {
                return null;
            }
        }
        return parseInt(timeParts[0], 10) * 60 * 60 + parseInt(timeParts[1], 10) * 60 + parseInt(timeParts[2], 10);
    }

    function addLatLngToDistinctSequences(route) {
        for (var x = 0, xlen = route.distinctSequences.length; x < xlen; x++) {
            var currentDistinctSequence = route.distinctSequences[x];

            var startResolved = false;
            var endResolved = false;
            for (var y = 0, ylen = route.stops.length; y < ylen; y++) {
                var currentStop = route.stops[y];
                if (currentStop.stop_id === currentDistinctSequence.end.stop_id) {
                    currentDistinctSequence.end.stop_lat = currentStop.stop_lat;
                    currentDistinctSequence.end.stop_lon = currentStop.stop_lon;
                    endResolved = true;
                }
                if (currentStop.stop_id === currentDistinctSequence.start.stop_id) {
                    currentDistinctSequence.start.stop_lat = currentStop.stop_lat;
                    currentDistinctSequence.start.stop_lon = currentStop.stop_lon;
                    startResolved = true;
                }
                if (startResolved && endResolved) {
                    break;
                }
            }
        }
    }

    function constructLiveSequences(goebu_params, cb) {
        var now = new Date();
        var nowInSeconds = timeToSeconds(now);
        async.each(goebu_params.routes, function (route, eachCallback) {
            if (route.stop_times && route.stop_times.length > 0) {
                route.distinctSequences = [];
                var lastPastStopTime = null;
                for (var i = 0, len = route.stop_times.length; i < len; i++) {

                    if (route.stop_times[i].departure_time > nowInSeconds) {
                        lastPastStopTime = i - 1;
                        break;
                    }
                }
                var firstFoundDistinctSequenceStart = route.stop_times[lastPastStopTime];

                var distinctSequencesStart = [];
                distinctSequencesStart.push(firstFoundDistinctSequenceStart);

                // schaue maximal 30 sequence zurueck
                var lowerLoopBound = lastPastStopTime - 100;
                if (lowerLoopBound < 0) {
                    lowerLoopBound = 0;
                }
                for (var j = lastPastStopTime - 1; j >= lowerLoopBound; j--) {
                    if (route.stop_times[j].trip_id !== firstFoundDistinctSequenceStart.trip_id) {

                        distinctSequencesStart.push(route.stop_times[j]);
                        //    es gibt nur 2 Routen gleichzeitig, also kann man abbrechen
                        break;
                    }
                }
                // schaue 10 sequences nach vorne und speichere die distinct sequences
                var upperLoopBound = lastPastStopTime + 100;
                if (route.stop_times.length - 1 < upperLoopBound) {
                    upperLoopBound = route.stop_times.length - 1;
                }
                for (var k = 0, len2 = distinctSequencesStart.length; k < len2; k++) {
                    var currentDistinctSequenceStart = distinctSequencesStart[k];
                    var endSequenceFound = false;
                    if (currentDistinctSequenceStart) {
                        for (var l = lastPastStopTime + 1; l <= upperLoopBound; l++) {
                            if (currentDistinctSequenceStart.trip_id === route.stop_times[l].trip_id) {
                                route.distinctSequences.push({
                                    start: currentDistinctSequenceStart,
                                    end: route.stop_times[l]
                                });
                                endSequenceFound = true;
                                break;
                            } else if (route.stop_times[l].stop_sequence === 0) {
                                route.distinctSequences.push({
                                    start: route.stop_times[l],
                                    end: route.stop_times[l],
                                    stalled: true
                                });
                            }
                        }
                        if (currentDistinctSequenceStart.stop_sequence === 0 && endSequenceFound === false) {
                            route.distinctSequences.push({
                                start: currentDistinctSequenceStart,
                                end: currentDistinctSequenceStart,
                                stalled: true
                            });
                        }
                    }
                }

                addLatLngToDistinctSequences(route);

                if (route.distinctSequences) {
                    goebu_params.live_positions = [];
                    for (var m = 0, mlen = route.distinctSequences.length; m < mlen; m++) {
                        var currentSequence = route.distinctSequences[m];
                        var time_total = currentSequence.end.departure_time - currentSequence.start.departure_time;
                        if (time_total === 0) {
                            time_total = 0.0000001;
                        }

                        var progress = (nowInSeconds - currentSequence.start.departure_time) / time_total;

                        var vec_lat = currentSequence.end.stop_lat - currentSequence.start.stop_lat;
                        var vec_lon = currentSequence.end.stop_lon - currentSequence.start.stop_lon;

                        currentSequence.lat = currentSequence.start.stop_lat + progress * vec_lat;
                        currentSequence.lon = currentSequence.start.stop_lon + progress * vec_lon;
                        currentSequence.route = route;
                        goebu_params.live_positions.push(currentSequence);

                    }
                }

            }

            eachCallback();
        }, function callbackAsyncEachconstructLiveSequences(err) {
            if (err) {
                console.error("Error at findStopTimesWithTripsAndTimeHorizon - async.each", err);
                cb(err, null);
            } else {
                busRadar.livePositions = goebu_params.live_positions;
                cb(null, goebu_params);
            }
        });
    }

    busRadar.getLivePositionsForBusLines = function (currentBusLines, cb) {
        function callbackConstructLiveSequences(e, res) {
            if (!!e) {
                console.error(e, "error");
            }
            cb();
        }

        var busLinesQuery = '',
            startQuery = '',
            endQuery = '';
        for (var i = 0, len = currentBusLines.length; i < len; i++) {
            busLinesQuery = busLinesQuery + currentBusLines[i].line_id + ',';
            startQuery = startQuery + currentBusLines[i].line_start + ',';
            endQuery = endQuery + currentBusLines[i].line_end + ',';
        }
        var updateDue = moment().isAfter(busRadar.nextUpdate);
        if (previousBusLineQuery !== busLinesQuery ||
            previousEndQuery !== endQuery ||
            previousStartQuery !== startQuery ||
            updateDue) {
            var url = host + "api/shapes/goevb/q?routes=" + busLinesQuery + '&starts=' + startQuery + '&ends=' + endQuery;
            console.log("API getting CALLED");
            $http.get(url)
                .success(function (result) {
                    if (result) {
                        busRadar.nextUpdate = moment(result.expiryTime);
                        console.log(busRadar.nextUpdate.format(), "<-- next API Call");
                        previousResult = result;
                        constructLiveSequences(result, callbackConstructLiveSequences);
                    }
                    previousBusLineQuery = busLinesQuery;
                    previousStartQuery = startQuery;
                    previousEndQuery = endQuery;
                });
        } else {
            if (previousResult &&
                previousResult.routes[0] &&
                previousResult.routes[0].stop_times &&
                previousResult.routes[0].stop_times.length > 0) {
                console.log("Offline Calculation");
                constructLiveSequences(previousResult, callbackConstructLiveSequences);
            }
        }
    };
    return busRadar;

});








