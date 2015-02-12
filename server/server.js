var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var cors = require("cors");


mongoose.connect('mongodb://admin:88chr88chrCwKdA@localhost/goebu');

var db = mongoose.connection;
db.on('error', function (error) {
    console.log(error);
});
db.once('open', function (callback) {
    console.log('connection opened');
});

//var personSchema = {
//    firstName: String,
//    lastName: String,
//    email: String
//};

//var Person = mongoose.model('Person', personSchema, 'people');

var app = express();

app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function (req, res) {
    res.send('Hello World!')
});

var server = app.listen(3001, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);

});

//app.route('/people')
//    .get(function (req, res) {
//        Person.find().select("firstName").limit(10).exec(function (err, doc) {
//            res.send(doc);
//        })
//    })
//
//    .post(function (req, res) {
//        Person.update({_id: req.body._id}, {firstName: req.body.firstName}, function (err) {
//            res.send(req.body)
//        })
//    });
//
//app.get('/people/:id', function (req, res) {
//    Person.findById(req.params.id, function (err, doc) {
//        res.send(doc);
//    })
//});

app.listen(3000);