//const host = 'http://goebu.christopherhenkel.de:3000/';
const host = 'http://localhost:3000/';

angular.module('starter.controllers', ['ngMap'])

    .controller('AppCtrl', function () {

    })

    .controller('HaltestellenCtrl', function ($scope, $ionicLoading, $ionicModal, $compile, $http, $stateParams) {
        var self = this;

        var buslinienId = $stateParams.buslinienId;

        var url = host + 'api/stops/goevb/' + buslinienId + '/0';
        self.title = 'Haltestellen der Linie ' + buslinienId;

        if (buslinienId == null) {
            self.title = 'Alle Haltestellen';
            url = host + 'api/stopsNearby/51.5327604/9.9352051/10';
            buslinienId = 0;
        }

        self.stop = {};
        self.stop.selected = {};
        self.stop.selected.stop_name = 'Wählen Sie eine Zielhaltestelle';

        self.markers = [];

        $scope.$on('mapInitialized', function (event, map) {
            $http.get(url).success(function (data) {
                if (data != null) {
                    self.markers = data[0].stops;
                } else {
                    self.markers = [];
                }
            });
        });

        self.markerClicked = function (ev, index) {
            self.stop.selected = self.markers[index];
            self.getStopTimes(function () {
            });
        };

        self.getStopTimes = function (cb) {
            $http.get(host + 'api/times/goevb/route/' +
            buslinienId + '/stop/' + self.stop.selected.stop_id)
                .success(function (data) {
                    if (data != null) {
                        self.stop.selected.times = data;
                        cb(null, 'times');
                    } else {
                        self.stop.selected.times = [];
                        cb('nothing found', 'times');
                    }
                });
        };

        $ionicModal.fromTemplateUrl('templates/stop-time-modal.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modal = modal;
        });
        self.openModal = function () {
            $scope.modal.show();
        };
        self.closeModal = function () {
            $scope.modal.hide();
        };
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            $scope.modal.remove();
        });
        // Execute action on hide modal
        $scope.$on('modal.hidden', function () {
            // Execute action
        });
        // Execute action on remove modal
        $scope.$on('modal.removed', function () {
            // Execute action
        });


        self.addBusMarker = function(cb) {
            $http.get(host + 'api/shapes/goevb/stop/' + self.stop.selected.stop_id + '/direction/0')
                .success(function (data) {
                    if (data != null) {
                        console.log(data, "data");
                        for (var i in data) {
                            if (data.hasOwnProperty(i)){
                                var tmp = {};
                                tmp.stop_lat = data[i].lat;
                                tmp.stop_lon = data[i].lon;
                                tmp.stop_name = 'yipeeee';
                                self.markers.push(tmp);
                            }
                        }

                        //self.stop.selected.times = data;
                        //cb(null, 'addBusMarker');
                    } else {
                        //self.stop.selected.times = [];
                        //cb('nothing found', 'addBusMarker');
                    }
                });
        }

    })
;
