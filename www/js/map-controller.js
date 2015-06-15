"use strict";
angular.module("goebu.controllers")

    .controller('MapCtrl', function ($scope, $ionicLoading, $ionicSlideBoxDelegate) {

        // GLOBAL variables
        var rendererOptions = {
            draggable: true,
            suppressMarkers: true
        };
        var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
        var directionsService = new google.maps.DirectionsService();

        var originMarker, destinationMarker;
        var map;

        var currentBusLines;
        var previousRouteIndex;

        function test() {
        }

        function make_array_unique(arr) {
            var n = {}, r = [];
            for (var i = 0; i < arr.length; i++) {
                if (!n[arr[i]]) {
                    n[arr[i]] = true;
                    r.push(arr[i]);
                }
            }
            return r;
        }

        function initialize() {
            console.log("<-- map-controller initialize called");
            var myLatlng = new google.maps.LatLng(51.5327604, 9.9352051);

            var mapOptions = {
                center: myLatlng,
                zoom: 16,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDefaultUI: true

            };
            map = new google.maps.Map(document.getElementById("map_canvas"),
                mapOptions);

            directionsDisplay.setMap(map);
            directionsDisplay.setPanel(document.getElementById('directions-panel'));

            google.maps.event.addListener(directionsDisplay, 'directions_changed', function () {
                computeTotalDistance(directionsDisplay.getDirections());
                test();
            });

            originMarker = new google.maps.Marker({
                position: new google.maps.LatLng(51.547750, 9.945073),
                map: map,
                draggable: true,
                icon: 'img/origin.png'
            });

            destinationMarker = new google.maps.Marker({
                position: new google.maps.LatLng(51.530426, 9.948249),
                map: map,
                draggable: true,
                icon: 'img/destination.png'
            });

            //google.maps.event.addListener(map, 'click', function (event) {
            //    placeMarker(event.latLng);
            //});

            google.maps.event.addListener(originMarker, 'dragend', function () {
                //alert('originMarker dragged');
                calcRoute();
            });
            google.maps.event.addListener(destinationMarker, 'dragend', function () {
                //alert('destinationMarker dragged');
                calcRoute();
            });

            google.maps.event.addListener(directionsDisplay, 'directions_changed', function () {
                console.log("----- directions_changed fired");
                previousRouteIndex = null;
            });

            google.maps.event.addListener(directionsDisplay, 'routeindex_changed', function () {
                console.log("----- routeindex_changed fired");

                directionsDisplayUpdated();

            });

            calcRoute();

            $scope.map = map;
        }

        google.maps.event.addDomListener(window, 'load', initialize);

        //function placeMarker(location) {
        //    var marker = new google.maps.Marker({
        //        position: location,
        //        draggable: true,
        //        map: map
        //    });
        //
        //    map.setCenter(location);
        //}

        function directionsDisplayUpdated() {
            var routeIndex = directionsDisplay && directionsDisplay.hasOwnProperty('routeIndex') ? directionsDisplay.routeIndex : null;
            if (previousRouteIndex !== routeIndex){
                findBusLines(directionsDisplay);
            }
            previousRouteIndex = routeIndex;
        }

        function findBusLines(object) {
            var routeIndex = directionsDisplay && directionsDisplay.hasOwnProperty('routeIndex') ? directionsDisplay.routeIndex : null;

            function hasNeededProperty(object) {
                if (object.hasOwnProperty('routes')) {
                    return object;

                } else if (object.hasOwnProperty('directions')) {
                    if (object.directions.hasOwnProperty('routes')) {
                        return object.directions;
                    }
                } else {
                    return null;
                }
            }

            var tmpObj = hasNeededProperty(object);
            currentBusLines = [];
            if (tmpObj !== null) {
                if (routeIndex !== null) {
                    var route = tmpObj.routes[routeIndex];
                    if (route.hasOwnProperty('legs')) {
                        for (var j = 0, len1 = route.legs.length; j < len1; j++) {
                            var leg = route.legs[j];
                            if (leg.hasOwnProperty('steps')) {
                                for (var k = 0, len2 = leg.steps.length; k < len2; k++) {
                                    var step = leg.steps[k];
                                    if (step.hasOwnProperty('travel_mode')) {
                                        if (step.travel_mode === "TRANSIT") {
                                            currentBusLines.push(step.transit.line.short_name);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    currentBusLines = make_array_unique(currentBusLines);
                    console.log(currentBusLines, "<-- currentBusLines");
                }
            }
        }

        function calcRoute() {

            var request = {
                origin: originMarker.getPosition(),
                destination: destinationMarker.getPosition(),
                travelMode: google.maps.TravelMode.TRANSIT,
                provideRouteAlternatives: true
            };
            directionsService.route(request, function (response, status) {
                if (status === google.maps.DirectionsStatus.OK) {
                    console.log(response, "<-- response");
                    
                    directionsDisplay.setDirections(response);
                }
            });
        }

        function computeTotalDistance(result) {
            var total = 0;
            var myroute = result.routes[0];
            for (var i = 0; i < myroute.legs.length; i++) {
                total += myroute.legs[i].distance.value;
            }
            total = total / 1000.0;
        }

        $scope.centerOnMe = function () {
            if (!$scope.map) {
                return;
            }

            $scope.loading = $ionicLoading.show({
                content: 'Getting current location...',
                showBackdrop: false
            });

            navigator.geolocation.getCurrentPosition(function (pos) {
                $scope.map.setCenter(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
                $scope.loading.hide();
            }, function (error) {
                alert('Unable to get location: ' + error.message);
            });
        };

        $scope.clickTest = function () {
            alert('Example of infowindow with ng-click');
        };
    });