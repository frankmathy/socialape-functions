const functions = require('firebase-functions');
const admin = require('firebase-admin');
var serviceAccount = require("./socialapeKey.json");
const app = require('express')();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://socialape-c6bc6.firebaseio.com"
});

const config = {
    apiKey: "AIzaSyD7O8GeVfKg7MUCFD6zA4K4hoTNPtxx9oQ",
    authDomain: "socialape-c6bc6.firebaseapp.com",
    databaseURL: "https://socialape-c6bc6.firebaseio.com",
    projectId: "socialape-c6bc6",
    storageBucket: "socialape-c6bc6.appspot.com",
    messagingSenderId: "606908434593",
    appId: "1:606908434593:web:4d9047c2e63162650a88e0",
    measurementId: "G-RM3PWDC396"
};

const firebase = require('firebase');
firebase.initializeApp(config);

const db = admin.firestore();

app.get('/screams', (req, res) => {
    db
        .collection('screams')
        .orderBy('createdAt', 'desc')
        .get()
        .then(data => {
            let screams = [];
            data.forEach(doc => {
                screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt
                });
            })
            return res.json(screams);
        })
        .catch(err => console.error(err));
});

app.post('/scream', (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };

    db
        .collection('screams')
        .add(newScream)
        .then(doc => {
            res.json({ message: `document ${doc.id} created successfully`})
        })
        .catch(err => {
            res.status(500).json({ error: 'something went wrong'});
            console.error(err); 
        })
});

app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if(doc.exists) {
                console.error("Handle already taken")
                return res.status(400).json({ handle: 'this handle is already taken'});
            } else {
                return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.status(201).json( { token });
        })
        .catch(err => {
            console.error(err);
            if(err.code === 'auth/email-already-in-use') {
                return res.status(400).json({ email: 'Email is already in use' });
            } else {
                return res.status(500).json({ error: err.code });
            }
        })
});

exports.api = functions.region('europe-west2').https.onRequest(app);
