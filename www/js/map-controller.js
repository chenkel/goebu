"use strict";

// GLOBAL variables
var originMarker, destinationMarker, userLocationMarker;
var watch;

angular.module("goebu.controllers")

    .controller('MapCtrl', function ($scope, $ionicLoading, $ionicSlideBoxDelegate, $cordovaGeolocation, $ionicNavBarDelegate) {



        var rendererOptions = {
            draggable: true,
            suppressMarkers: true
        };
        var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
        var directionsService = new google.maps.DirectionsService();

        var map;

        var currentBusLines;
        var previousRouteIndex;
        $scope.userHint = '';

        $scope.calcRoute = function () {
            if (originMarker && destinationMarker) {
                console.log("calculating new route");
                $ionicNavBarDelegate.title("Start und Ziel lassen sich jetzt noch verschieben.");

                console.log($scope.userHint, "<-- $scope.userHint");

                $ionicLoading.show({
                    template: 'Route wird berechnet...'
                });
                var request = {
                    origin: originMarker.getPosition(),
                    destination: destinationMarker.getPosition(),
                    travelMode: google.maps.TravelMode.TRANSIT,
                    provideRouteAlternatives: true
                };
                directionsService.route(request, function (response, status) {
                    if (status === google.maps.DirectionsStatus.OK) {

                        directionsDisplay.setDirections(response);
                        console.log(response, "directionsService.route <-- response");
                        $ionicLoading.hide();

                    }
                    else {
                        console.log(status, response, "<-- directionsService.route status response");
                        $ionicLoading.hide();
                    }
                });
            }

        };

        $scope.swapMarkers = function () {
            //originMarker = [destinationMarker, destinationMarker = originMarker][0];

            var tempMarkerPosition = destinationMarker.getPosition();
            destinationMarker.setPosition(originMarker.getPosition());
            originMarker.setPosition(tempMarkerPosition);

            $scope.calcRoute();
        };

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
            $ionicLoading.show({
                template: 'Karte wird initialisiert...'
            });
            console.log("initialize started");
            $ionicNavBarDelegate.title("Wo möchten Sie hin?");

            var myLatlng = new google.maps.LatLng(51.5327604, 9.9352051);

            var mapOptions = {
                center: myLatlng,
                zoom: 15,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDefaultUI: true

            };
            map = new google.maps.Map(document.getElementById("map_canvas"),
                mapOptions);

            var currentLocationControlDiv = document.createElement('div');
            currentLocationControlDiv.className = 'currentLocationControl';
            var currentLocationControl = new CurrentLocation(currentLocationControlDiv, map);

            currentLocationControlDiv.index = 1;
            map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(currentLocationControlDiv);

            directionsDisplay.setMap(map);
            directionsDisplay.setPanel(document.getElementById('directions-panel'));

            google.maps.event.addListener(directionsDisplay, 'directions_changed', function () {
                computeTotalDistance(directionsDisplay.getDirections());
            });

            google.maps.event.addListener(map, 'click', function (event) {
                placeMarker(event.latLng.lat(), event.latLng.lng());
            });

            google.maps.event.addListener(directionsDisplay, 'directions_changed', function () {

                previousRouteIndex = null;
            });

            google.maps.event.addListener(directionsDisplay, 'routeindex_changed', function () {

                directionsDisplayUpdated();

            });

            getCurrentLocationStart();

            $scope.map = map;

            $ionicLoading.hide();
        }

        google.maps.event.addDomListener(window, 'load', initialize);
        console.log("<-- blaaa");

        function placeMarker(lat, lng) {
            if (!destinationMarker) {
                destinationMarker = new google.maps.Marker({
                    position: new google.maps.LatLng(lat, lng),
                    map: map,
                    draggable: true,
                    optimized: false,
                    zIndex: -1,
                    icon: 'img/destination.png'
                });
                // setup drag event for destination marker
                google.maps.event.addListener(destinationMarker, 'dragend', function () {
                    $scope.calcRoute();
                });
            } else {
                destinationMarker.setPosition(new google.maps.LatLng(lat, lng));
            }
            $scope.calcRoute();
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
                //    TODO: set standard marker
            });
        };

        //Aktuelle Position

        function getCurrentLocationStart() {

            $cordovaGeolocation
                .getCurrentPosition()
                .then(function (position) {

                    var lat = position.coords.latitude;
                    var long = position.coords.longitude;
                    console.log("<-- getCurrentLocationStart getCurrentPosition FOUND");
                    setUserLocationMarker(lat, long);
                }, function (err) {
                    console.error(err, "!!! error: getCurrentPosition");
                });

            var watchOptions = {
                frequency: 1000,
                timeout: 3000,
                enableHighAccuracy: true // may cause errors if true
            };

            watch = $cordovaGeolocation.watchPosition(watchOptions);
            watch.then(
                null,
                function (err) {
                    console.error(err, "!!! error: watchPosition");

                },
                function (position) {
                    var lat = position.coords.latitude;
                    var long = position.coords.longitude;
                    console.log("<-- watchPosition Executed");

                    setUserLocationMarker(lat, long);
                });

            //watch.clearWatch();
            //// OR
            //$cordovaGeolocation.clearWatch(watch)
            //    .then(function (result) {
            //        console.log(result, "<-- clearWatch result, ");
            //    }, function (error) {
            //        // error
            //    });
        }

        function setUserLocationMarker(lat, lng) {
            console.log(lat, lng, "setUserLocationMarker called <-- lat, lng");

            if (!userLocationMarker) {
                console.log("userLocationMarker is not initialised yet");
                var userLocationIcon = new google.maps.MarkerImage(
                    "img/user-location-disambig.png",
                    new google.maps.Size(36, 36),
                    new google.maps.Point(0, 0),
                    new google.maps.Point(18, 18),
                    new google.maps.Size(36, 36)
                );
                userLocationMarker = new google.maps.Marker({
                    position: new google.maps.LatLng(lat, lng),
                    map: map,
                    draggable: false,
                    icon: userLocationIcon
                });
                //when the map zoom changes,
                // resize the icon based on the zoom level
                // so the marker covers the same geographic area
                //google.maps.event.addListener(map, 'zoom_changed', function () {
                //    var minPixelSize = 36; //the size of the icon at zoom level 0
                //    var maxPixelSize = 150; //restricts the maximum size of the icon, otherwise the browser will choke at higher zoom levels trying to scale an image to millions of pixels
                //
                //    var zoom = map.getZoom();
                //    var relativePixelSize = Math.round(Math.pow(1.3, zoom)); // use 2 to the power
                //    // of current zoom to calculate relative pixel size.  Base of exponent is 2 because relative size should double every time you zoom in
                //
                //    //restrict the maximum size of the icon
                //    if (relativePixelSize > maxPixelSize) {
                //        relativePixelSize = maxPixelSize;
                //    }
                //    if (relativePixelSize < minPixelSize) {
                //        relativePixelSize = minPixelSize;
                //    }
                //
                //    //change the size of the icon
                //    userLocationMarker.setIcon(
                //        new google.maps.MarkerImage(
                //            userLocationMarker.getIcon().url, //marker's same icon graphic
                //            null,
                //            new google.maps.Point(0, 0),
                //            new google.maps.Point(relativePixelSize / 2, relativePixelSize / 2),
                //            new google.maps.Size(relativePixelSize, relativePixelSize) //changes the scale
                //        )
                //    );
                //
                //});
            } else {

                if (userLocationMarker.getPosition().lat() !== lat || userLocationMarker.getPosition().lng() !== lng) {
                    console.log("userLocationMarker setting new position");
                    userLocationMarker.setPosition(new google.maps.LatLng(lat, lng));
                }

            }
            if (!originMarker) {
                originMarker = new google.maps.Marker({
                    position: new google.maps.LatLng(lat, lng),
                    map: map,
                    draggable: true,
                    icon: 'img/origin.png'
                });
                google.maps.event.addListener(originMarker, 'dragend', function () {
                    //alert('originMarker dragged');
                    $scope.calcRoute();
                });
                // falls destinationMarker schon gesetzt ist...
                if (destinationMarker) {
                    $scope.calcRoute();
                }

            }
        }

        function CurrentLocation(controlDiv, map) {

            // Set CSS for the control border
            var controlUI = document.createElement('div');
            controlUI.className = 'currentLocationcontrolUI';
            controlUI.title = 'Click to recenter the map';

            controlDiv.appendChild(controlUI);

            // Set CSS for the control interior
            var controlText = document.createElement('div');
            controlText.className = 'controlTextUI';
            controlText.innerHTML = '<i class="icon ion-pinpoint"></i>';
            controlUI.appendChild(controlText);

            // Setup the click event listeners: simply set the map to
            // Chicago
            google.maps.event.addDomListener(controlUI, 'click', function () {
                map.setCenter(userLocationMarker.position);
            });

        }

        //function animateUIToSecondStage() {
        //    $scope.isSecondStage = true;
        //    //angular.element(".map-wrapper").animate({
        //    //    height: '50%',
        //    //    minHeight: '50%'
        //    //}, 1500, function () {
        //    //    google.maps.event.trigger(map, 'resize');
        //    //});
        //}

        function directionsDisplayUpdated() {
            var routeIndex = directionsDisplay && directionsDisplay.hasOwnProperty('routeIndex') ? directionsDisplay.routeIndex : null;
            if (previousRouteIndex !== routeIndex) {
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

    });