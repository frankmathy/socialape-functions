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

const FBAuth = (req, res, next) => {
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
        console.error('No token found');
        return res.status(403).json({ error: 'Unauthorized'});
    }
    console.log("Found token: " + idToken);

    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            req.user = decodedToken;
            console.log("Decoded token user id: " + req.user.uid);
            return db.collection('users')
                .where('userId', '==', req.user.uid)
                .limit(1)
                .get();
        })
        .then(data => {
            req.user.handle = data.docs[0].data().handle;
            return next();
        })
        .catch(err => {
            console.error('Error while verifying token', err);
            return res.status(403).json(err);
        })
}

app.post('/scream', FBAuth, (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
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

const isEmpty = (text) => {
    if(text.trim() === '') return true;
    else return false;
} 

const isEmail = (email) => {
    var regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.toLowerCase().match(regEx)) return true;
    else return false;
}

app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    let errors = {};

    if(isEmpty(newUser.email)) {
        errors.email = 'Must not be empty';
    } else if(!isEmail(newUser.email)) {
        errors.email = 'Must be a valid email address';
    }

    if(isEmpty(newUser.password)) {
        errors.password = 'Must not be empty';
    } 

    if(newUser.password != newUser.confirmPassword) {
        errors.confirmPassword = 'Passwords must match';
    }

    if(isEmpty(newUser.handle)) {
        errors.handle = 'Must not be empty';
    } 
    
    if(Object.keys(errors).length > 0) {
        return res.status(400).json(errors);    
    }

    let token;
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
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(idToken => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId
            }
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token });
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

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    let errors = {};

    if(isEmpty(user.email)) errors.mail = "Must not be empty";
    if(isEmpty(user.password)) errors.password = "Must not be empty";
    console.log('Checked all values are ok')

    if(Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json(token);
        })
        .catch(err => {
            console.error(err);
            if(err.code === 'auth/wrong-password') {
                return res.status(403).json({ general: 'Wrong credentials, please try again'});
            } else return res.status(500).json( { error: err.code });
        });
});

exports.api = functions.region('europe-west2').https.onRequest(app);
