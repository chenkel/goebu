"use strict";
//var host = "http://goebu.christopherhenkel.de:3000/";
var host = "http://localhost:3000/";

var live_bus_position_timer;

angular
    .module("starter.controllers", ["ionic", "ngMap"])
    .controller("HaltestellenCtrl", function ($scope, $ionicLoading, $ionicModal, $http, $stateParams, $timeout) {
        $scope.$on('mapInitialized', function(event, map) {
            $scope.map = map;
            getStops();
        });

        var url = "";
        var route_id = null;
        $scope.direction_id = 1;

        if (!$stateParams.buslinienId) {
            $stateParams.buslinienId = route_id;
            $scope.title = "Alle Haltestellen";
        } else {
            route_id = $stateParams.buslinienId;
            $scope.title = "Haltestellen der Linie " + route_id;
        }

        var liveBusPositions = [];
        var stop_markers = [];
        var live_bus_bounds = new google.maps.LatLngBounds();
        var bounds;





        function clear_markers(markerArray) {
            for (var i = 0; i < markerArray.length; i++) {
                markerArray[i].setMap(null);
            }
             markerArray.length = 0;
            return markerArray;
        }

        function addStopsToMap(data) {

            bounds = new google.maps.LatLngBounds();
            var stops = data.stops[$scope.direction_id];

            var stop;
            for (var i = 0, len = stops.length; i < len; i++) {
                stop = stops[i];

                stop_markers[i] = new google.maps.Marker({
                    title: stop.stop_name,
                    position: new google.maps.LatLng(stop.stop_lat, stop.stop_lon),
                    icon: "img/bushaltestelle.png",
                    stop_name: stop.stop_name,
                    stop_desc: stop.stop_desc,
                    stop_id: stop.stop_id,
                    stop_lat: stop.stop_lat,
                    stop_lon: stop.stop_lon,
                    map: $scope.map
                });

                google.maps.event.addListener(
                    stop_markers[i], "click", $scope.markerClicked.bind(null, i));
                bounds.extend(new google.maps.LatLng(stop.stop_lat, stop.stop_lon));
            }
            //$scope.map.fitBounds(bounds);
        }

        function getStops() {
            url = host + "api/stops/goevb/route/" + route_id + "/direction/" + $scope.direction_id;

            $http.get(url)
                .success(function (data) {
                    if (data) {
                        stop_markers = clear_markers(stop_markers);
                        addStopsToMap(data);
                    }
                    else {
                        console.log("no data");
                        stop_markers = [];
                    }
                }.bind($scope));
        }

        function restartLiveBusTimer() {
            $timeout.cancel(live_bus_position_timer);
            $scope.updateBusMarker(function () {
                $scope.map.fitBounds(live_bus_bounds);
            });
            $scope.startLiveBusMarker();
        }

        $scope.markerClicked = function (index) {
            $scope.selected_stop = stop_markers[index];
            live_bus_bounds = new google.maps.LatLngBounds();
            live_bus_bounds.extend(new google.maps.LatLng(stop_markers[index].stop_lat, stop_markers[index].stop_lon));

            restartLiveBusTimer();
            $scope.getStopTimes(function () {
            });
        }.bind($scope);

        $scope.changeDirection = function () {

            $scope.direction_id = $scope.direction_id === 1 ? 2 : 1;
            getStops();



            if ($scope.selected_stop && $scope.selected_stop.stop_id) {
                restartLiveBusTimer();
            }

        };

        $scope.getStopTimes = function (cb) {
            // only show human readable format HH:MM
            $http.get(host + "api/times/goevb/route/" +
            route_id + "/direction/" + $scope.direction_id + "/stop/" + $scope.selected_stop.stop_id)
                .success(function (data) {
                    if (data !== null) {
                        if (!data.times || data.times.length < 1) {
                            console.log("data.times empty");
                        }
                        $scope.selected_stop.times = data.times;

                        cb(null, "times");
                    } else {
                        $scope.selected_stop.times = [];
                        cb("nothing found", "times");
                    }
                }.bind($scope))
                .error(function (error) {
                    console.error(error, "error");
                });
        };

        $scope.updateBusMarker = function (cb) {
            $http.get(host + "api/shapes/goevb/route/" + route_id +
            "/direction/" + $scope.direction_id +
            "/stop/" + $scope.selected_stop.stop_id)
                .success(function (result) {
                    if (result.live_sequences && result.live_sequences.length > 0) {
                        var data = result.live_sequences;
                        var nData = data.length;
                        var nPreviousData = liveBusPositions.length;

                        // Kürze das Array, wenn das alte Array zu groß ist.
                        if (nPreviousData > nData) {
                            console.log(nPreviousData, "<-- nPreviousData");
                            console.log(nData, "<-- nData");

                            console.log("slicing");
                            var rest_slice = liveBusPositions.slice(nData, nPreviousData);
                            clear_markers(rest_slice);
                            liveBusPositions = liveBusPositions.slice(0, nData);
                        }

                        for (var j = 0, len2 = data.length; j < len2; j++) {
                            if (cb) {
                                live_bus_bounds.extend(new google.maps.LatLng(data[j].lat, data[j].lon));
                            }
                            if (nPreviousData > 0 && j < nPreviousData) {
                                liveBusPositions[j].setPosition(new google.maps.LatLng(data[j].lat, data[j].lon));
                            } else {
                                liveBusPositions[j] = new google.maps.Marker({
                                    title: "yipeeee",
                                    position: new google.maps.LatLng(data[j].lat, data[j].lon),
                                    icon: "img/bus.png",
                                    map: $scope.map,
                                    zIndex: 1000
                                });
                            }
                        }
                        if (cb) {
                            cb();
                        }
                    } else {
                        liveBusPositions = clear_markers(liveBusPositions);
                        console.log("No live bus information available");
                    }
                }.bind($scope))
                .error(function (error) {
                    console.error(error, "error");
                });
        };

        $scope.startLiveBusMarker = function () {
            // Function to replicate setInterval using $timeout service.
            live_bus_position_timer = $timeout(function () {
                $scope.updateBusMarker();
                $scope.startLiveBusMarker();
            }.bind($scope), 3000);
        };

        $ionicModal.fromTemplateUrl("templates/stop-time-modal.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (modal) {
            $scope.modal = modal;
        }.bind($scope));
        $scope.openModal = function () {
            $scope.modal.show();
        };
        $scope.closeModal = function () {
            $scope.modal.hide();
        };

        $scope.$on("$destroy", function () {
            //Cleanup the modal when we"re done with it!
            $scope.modal.remove();
        });

        $scope.$on("modal.hidden", function () {
            // Execute action on hide modal
        });

        $scope.$on("modal.removed", function () {
            // Execute action on remove modal
        });

    })

    .
    controller("AppCtrl", function ($scope, $timeout, $ionicSideMenuDelegate) {

        $scope.toggleLeftSideMenu = function () {
            //$timeout.cancel(live_bus_position_timer);
            $ionicSideMenuDelegate.toggleLeft();
        };

    })

;
