"use strict";

// Ionic goebu App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'goebu' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'goebu.controllers' is found in controllers.js
angular.module('goebu', [
    'ionic',
    'ngCordova',
    'ionic.service.core',
    'goebu.controllers'
])

    .config(['$ionicAppProvider', function ($ionicAppProvider) {
        // Identify app
        //$ionicAppProvider.identify({
        //    // The App ID for the server
        //    app_id: '3a1fb0c9',
        //    // The API key all services will use for this app
        //    api_key: '2a062a84478caa6584fa2bcc34a89cf1ba8b2a1b685acdb1'
        //});
        //console.log("<-- Provider");
    }])

    .run(function ($ionicPlatform, $ionicUser) {
        $ionicPlatform.ready(function () {
            //var user = $ionicUser.get();
            //if (!user.user_id) {
            //    // Set your user_id here, or generate a random one
            //    user.user_id = $ionicUser.generateGUID();
            //    console.log('Identifying user - new one');
            //} else {
            //    console.log('Identifying user - found');
            //}

            //$ionicUser.identify(user).then(function () {
            //    // Register with the Ionic Push service.  All parameters are optional.
            //    //$ionicPush.register({
            //    //    canShowAlert: true, //Can pushes show an alert on your screen?
            //    //    canSetBadge: true, //Can pushes update app icon badges?
            //    //    canPlaySound: true, //Can notifications play a sound?
            //    //    canRunActionsOnWake: true, //Can run actions outside the app,
            //    //    onNotification: function (notification) {
            //    //        // Handle new push notifications here
            //    //        console.log(notification);
            //    //        return true;
            //    //    }
            //    //}, user);
            //}, function (err) {
            //    console.log(err, "<-- err");
            //});

            //$ionicDeploy.check().then(function (response) {
            //        // response will be true/false
            //        if (response) {
            //            console.log("ionicDeploy - New updates available");
            //            // Download the updates
            //            $ionicDeploy.download().then(function () {
            //                // Extract the updates
            //                $ionicDeploy.extract().then(function () {
            //                    // Load the updated version
            //                    $ionicDeploy.load();
            //                }, function (error) {
            //                    console.log(error, "ionicDeploy - Error extracting");
            //                    // Error extracting
            //                }, function (progress) {
            //                    // Do something with the zip extraction progress
            //                    console.log(progress, "ionicDeploy - progress unzipping");
            //                    //$scope.extraction_progress = progress;
            //                });
            //            }, function (error) {
            //                // Error downloading the updates
            //                console.log(error, "ionicDeploy - Error downloading the updates");
            //            }, function (progress) {
            //                // Do something with the download progress
            //                console.log(progress, "ionicDeploy - progress downloading");
            //                //$scope.download_progress = progress;
            //            });
            //        } else {
            //            console.log("ionicDeploy - No new updates available");
            //            // No updates, load the most up to date version of the app
            //            $ionicDeploy.load();
            //        }
            //    },
            //    function (error) {
            //        // Error checking for updates
            //        console.log(error, "ionicDeploy - Error checking for updates");
            //    });

            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }

            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                //window.StatusBar.styleBlackOpaque();
                //window.StatusBar.styleDefault();
                window.StatusBar.overlaysWebView(true);
                window.StatusBar.styleDefault();

                //window.StatusBar.backgroundColorByHexString('#0F0F0F');
            }

        });
    })

    .config(function ($stateProvider, $urlRouterProvider) {

        $stateProvider
            .state('index', {
                url: '/app',
                templateUrl: 'templates/home.html'
            });
            //.state('app', {
            //    url: "/app",
            //    abstract: true,
            //    templateUrl: "templates/menu.html",
            //    controller: 'AppCtrl'
            //})
            //
            //.state('app.haltestellen', {
            //    url: "/haltestellen",
            //    views: {
            //        'menuContent': {
            //            templateUrl: "templates/haltestellen.html",
            //            controller: 'HaltestellenCtrl'
            //        }
            //    }
            //})
            //.state('haltestelle', {
            //    url: "/haltestelle/:buslinienId",
            //    templateUrl: "templates/haltestellen.html"
            //});
// if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/app');
    })
;
