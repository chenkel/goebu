"use strict";
angular.module("goebu.controllers")

    .controller('MapCtrl', function ($scope, $ionicLoading, $ionicSlideBoxDelegate, $cordovaGeolocation) {

        // GLOBAL variables
        var rendererOptions = {
            draggable: true,
            suppressMarkers: true
        };
        var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
        var directionsService = new google.maps.DirectionsService();

        var originMarker, destinationMarker, userLocationMarker;
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
                zoom: 15,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDefaultUI: true

            };
            map = new google.maps.Map(document.getElementById("map_canvas"),
                mapOptions);

            var currentLocationControlDiv = document.createElement('div');
            currentLocationControlDiv.style.paddingRight = '10px';
            currentLocationControlDiv.style.paddingTop = '10px';
            var currentLocationControl = new CurrentLocation(currentLocationControlDiv, map);

            currentLocationControlDiv.index = 1;
            map.controls[google.maps.ControlPosition.TOP_RIGHT].push(currentLocationControlDiv);

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
                optimized: false,
                zIndex: -10,
                icon: 'img/origin.png'
            });

            destinationMarker = new google.maps.Marker({
                //position: new google.maps.LatLng(51.530426, 9.948249),
                map: map,
                draggable: true,
                optimized: false,
                zIndex: -1,
                icon: 'img/destination.png'
            });

            google.maps.event.addListener(map, 'click', function (event) {
                placeMarker(event.latLng);
            });

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
            getCurrentLocationStart();

            $scope.title = "Wo möchten Sie hin?";

            $scope.map = map;
        }

        google.maps.event.addDomListener(window, 'load', initialize);



        function placeMarker(location) {
            destinationMarker.setPosition(location);
            calcRoute();
        }

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

        /* Aktuelle Position
         //
         //
         */
        var watch;

        function getCurrentLocationStart() {
            var posOptions = {timeout: 10000, enableHighAccuracy: false};
            $cordovaGeolocation
                .getCurrentPosition(posOptions)
                .then(function (position) {

                    var lat = position.coords.latitude;
                    var long = position.coords.longitude;
                    setUserLocationMarker(lat, long);
                }, function (err) {
                    console.error(err, "!!! error: getCurrentPosition");
                });

            var watchOptions = {
                frequency: 1000,
                timeout: 6000,
                enableHighAccuracy: false // may cause errors if true
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
            if (!userLocationMarker) {
                originMarker.setPosition(new google.maps.LatLng(lat, lng));
                map.setCenter(originMarker.position);
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
                    icon: userLocationIcon,
                    optimized: false,
                    zIndex: -99
                });
                //when the map zoom changes,
                // resize the icon based on the zoom level
                // so the marker covers the same geographic area
                google.maps.event.addListener(map, 'zoom_changed', function () {
                    var minPixelSize = 36; //the size of the icon at zoom level 0
                    var maxPixelSize = 150; //restricts the maximum size of the icon, otherwise the browser will choke at higher zoom levels trying to scale an image to millions of pixels

                    var zoom = map.getZoom();
                    var relativePixelSize = Math.round(Math.pow(1.3, zoom)); // use 2 to the power
                    // of current zoom to calculate relative pixel size.  Base of exponent is 2 because relative size should double every time you zoom in

                    //restrict the maximum size of the icon
                    if (relativePixelSize > maxPixelSize) {
                        relativePixelSize = maxPixelSize;
                    }
                    if (relativePixelSize < minPixelSize) {
                        relativePixelSize = minPixelSize;
                    }

                    //change the size of the icon
                    userLocationMarker.setIcon(
                        new google.maps.MarkerImage(
                            userLocationMarker.getIcon().url, //marker's same icon graphic
                            null,
                            new google.maps.Point(0, 0),
                            new google.maps.Point(relativePixelSize / 2, relativePixelSize / 2),
                            new google.maps.Size(relativePixelSize, relativePixelSize) //changes the scale
                        )
                    );

                });
            } else {
                userLocationMarker.setPosition(new google.maps.LatLng(lat, lng));
            }
        }

        function CurrentLocation(controlDiv, map) {

            // Set CSS for the control border
            var controlUI = document.createElement('div');
            controlUI.style.backgroundColor = 'rgba(255, 255, 255, 0.55)';
            //controlUI.style.border = '2px solid #fff';
            controlUI.style.borderRadius = '34px';
            controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
            controlUI.style.cursor = 'pointer';
            controlUI.style.marginBottom = '22px';
            controlUI.style.textAlign = 'center';
            controlUI.title = 'Click to recenter the map';
            controlUI.style.width = '44px';
            controlUI.style.height = '44px';

            controlDiv.appendChild(controlUI);

            // Set CSS for the control interior
            var controlText = document.createElement('div');
            controlText.style.color = 'rgb(25,25,25)';
            controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
            controlText.style.fontSize = '16px';
            controlText.style.lineHeight = '44px';
            controlText.style.paddingLeft = '5px';
            controlText.style.paddingRight = '5px';
            controlText.innerHTML = '<i class="icon ion-pinpoint"></i>';
            controlUI.appendChild(controlText);

            // Setup the click event listeners: simply set the map to
            // Chicago
            google.maps.event.addDomListener(controlUI, 'click', function () {
                map.setCenter(userLocationMarker.position);
            });

        }
    });