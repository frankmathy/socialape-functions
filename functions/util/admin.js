const admin = require('firebase-admin');
var serviceAccount = require("../socialapeKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://socialape-c6bc6.firebaseio.com"
});

const db = admin.firestore();

module.exports = { admin, db };
