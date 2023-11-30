const express = require("express");
const bodyParser = require('body-parser');
const cors = require("cors");
const app = express();
const admin = require('firebase-admin');
const serviceAccount = require('./key.json');
require('./prod');
const bcrypt = require('bcryptjs');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
}) 

const db = admin.firestore();

const port = 3000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(bodyParser.json());
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const userExists = await checkIfUserExists(username, email);
  if (userExists) {
    return res.status(409).json({ error: 'Username or email already exists' });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new user in Firestore
  const userRef = db.collection('Users').doc();
  await userRef.set({
    username,
    email,
    password: hashedPassword
  });
  
  res.status(201).json({ message: 'User registered successfully' });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Check if the user exists
  const userSnapshot = await db.collection('Users').where('email', '==', email).get();

  if (userSnapshot.empty) {
    return res.status(404).json({ error: 'User not found' });
  }

  
  const user = userSnapshot.docs[0].data();
  // Compare the provided password with the stored hashed password
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (passwordMatch) {
    res.json({ message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Incorrect password' });
  }
});



// Function to check if a user with the given username or email already exists
async function checkIfUserExists(username, email) {
  const usernameSnapshot = await db.collection('Users').where('username', '==', username).get();
  const emailSnapshot = await db.collection('Users').where('email', '==', email).get();

  return !usernameSnapshot.empty || !emailSnapshot.empty;
}


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
