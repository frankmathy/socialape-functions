const admin = require('firebase-admin');
var serviceAccount = require("../socialapeKey.json");
const config = require('./config');
config.credential = admin.credential.cert(serviceAccount);
console.log("Admin settings:");
console.log(config)
admin.initializeApp(config);

const db = admin.firestore();

module.exports = { admin, db };
