const { application } = require("express");
const { MongoClient } = require("mongodb");

let db;
module.exports = {
    dbConnect: (uri, callback) => {
        MongoClient.connect(uri)
            .then((client) => {
                console.log("Connected to MongoDB");
                db = client.db('vinylist');
                return callback();
            })
            .catch(error => {
                console.log(error);
                return callback(error);
            });
    },
    dbGet: () => db
};