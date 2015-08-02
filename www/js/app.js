"use strict";
(function () {

    var debug = false;
    if (debug === false) {
        if ( typeof(window.console) === 'undefined') { window.console = {}; }
        window.console.log = function () {};
        window.console.info = function () {};
        window.console.warn = function () {};
        window.console.error = function () {};
    }
})();


// Ionic goebu App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'goebu' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'goebu.controllers' is found in controllers.js
angular.module('goebu', [
    'ionic',
    'ngCordova',
    'ionic.service.core',
    'ionic.service.deploy',
    'goebu.directives',
    'goebu.controllers',
    'goebu.services',
    'ion-affix'
])

    .config(['$ionicAppProvider', function ($ionicAppProvider) {
        //Identify app
        $ionicAppProvider.identify({
            // The App ID for the server
            app_id: '3a1fb0c9',
            // The API key all services will use for this app
            api_key: '2a062a84478caa6584fa2bcc34a89cf1ba8b2a1b685acdb1'
        });
    }])

    .run(function ($ionicPlatform, $ionicUser, $ionicDeploy, $cordovaDialogs, $ionicLoading, $cordovaNetwork, $localstorage) {
        $ionicPlatform.ready(function () {
            navigator.splashscreen.hide();
            cordova.exec.setJsToNativeBridgeMode(cordova.exec.jsToNativeModes.XHR_NO_PAYLOAD);
            console.log("<-- setJSToNativeBridgeMode");

            var user = $ionicUser.get();
            if (!user.user_id) {
                // Set your user_id here, or generate a random one
                user.user_id = $ionicUser.generateGUID();
                console.log('Identifying user - new one: ', user.user_id);
            } else {
                console.log('Identifying user - found: ', user.user_id);
            }
            $ionicUser.identify(user).then(function () {
            }, function (err) {
                console.log(JSON.stringify(err), "<-- identify error ");
            });

            if (typeof analytics !== 'undefined') {
                console.log("analytics init");
                var mySuccessCB = function () {};
                var myErrorCB = function (error) {
                    console.log(JSON.stringify(error), "<-- analytics error");
                };
                analytics.startTrackerWithId("UA-29247849-2");
                analytics.setUserId(user.user_id);
                analytics.addCustomDimension('1', user.user_id, mySuccessCB, myErrorCB);
                //analytics.enableAdvertisingIdCollection(true, mySuccessCB, myErrorCB);
                //analytics.debugMode();
            } else {
                console.log("Google Analytics Unavailable");
            }

            var firstTimeOpened = $localstorage.get('firstTimeOpened');

            if (typeof firstTimeOpened === 'undefined') {
                analytics.trackEvent('System-Captured', 'App', 'firstTimeOpened', 1);
                $localstorage.set('firstTimeOpened', moment().unix());

            } else {
                analytics.trackEvent('System-Captured', 'App', 'Opened', 1);
            }

            var surveyGroup = $localstorage.get('surveyGroup');
            if (typeof surveyGroup === 'undefined') {
                surveyGroup = Math.floor(Math.random() * 3) + 1;
                $localstorage.set('surveyGroup', surveyGroup);
            }



            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
                cordova.plugins.Keyboard.disableScroll(false);
            }

            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                window.StatusBar.overlaysWebView(true);
                window.StatusBar.styleDefault();

                //window.StatusBar.backgroundColorByHexString('#0F0F0F');
            }
            downloadAndInstallUpdate();
        });

        $ionicPlatform.on('resume', function () {
            if (typeof analytics !== 'undefined') {
                console.log("<-- tracking Event resume app");
                analytics.trackEvent('System-Captured', 'App', 'Resumed', 1);
            }
            downloadAndInstallUpdate();
        });

        function downloadAndInstallUpdate() {

            $ionicDeploy.check().then(function (hasUpdate) {
                    // response will be true/false
                    console.log("ionic Deploy - checked");
                    if (hasUpdate === true) {
                        console.log("ionicDeploy - New updates available");

                        //$ionicDeploy.download().then(function () {
                        //    // Extract the updates
                        //    $ionicDeploy.extract().then(function () {
                        //        // Load the updated version
                        //        $ionicDeploy.load();
                        //    }, function (error) {
                        //        console.log(error, "ionicDeploy - Error extracting");
                        //        // Error extracting
                        //    }, function (progress) {
                        //        // Do something with the zip extraction progress
                        //        //console.log(progress, "ionicDeploy - progress unzipping");
                        //        $ionicLoading.show({
                        //            template: 'Installiere Update - ' + progress + "% kopiert."
                        //        });
                        //
                        //        //$scope.extraction_progress = progress;
                        //    });
                        //}, function (error) {
                        //    // Error downloading the updates
                        //    console.error(error, "ionicDeploy - Error downloading the updates");
                        //}, function (progress) {
                        //    // Do something with the download progress
                        //    //console.log(progress, "ionicDeploy - progress downloading");
                        //    $ionicLoading.show({
                        //        template: 'Lade Update herunter - ' + progress + "% geladen."
                        //    });
                        //    //$scope.download_progress = progress;
                        //});

                        $ionicDeploy.update().then(function (res) {
                            console.log('Ionic Deploy: Update Success! ', res);
                        }, function (err) {
                            console.log('Ionic Deploy: Update error! ', err);
                        }, function (progress) {
                            //console.log('Ionic Deploy: Progress... ', prog);
                            $ionicLoading.show({
                                template: 'Daten werden aktualisiert - ' + progress + "%."
                            });
                        });
                    } else {
                        console.log("ionicDeploy - No new updates available");
                        // No updates, load the most up to date version of the app
                        //$ionicDeploy.load();
                    }
                },
                function (error) {
                    // Error checking for updates
                    //console.error(error, "ionicDeploy - Error checking for updates");
                    console.error('Ionic Deploy: Unable to check for updates', error);
                });

        }
    })

    .config(function ($stateProvider, $urlRouterProvider) {

        $stateProvider
            .state('index', {
                url: '/app',
                templateUrl: 'templates/home.html'
            });
// if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/app');
    });


