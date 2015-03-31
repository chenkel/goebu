"use strict";
var host = "http://goebu.christopherhenkel.de:3000/";
//var host = "http://localhost:3000/";

//$compile
angular.module("starter.controllers", ["ngMap"])
    .controller("HaltestellenCtrl", function ($scope, $ionicLoading, $ionicModal, $http, $stateParams, $timeout) {
        var url = "";
        var route_id = 22;
        $scope.direction_id = 1;

        if (!$stateParams.buslinienId) {
            $stateParams.buslinienId = 0;
            $scope.title = "Alle Haltestellen";
            url = host + "api/stopsNearby/51.5327604/9.9352051/10";
        } else {
            route_id = $stateParams.buslinienId;
            url = host + "api/stops/goevb/route/" + route_id + "/direction/" + $scope.direction_id;
            $scope.title = "Haltestellen der Linie " + route_id;
        }


        var liveBusPositions = [];
        var stop_markers = [];
        var live_bus_bounds = new google.maps.LatLngBounds();
        var map;

        $scope.$on("mapInitialized", function (event, gmap) {
            map = gmap;

            $http.get(url)

                .success(function (data) {
                    if (data) {

                        var bounds = new google.maps.LatLngBounds();
                        var stops = data.stops[$scope.direction_id];
                        for (var i = 0, len = stops.length; i < len; i++) {
                            stop_markers[i] = new google.maps.Marker({
                                title: stops[i].stop_name,
                                position: new google.maps.LatLng(stops[i].stop_lat, stops[i].stop_lon),
                                icon: "img/bushaltestelle.png"
                            });
                            bounds.extend(new google.maps.LatLng(stops[i].stop_lat, stops[i].stop_lon));
                            stop_markers[i].setMap(map);
                            stop_markers[i].stop_name = stops[i].stop_name;
                            stop_markers[i].stop_desc = stops[i].stop_desc;
                            stop_markers[i].stop_id = stops[i].stop_id;
                            stop_markers[i].stop_lat = stops[i].stop_lat;
                            stop_markers[i].stop_lon = stops[i].stop_lon;
                            google.maps.event.addListener(
                                stop_markers[i], "click", $scope.markerClicked.bind(null, i));
                        }
                        map.fitBounds(bounds);
                    }
                    else {
                        stop_markers = [];
                    }
                }.bind($scope));
        }.bind($scope));

        $scope.markerClicked = function (index) {
            $scope.selected_stop = stop_markers[index];

            $timeout.cancel($scope.live_bus_position_timer);
            live_bus_bounds = new google.maps.LatLngBounds();
            live_bus_bounds.extend(new google.maps.LatLng(stop_markers[index].stop_lat, stop_markers[index].stop_lon));
            $scope.updateBusMarker(function () {
                map.fitBounds(live_bus_bounds);
            });
            $scope.startLiveBusMarker();

            $scope.getStopTimes(function () {
            });
        }.bind($scope);

        $scope.changeDirection = function () {
            if ($scope.direction_id === 1){
                $scope.direction_id = 2;
            } else {
                $scope.direction_id = 1;
            }

            if($scope.selected_stop && $scope.selected_stop.stop_id){
                $timeout.cancel($scope.live_bus_position_timer);
                $scope.updateBusMarker(function () {
                    map.fitBounds(live_bus_bounds);
                });
                $scope.startLiveBusMarker();
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

                        //console.log($scope.selected_stop, "$scope.selected_stop");
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
                            console.log(nPreviousData, "nPreviousData");
                            console.log(nData, "nData");
                            var rest_slice = liveBusPositions.slice(nData, nPreviousData);
                            console.log(rest_slice, "rest_slice");
                            for (var i = 0, len = rest_slice.length; i < len; i++) {
                                rest_slice[i].setMap(null);
                            }

                            liveBusPositions = liveBusPositions.slice(0, nData);
                            console.log(liveBusPositions, "liveBusPositions");
                        }

                        for (var j = 0, len2 = data.length; j < len2; j++) {

                            if (cb) {
                                live_bus_bounds.extend(new google.maps.LatLng(data[j].lat, data[j].lon));
                            }
                            if (j < nPreviousData) {
                                liveBusPositions[j].setPosition(new google.maps.LatLng(data[j].lat, data[j].lon));
                            } else {
                                liveBusPositions[j] = new google.maps.Marker({
                                    title: "yipeeee",
                                    position: new google.maps.LatLng(data[j].lat, data[j].lon),
                                    icon: "img/bus.png"
                                });
                                liveBusPositions[j].setZIndex(1000);
                                liveBusPositions[j].setMap(map);
                            }
                        }
                        if (cb) {
                            cb();
                        }
                    } else {
                        for (var k = 0, len3 = liveBusPositions.length; k < len3; k++) {
                            liveBusPositions[k].setMap(null);
                        }
                        console.log("No live bus information available");
                    }
                }.bind($scope))
                .error(function (error) {
                    console.error(error, "error");
                });
        };

        $scope.startLiveBusMarker = function () {
            // Function to replicate setInterval using $timeout service.
            $scope.live_bus_position_timer = $timeout(function () {
                $scope.updateBusMarker();
                $scope.startLiveBusMarker();
            }.bind($scope), 3000);
            //console.log(JSON.stringify($scope.liveBusPositions), "JSON.stringify($scope.liveBusPositions)");
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
    controller("AppCtrl", function () {

    })

;
