"use strict";

// GLOBAL variables
var originMarker, destinationMarker, userLocationMarker;
var departureOrArrivalTime, isDeparture;
var live_bus_position_timer, live_bus_bounds;
var liveBusPositions = [];
var routePaths = [];
var clickMapEventHandler;

angular.module("goebu.controllers").controller('MapCtrl', function ($scope, $ionicLoading, $ionicSlideBoxDelegate, $cordovaGeolocation, $ionicNavBarDelegate, $ionicPlatform, $cordovaDatePicker, $cordovaDialogs, $http, $timeout, busRadar) {

        var rendererOptions = {
            draggable: true,
            suppressMarkers: true
        };
        var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
        var directionsService = new google.maps.DirectionsService();

        var map;
        var mapCanvasDiv, scrollDiv, mapWrapperDiv;

        var currentBusLines;
        var routeIndexChanged, previousRouteIndex;
        var isIOS = ionic.Platform.isIOS();
        var isAndroid = ionic.Platform.isAndroid();

        $scope.routeCalculated = false;

        var confirmButtons = ['Abfahrt', 'Ankunft', 'Auf aktuelle Zeit zurücksetzen'];

        $scope.setTime = function () {

            $cordovaDialogs.confirm('Möchten Sie die Abfahrts- oder Ankunftzeit ändern?', 'Zeit', confirmButtons)
                .then(function (buttonIndex) {
                    // no button = 0, 'OK' = 1, 'Cancel' = 2
                    switch (buttonIndex) {
                        case 1:
                            isDeparture = true;
                            displayTimePicker();
                            break;
                        case 2:
                            isDeparture = false;
                            displayTimePicker();
                            break;
                        case 3:
                            isDeparture = true;
                            departureOrArrivalTime = new Date();
                            $scope.calcRoute();
                            break;
                    }
                });

        };

        function displayTimePicker() {
            var timePickerDate = (departureOrArrivalTime) ? departureOrArrivalTime : new Date();
            var displayTimePickerOptions = {
                mode: 'datetime', // or 'time'
                date: timePickerDate,
                minDate: moment().subtract(100, 'years').toDate(),
                allowOldDates: true,
                allowFutureDates: true,
                doneButtonLabel: 'Route berechnen',
                doneButtonColor: '#0000FF',
                cancelButtonLabel: 'Abbrechen',
                cancelButtonColor: '#000000',
                is24Hour: true,
                nowText: "Jetzt"
                //okText: 'Ok',
                //cancelText: "Abbrechen"

            };
            if (isAndroid) {
                //timePickerDate = timePickerDate.valueOf();
                displayTimePickerOptions.mode = 'time';
                displayTimePickerOptions.minDate = displayTimePickerOptions.minDate.valueOf();
            }

            $cordovaDatePicker.show(displayTimePickerOptions).then(function (date) {
                //alert(date);
                if (date) {
                    departureOrArrivalTime = date;
                    $scope.calcRoute();
                }

            });
        }

        $scope.calcRoute = function () {
            if (originMarker && destinationMarker) {
                console.log("calculating new route");

                $ionicLoading.show({
                    template: 'Route wird berechnet...'
                });
                var request = {
                    origin: originMarker.getPosition(),
                    destination: destinationMarker.getPosition(),
                    travelMode: google.maps.TravelMode.TRANSIT,
                    provideRouteAlternatives: true
                };
                if (departureOrArrivalTime) {
                    if (isDeparture) {
                        request.transitOptions = {departureTime: departureOrArrivalTime};
                    } else if (isDeparture === false) {
                        request.transitOptions = {arrivalTime: departureOrArrivalTime};
                    }
                }
                directionsService.route(request, function (response, status) {
                    if (status === google.maps.DirectionsStatus.OK) {

                        directionsDisplay.setDirections(response);
                        console.log(response, "directionsService.route <-- response");
                        $scope.routeCalculated = true;
                        var titleText = 'Route';
                        if (response.hasOwnProperty('routes')) {
                            var nRoutes = response.routes.length;
                            if (nRoutes > 1) {
                                titleText = nRoutes + ' ' + titleText + 'n';
                            } else if (nRoutes === 1) {
                                titleText = nRoutes + ' ' + titleText;
                            }
                        }
                        if (mapCanvasDiv && mapWrapperDiv && scrollDiv) {
                            angular.element(mapCanvasDiv).addClass('second-stage');
                            angular.element(mapWrapperDiv).addClass('second-stage');
                            angular.element(scrollDiv).addClass('second-stage');
                            google.maps.event.trigger(map, 'resize');

                        }
                        titleText = titleText + ' gefunden';
                        $ionicNavBarDelegate.title(titleText);
                        findBusLines(response);
                    }
                    else {
                        console.log(status, response, "<-- directionsService.route status response");
                        if (status === 'ZERO_RESULTS') {
                            $ionicNavBarDelegate.title('Leider keine Route gefunden...');
                        }
                        if (mapCanvasDiv && mapWrapperDiv && scrollDiv) {
                            angular.element(mapCanvasDiv).removeClass('second-stage');
                            angular.element(mapWrapperDiv).removeClass('second-stage');
                            angular.element(scrollDiv).removeClass('second-stage');
                            google.maps.event.trigger(map, 'resize');
                        }

                    }
                    $ionicLoading.hide();

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

        $scope.watchPositionId = null;
        $scope.$on('$destroy', function () {
            $scope.watchPositionID.clearWatch();
            $scope.watchPositionId = null;
        });

        function make_array_unique(arr) {
            var n = {}, r = [];
            for (var i = 0; i < arr.length; i++) {
                if (!n[arr[i].line_id]) {
                    n[arr[i].line_id] = true;
                    r.push(arr[i]);
                }
            }
            return r;
        }

        // bb is the bounding box
        var bb = {};
        //(ix,iy) are its top-left coordinates
        bb.ix = 51.722693;
        bb.iy = 9.627836;
        //and (ax,ay) its bottom-right coordinates.
        bb.ax = 51.459781;
        bb.ay = 10.128727;
        function isInsideOfGoettingenBounds(lat, lng) {
            return (
                lat <= bb.ix &&
                lat >= bb.ax &&
                lng >= bb.iy &&
                lng <= bb.ay
            );
        }

        ionic.Platform.ready(function () {
            $ionicLoading.show({
                template: 'Karte wird initialisiert...'
            });
            initializeMap();
            //console.log(JSON.stringify(stops_fixtures), "<-- stops_fixtures");

        });

        function fixInfoWindow() {
            //keep a reference to the original setPosition-function
            var fx = google.maps.InfoWindow.prototype.setPosition;

//override the built-in setPosition-method
            google.maps.InfoWindow.prototype.setPosition = function () {

                //logAsInternal isn't documented, but as it seems
                //it's only defined for InfoWindows opened on POI's
                if (this.logAsInternal) {
                    google.maps.event.addListenerOnce(this, 'map_changed', function () {
                        var map = this.getMap();
                        //the infoWindow will be opened, usually after a click on a POI
                        if (map) {
                            //trigger the click
                            google.maps.event.trigger(map, 'click', {latLng: this.getPosition()});
                        }
                    });
                }
                //call the original setPosition-method
                fx.apply(this, arguments);
            };
        }

        function initializeMap() {

            var myLatlng = new google.maps.LatLng(51.5327604, 9.9352051);

            fixInfoWindow();

            var mapOptions = {
                center: myLatlng,
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDefaultUI: true
            };
            mapCanvasDiv = document.getElementById("map_canvas");
            scrollDiv = document.getElementsByClassName('scroll');
            mapWrapperDiv = document.getElementsByClassName('map-wrapper');

            map = new google.maps.Map(mapCanvasDiv, mapOptions);

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

            var clickMapEventHandler = google.maps.event.addListener(map, 'click', function (event) {
                placeMarker(event.latLng.lat(), event.latLng.lng());
                google.maps.event.removeListener(clickMapEventHandler);

            });

            //new LongClick(map, 300);
            google.maps.event.addListener(map, 'dblclick', function (event) {
                console.log("<-- working dude");
            });

            google.maps.event.addListener(directionsDisplay, 'directions_changed', function () {
                previousRouteIndex = null;
                routeIndexChanged = false;

            });

            google.maps.event.addListener(directionsDisplay, 'routeindex_changed', function () {
                directionsDisplayUpdated();

            });

            getCurrentLocationStart();

            $scope.map = map;

            $ionicLoading.hide();
            //$scope.userHint = "Wo möchten Sie hin?";
            $ionicNavBarDelegate.align('left');
            $ionicNavBarDelegate.title("Wo möchten Sie hin?");
        }

        function placeMarker(lat, lng) {
            if (!destinationMarker) {
                destinationMarker = new google.maps.Marker({
                    position: new google.maps.LatLng(lat, lng),
                    map: map,
                    draggable: true,
                    zIndex: 100,
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

        var posOptions = {timeout: 10000, enableHighAccuracy: false};
        var watchOptions = {
            frequency: 1000,
            timeout: 3000,
            enableHighAccuracy: false // may cause errors if true
        };

        function getCurrentLocationStart() {

            $cordovaGeolocation
                .getCurrentPosition(posOptions)
                .then(function (position) {
                    var lat = position.coords.latitude;
                    var long = position.coords.longitude;
                    setUserLocationMarker(lat, long);
                }, function (error) {
                    console.error('Error w/ getCurrentPosition: ' + JSON.stringify(error));

                });

            if (!$scope.watchPositionID) {
                $scope.watchPositionID = $cordovaGeolocation.watchPosition(watchOptions);
            }

            $scope.watchPositionID.then(
                null,
                function (error) {
                    console.error('Error w/ watchPosition: ' + JSON.stringify(error));

                },
                function (position) {
                    var lat = position.coords.latitude;
                    var long = position.coords.longitude;

                    setUserLocationMarker(lat, long);
                });
        }

        function setUserLocationMarker(lat, lng) {
            if (!userLocationMarker) {
                var userLocationIconPath = "img/user-location.png";
                if (!isInsideOfGoettingenBounds(lat, lng)) {
                    userLocationIconPath = "img/user-location-gray.png";
                    // Set it to Gaenseliesl
                    lat = '51.5326892';
                    lng = '9.9353077';
                }

                var userLocationIcon = new google.maps.MarkerImage(
                    userLocationIconPath,
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
                map.setCenter(userLocationMarker.position);

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
                    var userLocationIconPathWatch = "img/user-location.png";
                    if (!isInsideOfGoettingenBounds(lat, lng)) {
                        userLocationIconPathWatch = "img/user-location-gray.png";

                        // Set it to Gaenseliesl
                        lat = '51.5326892';
                        lng = '9.9353077';
                    }
                    userLocationMarker.setIcon(new google.maps.MarkerImage(
                        userLocationIconPathWatch,
                        new google.maps.Size(36, 36),
                        new google.maps.Point(0, 0),
                        new google.maps.Point(18, 18),
                        new google.maps.Size(36, 36)
                    ));
                    userLocationMarker.setPosition(new google.maps.LatLng(lat, lng));
                }

            }
            if (!originMarker) {
                originMarker = new google.maps.Marker({
                    position: new google.maps.LatLng(lat, lng),
                    map: map,
                    draggable: true,
                    zIndex: 100,
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

        function directionsDisplayUpdated() {
            //var routeIndex = directionsDisplay && directionsDisplay.hasOwnProperty('routeIndex') ? directionsDisplay.routeIndex : null;
            //if (previousRouteIndex !== routeIndex) {
            //    routeIndexChanged = true;
            //}
            //previousRouteIndex = routeIndex;
            routePaths = clear_markers(routePaths);
            if ($scope.routeCalculated) {
                findBusLines(directionsDisplay);
            }
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
                                            var departure_name = step.transit.departure_stop.name.replace(/^Göttingen /i, "");
                                            var arrival_name = step.transit.arrival_stop.name.replace(/^Göttingen /i, "");
                                            currentBusLines.push({
                                                line_id: step.transit.line.short_name,
                                                line_start: departure_name,
                                                line_end: arrival_name
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                    currentBusLines = make_array_unique(currentBusLines);
                    liveBusPositions = clear_markers(liveBusPositions);
                    if (currentBusLines.length > 0) {
                        restartLiveBusTimer();
                    } else {
                        stopLiveBusTimer();
                    }
                }
            }
        }

        //var liveBusPositions = [];
        var touched_live_bus_bounds = false;
        $scope.updateBusMarker = function (cb) {
            busRadar.getLivePositionsForBusLines(currentBusLines, function () {
                    if (busRadar.livePositions && busRadar.livePositions.length > 0) {
                        if (cb) {
                            live_bus_bounds = new google.maps.LatLngBounds();
                            live_bus_bounds.extend(destinationMarker.getPosition());
                            live_bus_bounds.extend(originMarker.getPosition());
                            touched_live_bus_bounds = false;
                            for (var i = 0, len = busRadar.routes.length; i < len; i++) {
                                var currentBusRoute = busRadar.routes[i];
                                var polylinePoints = [];
                                if (stops_fixtures &&
                                    stops_fixtures.sequences &&
                                    stops_fixtures.sequences[currentBusRoute.route_id] &&
                                    stops_fixtures.sequences[currentBusRoute.route_id][currentBusRoute.direction_id]) {
                                    for (var k = 0; k < stops_fixtures.sequences[currentBusRoute.route_id][currentBusRoute.direction_id].length; k += 2) {
                                        var currentCoordPair = stops_fixtures.sequences[currentBusRoute.route_id][currentBusRoute.direction_id];
                                        polylinePoints.push(new google.maps.LatLng(currentCoordPair[k], currentCoordPair[k + 1]));
                                    }
                                    var routePath = new google.maps.Polyline({
                                        path: polylinePoints,
                                        strokeColor: stops_fixtures.sequences[currentBusRoute.route_id].color,
                                        strokeOpacity: 0.6,
                                        strokeWeight: 2
                                    });
                                    routePath.setMap(map);
                                    routePaths.push(routePath);
                                } else {
                                    console.log("No bus line shapes found for Route: " + currentBusRoute.route_id);
                                    console.log("Route Object" + currentBusRoute);
                                }
                            }
                        }

                        var nData = busRadar.livePositions.length;
                        var nPreviousData = liveBusPositions.length;

                        if (nPreviousData !== nData) {
                            liveBusPositions = clear_markers(liveBusPositions);
                        }
                        for (var j = 0, len2 = nData; j < len2; j++) {
                            var currentLivePosition = busRadar.livePositions[j];

                            if (cb) {
                                if (!currentLivePosition.stalled) {
                                    live_bus_bounds.extend(
                                        new google.maps.LatLng(currentLivePosition.lat, currentLivePosition.lon));
                                    touched_live_bus_bounds = true;
                                }
                            }
                            if (!liveBusPositions[j]) {
                                liveBusPositions.push(new CustomBusMarker(
                                    new google.maps.LatLng(currentLivePosition.lat, currentLivePosition.lon),
                                    $scope.map,
                                    {
                                        route_id: currentLivePosition.route.route_id,
                                        stalled: currentLivePosition.stalled
                                    }
                                    //title:
                                    //position: ,
                                    //icon: "img/bus.png",
                                    //map: $scope.map,
                                    //zIndex: 1000,

                                ));
                            }
                            else {
                                liveBusPositions[j].setPosition(new google.maps.LatLng(currentLivePosition.lat, currentLivePosition.lon));
                                liveBusPositions[j].setRouteIdAndIsStalled(currentLivePosition.route.route_id, currentLivePosition.stalled);
                            }
                        }
                        if (cb && touched_live_bus_bounds) {
                            cb();
                        }
                    } else {
                        liveBusPositions = clear_markers(liveBusPositions);
                        console.log("No live bus information available");
                    }
                }
            )
            ;

        };

        $scope.startLiveBusMarker = function () {
            // Function to replicate setInterval using $timeout service.
            live_bus_position_timer = $timeout(function () {
                $scope.updateBusMarker();
                $scope.startLiveBusMarker();
            }.bind($scope), 2000);
        };

        function clear_markers(markerArray) {

            for (var i = 0; i < markerArray.length; i++) {
                markerArray[i].setMap(null);
            }
            markerArray.length = 0;
            return [];
        }

        function restartLiveBusTimer() {
            $timeout.cancel(live_bus_position_timer);
            live_bus_bounds = null;
            $scope.updateBusMarker(function () {
                $scope.map.fitBounds(live_bus_bounds);
            });
            $scope.startLiveBusMarker();
        }

        function stopLiveBusTimer() {
            $timeout.cancel(live_bus_position_timer);
        }

    }
)
;