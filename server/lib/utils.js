"use strict";

module.exports = {
    isInt: function (n) {
        return typeof n === "number" && n % 1 === 0;
    },

    getDayName: function (date) {
        var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return days[date.getDay()];
    },

    formatDay: function (date) {
        var day = (date.getDate() < 10) ? "" + "0" + date.getDate() : date.getDate(),
            month = ((date.getMonth() + 1) < 10) ? "" + "0" + (date.getMonth() + 1) : (date.getMonth() + 1),
            year = date.getFullYear();
        return "" + year + month + day;
    },

    timeToSeconds: function (time) {
        var timeParts;
        if (time instanceof Date) {
            timeParts = [time.getHours(), time.getMinutes(), time.getSeconds()];
        } else {
            timeParts = time.split(":");
            if (timeParts.length !== 3) {
                return null;
            }
        }
        return parseInt(timeParts[0], 10) * 60 * 60 + parseInt(timeParts[1], 10) * 60 + parseInt(timeParts[2], 10);
    },

    secondsToTime: function (seconds) {
        //check if seconds are already in HH:MM:SS format

        //if (seconds.match(/\d+:\d+:\d+/)[0]) {
        if (typeof seconds !== "undefined") {

            if (typeof seconds !== "number") {
                if (seconds.match(/\d+:\d+/) || seconds.match(/\d+:\d+:\d+/)) {
                    return seconds;
                } else {
                    return null;
                }
            } else {
                var hour = Math.floor(seconds / (60 * 60)),
                    minute = Math.floor((seconds - hour * (60 * 60)) / 60);
                //second = seconds - hour * (60 * 60) - minute * 60;
                //return ((hour < 10) ? "" + "0" + hour : hour) + ":" +
                //    ((minute < 10) ? "" + "0" + minute : minute) + ":" +
                //    ((second < 10) ? "" + "0" + second : second);

                return ((hour < 10) ? "" + "0" + hour : hour) + ":" +
                    ((minute < 10) ? "" + "0" + minute : minute);
            }
        }

    },
    checkRequiredArrays: function (arrObj, cb) {
        for (var desc in arrObj) {
            if (arrObj.hasOwnProperty(desc)) {
                if (
                    typeof arrObj[desc] === 'undefined' ||
                    arrObj[desc] === null || !arrObj[desc] ||
                    arrObj[desc].length === 0
                ) {
                    global.log.error(desc);
                    cb(new Error(desc), null);
                }
            }
        }
    },
    checkAndInitiateMissingVars: function (obj, objectsToAdd, typeToAdd) {
        for (var i = 0, len = objectsToAdd.length; i < len; i++) {
            if (typeof obj[objectsToAdd[i]] === 'undefined' || obj[objectsToAdd[i]] === null) {
                //global.log.debug("Instantiating undefined " + objectsToAdd[i]);
                if (!typeToAdd || typeToAdd === "array") {
                    obj[objectsToAdd[i]] = [];
                } else if (typeToAdd === 'object') {
                    obj[objectsToAdd[i]] = {};
                }
            }
        }
        return obj;
    },
    returnResults: function (cb) {
        return function (e, res) {
            if (!!e) {
                global.log.error(e.message);
                cb(e, null);
            } else {
                cb(null, res);
            }
        };
    }

};