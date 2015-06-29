"use strict";
//var host = "http://goebu.christopherhenkel.de:3000/";
var host = "http://localhost:3000/";

var live_bus_position_timer,
    isMapInit = false;

angular.module("goebu.controllers", [])

    .controller("HaltestellenCtrl", function ($scope, $ionicLoading, $ionicModal, $http, $stateParams, $timeout) {
        //    console.log("<-- init");
        //    $scope.map = null;
        //
        //    var url = "";
        //    var route_id = null;
        //    $scope.direction_id = 1;
        //
        //    if (!$stateParams.buslinienId) {
        //        $stateParams.buslinienId = route_id;
        //        $scope.title = "Alle Haltestellen";
        //    } else {
        //        route_id = $stateParams.buslinienId;
        //        $scope.title = route_id;
        //    }
        //
        //    var liveBusPositions = [];
        //    var stop_markers = [];
        //    var live_bus_bounds;
        //    var bounds;
        //
        //    function clear_markers(markerArray) {
        //
        //        for (var i = 0; i < markerArray.length; i++) {
        //            markerArray[i].setMap(null);
        //        }
        //        markerArray.length = 0;
        //        return [];
        //    }
        //
        //    function addStopsToMap(data) {
        //
        //        bounds = new google.maps.LatLngBounds();
        //        var stops = data.stops[$scope.direction_id];
        //
        //        var stop;
        //        for (var i = 0, len = stops.length; i < len; i++) {
        //            stop = stops[i];
        //            if (stop) {
        //                stop_markers[i] = new google.maps.Marker({
        //                    title: stop.stop_name,
        //                    position: new google.maps.LatLng(stop.stop_lat, stop.stop_lon),
        //                    icon: "img/bushaltestelle.png",
        //                    stop_name: stop.stop_name,
        //                    stop_desc: stop.stop_desc,
        //                    stop_id: stop.stop_id,
        //                    stop_lat: stop.stop_lat,
        //                    stop_lon: stop.stop_lon,
        //                    map: $scope.map
        //                });
        //
        //                google.maps.event.addListener(
        //                    stop_markers[i], "click", $scope.markerClicked.bind(null, i));
        //                bounds.extend(new google.maps.LatLng(stop.stop_lat, stop.stop_lon));
        //            }
        //        }
        //        //$scope.map.fitBounds(bounds);
        //    }
        //
        //    function getStops() {
        //        url = host + "api/stops/goevb/route/" + route_id + "/direction/" + $scope.direction_id;
        //
        //        $http.get(url)
        //            .success(function (data) {
        //                if (data) {
        //                    stop_markers = clear_markers(stop_markers);
        //                    addStopsToMap(data);
        //                }
        //                else {
        //                    console.log("no data");
        //                    stop_markers = [];
        //                }
        //            }.bind($scope));
        //    }
        //
        //    $scope.$on('mapInitialized', function (event, map) {
        //        // mapInitialized got called twice. bug?
        //        if (!isMapInit) {
        //            $scope.map = map;
        //
        //            getStops();
        //            isMapInit = true;
        //        }
        //    });
        //    if (isMapInit) {
        //
        //        getStops();
        //    }
        //
        //    function restartLiveBusTimer() {
        //        $timeout.cancel(live_bus_position_timer);
        //        $scope.updateBusMarker(function () {
        //            $scope.map.fitBounds(live_bus_bounds);
        //        });
        //        $scope.startLiveBusMarker();
        //    }
        //
        //    $scope.markerClicked = function (index) {
        //        console.log($scope.map, "<-- map");
        //        //$scope.selected_stop = stop_markers[index];
        //        //if (!live_bus_bounds) {
        //        //    live_bus_bounds = new google.maps.LatLngBounds();
        //        //}
        //        //live_bus_bounds.extend(new google.maps.LatLng(stop_markers[index].stop_lat, stop_markers[index].stop_lon));
        //        //
        //        //liveBusPositions = clear_markers(liveBusPositions);
        //        //restartLiveBusTimer();
        //        //$scope.getStopTimes(function () {
        //        //});
        //    }.bind($scope);
        //
        //
        //    $scope.directionsChanged = function(evt){
        //        console.log(evt, "<-- evt, YEAH");
        //    };
        //
        //    $scope.changeDirection = function () {
        //
        //        $scope.direction_id = $scope.direction_id === 1 ? 2 : 1;
        //        getStops();
        //
        //        if ($scope.selected_stop && $scope.selected_stop.stop_id) {
        //            // TODO: change selected_stop.stop_id to stop with similar name but different id.
        //            liveBusPositions = clear_markers(liveBusPositions);
        //            restartLiveBusTimer();
        //            $scope.getStopTimes(function () {
        //            });
        //        }
        //
        //    };
        //
        //    $scope.getStopTimes = function (cb) {
        //        $http.get(host + "api/times/goevb/route/" +
        //            route_id + "/direction/" + $scope.direction_id + "/stop/" + $scope.selected_stop.stop_id)
        //            .success(function (data) {
        //                if (data !== null) {
        //                    if (data.times && data.times.length > 0) {
        //                        $scope.selected_stop.times = data.times;
        //                        var tmpNextTimes = [];
        //                        var len = Math.min(data.times.length, 3);
        //                        for (var i = 0; i < len; i++) {
        //                            tmpNextTimes.push(data.times[i].time_human);
        //                        }
        //                        $scope.selected_stop.next_times = tmpNextTimes;
        //                    }
        //                    cb(null, "times");
        //                } else {
        //                    $scope.selected_stop.times = [];
        //                    cb("nothing found", "times");
        //                }
        //            }.bind($scope))
        //            .error(function (error) {
        //                console.error(error, "error");
        //            });
        //    };
        //
        //    $scope.updateBusMarker = function (cb) {
        //        $http.get(host + "api/shapes/goevb/route/" + route_id +
        //            "/direction/" + $scope.direction_id +
        //            "/stop/" + $scope.selected_stop.stop_id)
        //            .success(function (result) {
        //                if (result.live_sequences && result.live_sequences.length > 0) {
        //                    var data = result.live_sequences;
        //                    var nData = data.length;
        //                    var nPreviousData = liveBusPositions.length;
        //
        //                    if (nPreviousData !== nData) {
        //                        liveBusPositions = clear_markers(liveBusPositions);
        //                    }
        //                    for (var j = 0, len2 = data.length; j < len2; j++) {
        //                        if (cb) {
        //                            if (!live_bus_bounds) {
        //                                live_bus_bounds = new google.maps.LatLngBounds();
        //                            }
        //                            live_bus_bounds.extend(new google.maps.LatLng(data[j].lat, data[j].lon));
        //                        }
        //                        if (!liveBusPositions[j]) {
        //                            liveBusPositions.push(new google.maps.Marker({
        //                                title: "yipeeee",
        //                                position: new google.maps.LatLng(data[j].lat, data[j].lon),
        //                                icon: "img/bus.png",
        //                                map: $scope.map,
        //                                zIndex: 1000
        //                            }));
        //                        } else {
        //                            liveBusPositions[j].setPosition(new google.maps.LatLng(data[j].lat, data[j].lon));
        //                        }
        //                    }
        //                    if (cb) {
        //                        cb();
        //                    }
        //                } else {
        //                    liveBusPositions = clear_markers(liveBusPositions);
        //                    console.log("No live bus information available");
        //                }
        //            }.bind($scope))
        //            .error(function (error) {
        //                console.error(error, "error");
        //            });
        //    };
        //
        //    $scope.startLiveBusMarker = function () {
        //        // Function to replicate setInterval using $timeout service.
        //        live_bus_position_timer = $timeout(function () {
        //            $scope.updateBusMarker();
        //            $scope.startLiveBusMarker();
        //        }.bind($scope), 3000);
        //    };

        //    function restartLiveBusTimer() {
        //        $timeout.cancel(live_bus_position_timer);
        //        $scope.updateBusMarker(function () {
        //            $scope.map.fitBounds(live_bus_bounds);
        //        });
        //        $scope.startLiveBusMarker();
        //    }
        //
        //    $ionicModal.fromTemplateUrl("templates/stop-time-modal.html", {
        //        scope: $scope,
        //        animation: "slide-in-up"
        //    }).then(function (modal) {
        //        $scope.modal = modal;
        //    }.bind($scope));
        //    $scope.openModal = function () {
        //        $scope.modal.show();
        //    };
        //    $scope.closeModal = function () {
        //        $scope.modal.hide();
        //    };
        //
        //    $scope.$on("$destroy", function () {
        //        //Cleanup the modal when we"re done with it!
        //        $scope.modal.remove();
        //    });
        //
        //    $scope.$on("modal.hidden", function () {
        //        // Execute action on hide modal
        //    });
        //
        //    $scope.$on("modal.removed", function () {
        //        // Execute action on remove modal
        //    });
        //
    })

    .controller("AppCtrl", function ($scope, $rootScope, $timeout, $ionicSideMenuDelegate) {

        $rootScope.$on('$cordovaPush:tokenReceived', function (event, data) {
            alert("Successfully registered token " + data.token);
            console.log('Ionic Push: Got token ', data.token, data.platform);
            $scope.token = data.token;
        });

        $scope.toggleLeftSideMenu = function () {
            $timeout.cancel(live_bus_position_timer);
            isMapInit = false;
            $ionicSideMenuDelegate.toggleLeft();
        };

    })

    .directive('headerShrinkTwitterStyle', function ($document) {
        // var shrink = function(header, content, amt, max) {
        //   amt = Math.min(250, amt);
        //   ionic.requestAnimationFrame(function() {
        //     header.style[ionic.CSS.TRANSFORM] = 'translate3d(0, +' + amt + 'px, 0)';
        //   });
        // };

        return {
            restrict: 'A',
            link: function ($scope, $element, $attr) {
                var resizeFactor, scrollFactor, blurFactor;
                //var header = $document[0].body.querySelector('.map-wrapper');
                var header2 = $document[0].body.querySelector('#map_canvas');

                $element.bind('scroll', function (e) {
                    if (e.detail.scrollTop >= 0) {
                        // Start shrinking
                        // shrinkAmt = headerHeight - Math.max(0, (starty + headerHeight) - e.detail.scrollTop);
                        // shrink(header, $element[0], shrinkAmt, headerHeight);
                        scrollFactor = e.detail.scrollTop / 2;
                        //header.style[ionic.CSS.TRANSFORM] = 'translate3d(0, +' + scrollFactor + 'px, 0)';
                        header2.style[ionic.CSS.TRANSFORM] = 'translate3d(0, +' + scrollFactor + 'px, 0)';
                    } else {
                        // shrink(header, $element[0], 0, headerHeight);
                        resizeFactor = -e.detail.scrollTop / 100 + 0.99;
                        blurFactor = -e.detail.scrollTop / 10;
                        //header.style[ionic.CSS.TRANSFORM] = 'scale(' + resizeFactor + ',' + resizeFactor + ')';
                        header2.style[ionic.CSS.TRANSFORM] = 'scale(' + resizeFactor + ',' + resizeFactor + ')';
                        //header.style.webkitFilter = 'blur(' + blurFactor + 'px)';
                        header2.style.webkitFilter = 'blur(' + blurFactor + 'px)';
                    }
                });
            }
        };
    })
;
