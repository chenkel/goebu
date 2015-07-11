"use strict";
angular.module("goebu.services", [])

    .service('HardwareBackButtonManager', function ($ionicPlatform) {
        this.deregister = undefined;

        this.disable = function () {
            this.deregister = $ionicPlatform.registerBackButtonAction(function (e) {
                e.preventDefault();
                return false;
            }, 501);
        };

        this.enable = function () {
            if (this.deregister !== undefined) {
                this.deregister();
                this.deregister = undefined;
            }
        };
        return this;
    });