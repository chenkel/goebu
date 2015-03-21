#!/bin/sh
export DEBUG=goebu:*
export dev=true
export NODE_ENV=development
forever start --minUptime 5000 --spinSleepTime 10000 --workingDir '/Users/chenkel/phonegap/goebu/server/' --colors --watch --watchDirectory '/Users/chenkel/phonegap/goebu/server/' --verbose /Users/chenkel/phonegap/goebu/server/bin/www
sleep 5
forever logs 0 -f