var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require("http");
var cors = require('cors');
var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var request = require('request');

var app = express();
var sqs = new AWS.SQS({region: 'us-west-2', credentials: false});

const API_HOST = 'http://dev.markitondemand.com';
const COMPARE_QUEUE_URL = 'https://sqs.us-west-2.amazonaws.com/557989321320/cmpe282-compare-queue';
const DATA_COMPONENT_URL = 'http://localhost:2000';

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

app.all('/MODApis*', function (req, res) {
    http.get(API_HOST + req.originalUrl, function (stream) {
        var data = '';
        stream.on('data', function (chunk) {
            data += chunk;
        });
        stream.on('end', function () {
            console.log(data);
            res.send(JSON.parse(data));
        });

    }).on('error', function (err) {
        console.log(err);
    });
});

app.post('/api/compare', function (req, res) {
    var data = req.body;
    data.id = uuid.v4();
    var params = {
        MessageBody: JSON.stringify(data),
        QueueUrl: COMPARE_QUEUE_URL
    };
    sqs.sendMessage(params, function (err) {
        if (err) {
            console.log(err, err.stack);
            res.status(500).send();
        }
        else {
            res.status(201).send({compare_id: data.id});
        }
    });
});

app.get('/api/compare/:id', function (req, res) {
    request.get(DATA_COMPONENT_URL + '/compare/' + req.params.id, function (err, response, body) {
        if (err) {
            console.log(err);
            res.status(500).send();
        } else {
            if (response.statusCode === 200) {
                console.log(body);
                res.send(JSON.parse(body));
            } else {
                res.status(404).send()
            }
        }
    });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
