const admin = require('firebase-admin');
var serviceAccount = require("../socialapeKey.json");
const config = require('./config');
config.credential = admin.credential.cert(serviceAccount);
admin.initializeApp(config);

const db = admin.firestore();

module.exports = { admin, db };
