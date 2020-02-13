/**
 * Created by Burhani Fakhruddin
 *
 * Open a connection DynamoDB
 *
 */

var AWS = require("aws-sdk");
var constants = require('./constants');

//AWS.config.update({endpoint: "http://localhost:8000",region: "eu-west-1a"});
AWS.config.region = constants.REGION;

let docClient = new AWS.DynamoDB.DocumentClient();

exports.query = function (params, cb) {
    docClient.query(params, cb);
};

exports.get = function (params, cb) {
    docClient.get(params, cb);
};

exports.update = function (params, cb) {
    docClient.update(params, cb);
};

exports.put = function (params, cb) {
    docClient.put(params, cb);
};

exports.scan = function (params, cb) {
    docClient.scan(params, cb);
};

exports.delete = function (params, cb) {
    docClient.delete(params, cb);
};

exports.batchWrite = function (params, cb) {
    docClient.batchWrite(params, cb);
};

exports.batchGet = function (params, cb) {
    docClient.batchGet(params, cb);
};


