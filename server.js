const express = require("express");
const { dbConnect, dbGet } = require("./database.js");
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
let PORT = 8080;
let PAGESIZE = 24;

const app = express();
app.use(cors());

function sortResults(array, field, direction) {
    if (array.length > 100) {
        return array;
    }
    if (field == 'PriceEUR') {
        array.forEach(item => {
            item['PriceEUR'] = parseFloat(item['PriceEUR'].replace(',', '.'));
        })
    }
    let temp;
    let val1, val2;
    for (let i = 0; i < array.length; i++) {
        for (let j = i + 1; j < array.length; j++) {
            if (array[i][field] > array[j][field]) {
                temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
        }
    }
    if (direction == 'desc') {
        return array.reverse();
    }
    return array;
}

// database connection
let db;
dbConnect(process.env.MONGO_URI, (error) => {
    if (error) {
        console.error(error);
    }
    db = dbGet();
});


// express listener
app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`);
});

// main route
app.get("/search", (req, res) => {
    let translator = {
        'name': 'Ime',
        'author': 'Autor',
        'price': 'PriceEUR'
    }
    let price = req.query.price;
    let sort = req.query.sort;
    let sortBy = translator[req.query.sortBy];
    let query = req.query.query;
    let page = req.query.page;
    let vinyls = [];
    let findQuery = {};
    let skips = PAGESIZE * (page - 1)
    if (query) {
        let words = query.split(' ');
        findQuery = { $or: [] };
        words.forEach(word => {
            findQuery['$or'].push({
                Ime: {
                    $regex: new RegExp(`${word}`),
                    $options: 'i'
                }
            });
            findQuery['$or'].push({
                Autor: {
                    $regex: new RegExp(`${word}`),
                    $options: 'i'
                }
            });
        });
    }
    db.collection('vinyls')
        .find(findQuery)
        .skip(skips)
        .limit(PAGESIZE)
        .forEach(vinyl => vinyls.push(vinyl))
        .then(() => {
            vinyls = sortResults(vinyls, sortBy, sort);
            res.status(200).json(vinyls);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ error: "Could not fetch documents" });
        });
});

app.get("/id/:id", (req, res) => {
    let result;
    let id = new ObjectId(req.params['id']);
    db.collection('vinyls')
        .find({ _id: id })
        .limit(1)
        .forEach(vinyl => result = vinyl)
        .then(() => {
            console.log(result);
            let shopID = new ObjectId(result.ShopID);
            db.collection('shops')
                .find({ _id: shopID })
                .limit(1)
                .forEach(shop => result['Shop'] = shop)
                .then(() => {
                    res.status(200).json(result);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).json({ error: "Could not fetch documents" });
                });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ error: "Could not fetch documents" });
        });
});

app.get("/random", (req, res) => {
    let vinyls = [];
    db.collection('vinyls')
        .aggregate([{ $sample: { size: PAGESIZE } }])
        .forEach(vinyl => vinyls.push(vinyl))
        .then(() => {
            res.status(200).json(vinyls);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ error: "Could not fetch documents" });
        });
});