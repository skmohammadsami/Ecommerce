const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');
const passwordHash = require('password-hash');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

app.set('view engine', 'ejs');

let userCart = {}; // In-memory cart storage

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Signup route
app.post('/signupSubmit', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const usersData = await db.collection('users')
            .where('email', '==', email)
            .get();

        if (!usersData.empty) {
            return res.send('SORRY!!! This account already exists...');
        }

        await db.collection('users').add({
            userName: username,
            email: email,
            password: passwordHash.generate(password)
        });

        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    } catch (error) {
        console.error('Error during signup:', error);
        res.send('Something went wrong...');
    }
});

// Login route
app.post('/loginSubmit', async (req, res) => {
    const { email, password } = req.body;

    try {
        const usersData = await db.collection('users')
            .where('email', '==', email)
            .get();

        let verified = false;
        let user = null;

        usersData.forEach((doc) => {
            if (passwordHash.verify(password, doc.data().password)) {
                verified = true;
                user = doc.data();
            }
        });

        if (verified) {
            res.render('dashboard', { username: user.userName });
        } else {
            res.send('Login failed...');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.send('Something went wrong...');
    }
});

// Home page route
app.get('/home', (req, res) => {
    res.render('home');
});

// Products page route
app.get('/products', (req, res) => {
    res.render('products');
});

// Cart page route
app.get('/cart', (req, res) => {
    const cartItems = userCart['default'] || [];
    res.render('cart', { username: 'User', cartItems });
});

// Logout route
app.get('/logout', (req, res) => {
    // Clear the cart
    userCart['default'] = [];
    res.redirect('/');
});

// Add to cart functionality
app.post('/addToCart', (req, res) => {
    const { product } = req.body;
    if (!userCart['default']) {
        userCart['default'] = [];
    }
    userCart['default'].push(product);
    res.sendStatus(200);
});

app.listen(2000, () => {
    console.log(`Server is running on port 2000`);
});