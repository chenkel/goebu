"use strict";

// GLOBAL variables
var originMarker, destinationMarker, userLocationMarker;
var departureOrArrivalTime, isDeparture;
var live_bus_position_timer, live_bus_bounds;
var liveBusPositions = [];
var routePaths = [];

angular.module("goebu.controllers").controller('MapCtrl', function ($rootScope, $scope, $http, $timeout,
                                                                    $ionicPlatform, $ionicLoading, $ionicModal,
                                                                    $ionicSlideBoxDelegate, $ionicNavBarDelegate,
                                                                    $cordovaDatePicker, $cordovaToast, $cordovaActionSheet,
                                                                    $cordovaGeolocation, $cordovaDialogs, $cordovaNetwork,
                                                                    busRadar, HardwareBackButtonManager, $localstorage) {

    var rendererOptions = {
        draggable: true,
        suppressMarkers: true
    };
    var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
    var directionsService = new google.maps.DirectionsService();

    var map;
    var mapCanvasDiv, scrollDiv, mapWrapperDiv, holdOverlay, mapCanvasDivTop;

    var currentBusLines;
    var routeIndexChanged, previousRouteIndex;
    var isAndroid = ionic.Platform.isAndroid();

    $scope.routeCalculated = false;

    //var confirmButtons = ['Abfahrt', 'Ankunft', 'Auf aktuelle Zeit zurücksetzen'];

    var setMarkerActionSheetOptions = {
        title: 'Möchten Sie an diesem Ort Start oder Ziel festlegen?',
        buttonLabels: ['Start', 'Ziel'],
        addCancelButtonWithLabel: 'Abbrechen',
        androidEnableCancelButton: true,
        winphoneEnableCancelButton: true
    };
    $scope.test = function (xAndy) {
        if (originMarker && destinationMarker) {

            if (mapCanvasDiv) {
                var coordinates = holdOverlay.getProjection().fromContainerPixelToLatLng(
                    new google.maps.Point(xAndy.pageX, xAndy.pageY - mapCanvasDivTop)
                );
                if (coordinates) {
                    //console.log(coordinates.lat(), coordinates.lng(), "<-- coordinates.lat, coordinates.lng");
                    $cordovaActionSheet.show(setMarkerActionSheetOptions)
                        .then(function (buttonIndex) {
                            switch (buttonIndex) {
                                case 1:
                                    console.log("<-- origin");
                                    setOriginMarker(coordinates.lat(), coordinates.lng());
                                    break;
                                case 2:
                                    console.log("<-- dest");
                                    setDestinationMarker(coordinates.lat(), coordinates.lng());
                                    break;
                            }
                        });
                }

            }
        }
    };

    var setTimeActionSheetOptions = {
        title: 'Möchten Sie die Abfahrts- oder Ankunftzeit ändern?',
        buttonLabels: ['Abfahrt', 'Ankunft'],
        addCancelButtonWithLabel: 'Abbrechen',
        androidEnableCancelButton: true,
        winphoneEnableCancelButton: true,
        addDestructiveButtonWithLabel: 'Auf aktuelle Zeit zurücksetzen'
    };

    $scope.setTime = function () {
        $cordovaActionSheet.show(setTimeActionSheetOptions)
            .then(function (buttonIndex) {
                switch (buttonIndex) {

                    case 1:
                        isDeparture = true;
                        departureOrArrivalTime = new Date();
                        $scope.calcRoute();
                        break;
                    case 2:
                        isDeparture = true;
                        displayTimePicker();
                        break;
                    case 3:
                        isDeparture = false;
                        displayTimePicker();
                        break;
                }
            });
        //$cordovaDialogs.confirm('Möchten Sie die Abfahrts- oder Ankunftzeit ändern?', 'Zeit', confirmButtons)
        //    .then(function (buttonIndex) {
        //        // no button = 0, 'OK' = 1, 'Cancel' = 2
        //        switch (buttonIndex) {
        //            case 1:
        //                isDeparture = true;
        //                displayTimePicker();
        //                break;
        //            case 2:
        //                isDeparture = false;
        //                displayTimePicker();
        //                break;
        //            case 3:
        //                isDeparture = true;
        //                departureOrArrivalTime = new Date();
        //                $scope.calcRoute();
        //                break;
        //        }
        //    });

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
        if ($cordovaNetwork.isOnline()) {
            if (originMarker && destinationMarker) {
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

                $ionicLoading.show({
                    template: 'Route wird berechnet...'
                });
                console.log("calculating new route");
                if (typeof analytics !== 'undefined') {
                    console.log("<-- tracking Event calcRoute");
                    analytics.trackEvent('System-Captured', 'Route', 'New Calculation', 1);
                }
                directionsService.route(request, function (response, status) {
                    if (status === google.maps.DirectionsStatus.OK) {
                        originMarker.setVisible(true);

                        directionsDisplay.setDirections(response);
                        //console.log(JSON.stringify(response), "directionsService.route <-- response");
                        $scope.routeCalculated = true;
                        notifyAfterRouteCaclulation();

                        //var titleText = 'Route';
                        //if (response.hasOwnProperty('routes')) {
                        //    var nRoutes = response.routes.length;
                        //    if (nRoutes > 1) {
                        //        titleText = nRoutes + ' ' + titleText + 'n';
                        //    } else if (nRoutes === 1) {
                        //        titleText = nRoutes + ' ' + titleText;

                        //    }
                        //}
                        if (mapCanvasDiv && mapWrapperDiv && scrollDiv) {
                            angular.element(mapCanvasDiv).addClass('second-stage');
                            angular.element(mapWrapperDiv).addClass('second-stage');
                            angular.element(scrollDiv).addClass('second-stage');
                            google.maps.event.trigger(map, 'resize');

                        }

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
        } else {
            notifyOffline();
            $scope.routeCalculated = false;
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
        if (lat === -1000 && lng === -1000) {
            $cordovaToast.show('Ihre aktuelle Position konnte nicht ermittelt werden. Bitte geben Sie die Berechtigung zur Nutzung der Ortungsdienste für diese App frei.', 'long', 'top');
            return false;
        }

        var check = (lat <= bb.ix &&
        lat >= bb.ax &&
        lng >= bb.iy &&
        lng <= bb.ay);

        if (!check) {
            $cordovaToast.show('Ihre aktuelle Position scheint ausserhalb von Göttingen zu liegen. Wir haben für Sie das Gänseliesel als Start gewählt.', 'long', 'top');
        }
        return check;
    }

    function notifyOffline() {
        $cordovaToast.show('Bitte stellen Sie eine Internetverbindung her.', 'long', 'bottom');
    }

    function notifyAfterRouteCaclulation() {
        $cordovaToast.showShortBottom('Start- und Ziel lassen sich noch durch verschieben oder gedrückt halten ändern');
    }

    ionic.Platform.ready(function () {
        //$ionicLoading.show({
        //    template: 'Karte wird initialisiert...'
        //});

        // listen for Offline event
        $rootScope.$on('$cordovaNetwork:offline', function (event, networkState) {
            notifyOffline();
        });
        // listen for Online event
        $rootScope.$on('$cordovaNetwork:online', function (event, networkState) {
            if (originMarker && destinationMarker && $scope.routeCalculated === false) {
                $scope.calcRoute();
            }
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
            setDestinationMarker(event.latLng.lat(), event.latLng.lng());
            google.maps.event.removeListener(clickMapEventHandler);

        });

        //new LongClick(map, 300);
        google.maps.event.addListener(map, 'dblclick', function () {
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

        holdOverlay = new google.maps.OverlayView();
        holdOverlay.draw = function () {
        }; // empty function required
        holdOverlay.setMap(map);
        mapCanvasDivTop = mapCanvasDiv.getBoundingClientRect().top;

        $ionicLoading.hide();
        $ionicNavBarDelegate.align('left');
        $ionicNavBarDelegate.title("Wählen Sie Ihr Ziel");

    }

    function setDestinationMarker(lat, lng) {
        if (!destinationMarker) {
            var myDestinationMarkerIcon = {
                url: 'img/destination.png',
                size: new google.maps.Size(44, 80), // the orignal size
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(11, 40),
                scaledSize: new google.maps.Size(22, 40) // the new size you want to use
            };

            destinationMarker = new google.maps.Marker({
                position: new google.maps.LatLng(lat, lng),
                map: map,
                draggable: true,
                zIndex: 100,
                icon: myDestinationMarkerIcon
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

    function setOriginMarker(lat, lng) {
        if (!originMarker) {
            var myOriginMarkerIcon = {
                url: 'img/origin.png',
                size: new google.maps.Size(44, 80), // the orignal size
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(11, 40),
                scaledSize: new google.maps.Size(22, 40) // the new size you want to use
            };
            originMarker = new google.maps.Marker({
                position: new google.maps.LatLng(lat, lng),
                map: map,
                draggable: true,
                zIndex: 100,
                icon: myOriginMarkerIcon,
                visible: false
            });
            google.maps.event.addListener(originMarker, 'dragend', function () {
                $scope.calcRoute();
            });
        } else {
            originMarker.setPosition(new google.maps.LatLng(lat, lng));
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
            console.log('Unable to get location: ' + error.message);
            setUserLocationMarker(0, 0);
        });
    };

    //Aktuelle Position

    var posOptions = {timeout: 10000, enableHighAccuracy: true};
    var watchOptions = {
        frequency: 1000,
        timeout: 3000,
        enableHighAccuracy: true // may cause errors if true
    };

    function getCurrentLocationStart() {
        if (userLocationMarker) {
            userLocationMarker.setMap(null);
            userLocationMarker = null;
        }

        $cordovaGeolocation
            .getCurrentPosition(posOptions)
            .then(function (position) {
                var lat = position.coords.latitude;
                var long = position.coords.longitude;
                setUserLocationMarker(lat, long);
            }, function (error) {
                console.error('Error w/ getCurrentPosition: ' + JSON.stringify(error));
                setUserLocationMarker(-1000, -1000);
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
                animation: google.maps.Animation.DROP,
                draggable: false,
                icon: userLocationIcon
            });
            map.setCenter(userLocationMarker.position);

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
            setOriginMarker(lat, lng);
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
            if ($scope.watchPositionID) {
                $scope.watchPositionID.clearWatch();
            }
            getCurrentLocationStart();
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
                    $ionicNavBarDelegate.title('Keine Busse gefunden');
                    stopLiveBusTimer();
                }
            }
        }
    }

    //var liveBusPositions = [];
    var touched_live_bus_bounds = false;
    $scope.updateBusMarker = function (cb) {

        busRadar.getLivePositionsForBusLines(currentBusLines, function () {
                if (busRadar.titleText) {
                    var titleText = busRadar.titleText;
                    //console.log(busRadar.titleText, "<-- busRadar.titleText");
                    $ionicNavBarDelegate.title(titleText);
                } else {
                    if (busRadar.active_bus_counter && busRadar.active_bus_counter > 0) {
                        $ionicNavBarDelegate.title('Busradar aktiv');
                    } else {

                        $ionicNavBarDelegate.title('Keine Busse gefunden');
                    }
                }
                if (busRadar.livePositions && busRadar.livePositions.length > 0) {
                    if (cb) {
                        live_bus_bounds = new google.maps.LatLngBounds();
                        live_bus_bounds.extend(destinationMarker.getPosition());
                        live_bus_bounds.extend(originMarker.getPosition());

                        touched_live_bus_bounds = false;
                        for (var i = 0, len = busRadar.routes.length; i < len; i++) {
                            var currentBusRoute = busRadar.routes[i];
                            var polylinePoints = [];
                            if (currentBusRoute &&
                                currentBusRoute.coords) {
                                for (var k = 0; k < currentBusRoute.coords.length; k += 2) {
                                    var currentCoordPair = currentBusRoute.coords;
                                    polylinePoints.push(new google.maps.LatLng(currentCoordPair[k], currentCoordPair[k + 1]));
                                }
                                var routePath = new google.maps.Polyline({
                                    path: polylinePoints,
                                    strokeColor: currentBusRoute.color,
                                    strokeOpacity: 0.7,
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

    function showSurveyIfNeeded() {
        var firstTimeOpened = $localstorage.get('firstTimeOpened');
        var surveyGroup = $localstorage.get('surveyGroup');

        if (typeof firstTimeOpened !== 'undefined' && typeof surveyGroup !== 'undefined') {

            $http.get(busRadar.host + "api/survey/opened/" + firstTimeOpened + "/group/" + surveyGroup)
                .success(function (result) {
                    //console.log("showSurveyIfNeeded");
                    if (result && result.id) {
                        $scope.surveyData = result;
                        var completedSurveys = $localstorage.getObject('surveys');
                        if (!completedSurveys[result.id]) {
                            $scope.openModal();
                        } else {
                            console.log("Survey already finished.");
                            $scope.closeModal();
                        }
                    } else {
                        console.log("Survey data is empty.");
                        $scope.closeModal();
                    }
                });
        } else {
            console.log("firstTimeOpened OR surveyGroup missing");
            console.log(firstTimeOpened, "<-- firstTimeOpened");
            console.log(surveyGroup, "<-- surveyGroup");
        }

    }

    $ionicPlatform.ready(function () {

        $scope.answers = {};
        $ionicModal.fromTemplateUrl("templates/survey-modal.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (modal) {
            $scope.modal = modal;
            showSurveyIfNeeded();
        }.bind($scope));

        $scope.openModal = function () {
            HardwareBackButtonManager.disable();
            //console.log("HardwareBackButtonManager disable");
            $scope.modal.show();
        };
        $scope.closeModal = function () {
            HardwareBackButtonManager.enable();
            //console.log("HardwareBackButtonManager enable");
            $scope.modal.hide();
        };

        $scope.submitSurvey = function (answers) {
            //console.log(JSON.stringify(answers), "<-- answers");
            //console.log(JSON.stringify($scope.surveyData.questions), "<-- $scope.surveyData.questions");

            if (Object.keys(answers).length !== $scope.surveyData.questions.length) {
                $cordovaDialogs.alert('Bitte beantworten Sie alle Fragen', 'Etwas fehlt noch...', 'Okay');
            } else {
                if (typeof analytics !== 'undefined') {
                    var answerTime = moment().unix();
                    for (var answerId in answers) {
                        if (answers.hasOwnProperty(answerId)) {
                            analytics.trackEvent('Survey', answerId, answers[answerId], answerTime);
                        }
                    }
                } else {
                    console.log("ERROR ANALYTICS MISSING");
                }
                $cordovaToast.show('Vielen Dank für Ihre Antworten.', 'short', 'center');

                var completedSurveys = $localstorage.getObject('surveys');
                if (typeof completedSurveys === 'undefined') {
                    completedSurveys = {};
                }
                completedSurveys[$scope.surveyData.id] = true;
                $localstorage.setObject('surveys', completedSurveys);
                //console.log(JSON.stringify(completedSurveys), "<-- localStorage surveys");

                $scope.closeModal();
            }
        };

        $scope.$on("$destroy", function () {
            //Cleanup the modal when we"re done with it!
            HardwareBackButtonManager.enable();
            $scope.modal.remove();
        });

        $scope.$on("modal.hidden", function () {
            // Execute action on hide modal
            HardwareBackButtonManager.enable();
        });

        $scope.$on("modal.removed", function () {
            // Execute action on remove modal
            HardwareBackButtonManager.enable();
        });
    });

    $ionicPlatform.on('resume', function () {
        showSurveyIfNeeded();
    });
    $ionicPlatform.on('pause', function () {
        $scope.answers = {};
        //console.log("app goes in the background");
        $scope.surveyData = null;
        $scope.closeModal();
    });
});