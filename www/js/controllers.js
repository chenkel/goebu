//const host = 'http://goebu.christopherhenkel.de:3000/';
const host = 'http://localhost:3000/';

angular.module('starter.controllers', ['ngMap'])
    .controller('HaltestellenCtrl', function ($scope, $ionicLoading, $ionicModal, $compile, $http, $stateParams, $timeout) {
        var buslinienId = $stateParams['buslinienId'];
        var direction_id = 0;

        var url = host + 'api/stops/goevb/' + buslinienId + '/0';
        $scope.title = 'Haltestellen der Linie ' + buslinienId;

        if (buslinienId == null) {
            $scope.title = 'Alle Haltestellen';
            url = host + 'api/stopsNearby/51.5327604/9.9352051/10';
            buslinienId = 0;
        }

        var liveBusPositions = [];
        var bushaltestellen = [];
        var live_bus_bounds = new google.maps.LatLngBounds();
        var map;

        $scope.$on('mapInitialized', function (event, gmap) {
            map = gmap;

            $http.get(url)
                .success(function (data) {
                    if (data != null) {
                        var bounds = new google.maps.LatLngBounds();
                        var haltestellen = data[direction_id].stops;
                        for (var i in haltestellen) {
                            if (haltestellen.hasOwnProperty(i)) {

                                bushaltestellen[i] = new google.maps.Marker({
                                    title: haltestellen[i].stop_name,
                                    position: new google.maps.LatLng(haltestellen[i].stop_lat, haltestellen[i].stop_lon),
                                    icon: 'img/' + haltestellen[i].icon + '.png'
                                });
                                bounds.extend(new google.maps.LatLng(haltestellen[i].stop_lat, haltestellen[i].stop_lon));
                                bushaltestellen[i].setMap(map);
                                bushaltestellen[i].stop_name = haltestellen[i].stop_name;
                                bushaltestellen[i].stop_id = haltestellen[i].stop_id;
                                bushaltestellen[i].stop_lat = haltestellen[i].stop_lat;
                                bushaltestellen[i].stop_lon = haltestellen[i].stop_lon;
                                google.maps.event.addListener(bushaltestellen[i], 'click', $scope.markerClicked.bind(null, i));
                            }
                        }
                        map.fitBounds(bounds);
                    }
                    else {
                        bushaltestellen = [];
                    }
                }.bind($scope));
        }.bind($scope));

        $scope.markerClicked = function (index) {
            //console.log($scope.bushaltestellen[index], "$scope.bushaltestellen[index]");
            $scope.selected_stop = bushaltestellen[index];

            $timeout.cancel($scope.live_bus_position_timer);
            live_bus_bounds = new google.maps.LatLngBounds();
            live_bus_bounds.extend(new google.maps.LatLng(bushaltestellen[index]['stop_lat'], bushaltestellen[index]['stop_lon']));
            $scope.updateBusMarker(function (bounds) {
                map.fitBounds(live_bus_bounds);
            });
            $scope.startLiveBusMarker();


            $scope.getStopTimes(function () {
            });
        }.bind($scope);

        $scope.getStopTimes = function (cb) {
            // only show human readable format HH:MM
            $http.get(host + 'api/times/goevb/route/' +
            buslinienId + '/stop/' + $scope.selected_stop.stop_id)
                .success(function (data) {
                    if (data != null) {

                        $scope.selected_stop.times = data;

                        //console.log($scope.selected_stop, "$scope.selected_stop");
                        cb(null, 'times');
                    } else {
                        $scope.selected_stop.times = [];
                        cb('nothing found', 'times');
                    }
                }.bind($scope));
        };


        $scope.updateBusMarker = function (cb) {
            $http.get(host + 'api/shapes/goevb/stop/' + $scope.selected_stop.stop_id + '/direction/0')
                .success(function (data) {
                    if (data != null) {
                        var nData = data.length;
                        var nPreviousData = liveBusPositions.length;

                        // Kürze das Array, wenn das alte Array zu groß ist.
                        if (nPreviousData > nData) {
                            console.log(nPreviousData, "nPreviousData");
                            console.log(nData, "nData");
                            var rest_slice = liveBusPositions.slice(nData, nPreviousData);
                            console.log(rest_slice, "rest_slice");
                            for (var r in rest_slice){
                                if (rest_slice.hasOwnProperty(r)){
                                    rest_slice[r].setMap(null);
                                }
                            }

                            liveBusPositions = liveBusPositions.slice(0, nData);
                            console.log(liveBusPositions, "liveBusPositions");
                        }

                        for (var i in data) {
                            if (data.hasOwnProperty(i)) {
                                if (cb) live_bus_bounds.extend(new google.maps.LatLng(data[i]['lat'], data[i]['lon']));
                                if (i < nPreviousData) {

                                    liveBusPositions[i].setPosition(new google.maps.LatLng(data[i]['lat'], data[i]['lon']));
                                } else {

                                    liveBusPositions[i] = new google.maps.Marker({
                                        title: 'yipeeee',
                                        position: new google.maps.LatLng(data[i]['lat'], data[i]['lon']),
                                        icon: 'img/bus.png'
                                    });
                                    liveBusPositions[i].setZIndex(1000);
                                    liveBusPositions[i].setMap(map);
                                }
                            }
                        }
                        if (cb) cb();
                    }
                }.bind($scope));
        };


        $scope.startLiveBusMarker = function () {
            // Function to replicate setInterval using $timeout service.
            $scope.live_bus_position_timer = $timeout(function () {
                $scope.updateBusMarker();
                $scope.startLiveBusMarker();
            }.bind($scope), 3000);
            //console.log(JSON.stringify($scope.liveBusPositions), "JSON.stringify($scope.liveBusPositions)");
        };

        $ionicModal.fromTemplateUrl('templates/stop-time-modal.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modal = modal;
        }.bind($scope));
        $scope.openModal = function () {
            $scope.modal.show();
        };
        $scope.closeModal = function () {
            $scope.modal.hide();
        };

        $scope.$on('$destroy', function () {
            //Cleanup the modal when we're done with it!
            $scope.modal.remove();
        });

        $scope.$on('modal.hidden', function () {
            // Execute action on hide modal
        });

        $scope.$on('modal.removed', function () {
            // Execute action on remove modal
        });

    })

    .controller('AppCtrl', function () {

    })

;
