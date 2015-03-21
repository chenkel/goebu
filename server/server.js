var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
var debug = require('debug')('goebu:server');

var app = express();

app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function (req, res) {
    res.send('Hello World!')
});

var server = app.listen(3000, function () {

    var host = server.address().address;
    var port = server.address().port;

    debug('Example app listening at http://%s:%s', host, port);

});

app.listen(3000);