angular.module('starter.controllers', ['ngMap'])

    .controller('AppCtrl', function () {

    })

    .controller('HaltestellenCtrl', function ($scope, $ionicLoading, $compile, $http, $stateParams) {
        var self = this;

        var buslinienId = $stateParams.buslinienId;
        var url = 'http://goebu.christopherhenkel.de:3000/api/stops/goevb/' + buslinienId + '/0';
        self.title = 'Haltestellen der Linie ' + buslinienId;

        if (buslinienId == null) {
            self.title = 'Alle Haltestellen';
            url = 'http://goebu.christopherhenkel.de:3000/api/stopsNearby/51.5327604/9.9352051/10';
        }

        self.chosenMarker = 'Wählen Sie eine Zielhaltestelle';
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

        this.markerClicked = function (ev, index) {
            self.chosenMarker = self.markers[index].stop_name;
        };
    });
