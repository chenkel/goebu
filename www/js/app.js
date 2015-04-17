"use strict";

// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'ngCordova'])

    .run(function ($ionicPlatform) {
        $ionicPlatform.ready(function () {
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

            .state('app', {
                url: "/app",
                abstract: true,
                templateUrl: "templates/menu.html",
                controller: 'AppCtrl'
            })

            .state('app.haltestellen', {
                url: "/haltestellen",
                views: {
                    'menuContent': {
                        templateUrl: "templates/haltestellen.html",
                        controller: 'HaltestellenCtrl'
                    }
                }
            })
            .state('app.haltestelle', {
                url: "/haltestelle/:buslinienId",
                views: {
                    'menuContent': {
                        templateUrl: "templates/haltestellen.html",
                        controller: 'HaltestellenCtrl'
                    }
                }
            });
        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/app/haltestelle/22');
    });
