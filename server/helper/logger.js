/**
 * Created by chenkel on 23/03/15.
 */
var bunyan = require('bunyan');

var log = bunyan.createLogger({
    name: '__',
    stream: process.stdout,
    level: global.config.logging.level,
    src: true
});

log.info('Logging activated - level: ', global.config.logging.level);

module.exports = log;

// LEVELS
//"fatal" (60): The service/app is going to stop or become unusable now.
//                  An operator should definitely look into this soon.
//"error" (50): Fatal for a particular request, but the service/app continues servicing other requests.
//                  An operator should look at this soon(ish).
//"warn" (40): A note on something that should probably be looked at by an operator eventually.
//"info" (30): Detail on regular operation.
//"debug" (20): Anything else, i.e. too verbose to be included in "info" level.
//"trace" (10): Logging from external libraries used by your app or very detailed application logging.