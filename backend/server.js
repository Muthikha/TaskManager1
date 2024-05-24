const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs'); // For file logging
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5003;

// Log requests to a file
const accessLogStream = fs.createWriteStream('./access.log', { flags: 'a' });

// Custom logging middleware
app.use((req, res, next) => {
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url} - ${JSON.stringify(req.body)}`;
    console.log(logMessage); // Log to console
    accessLogStream.write(`${logMessage}\n`); // Log to file
    next();
});

app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

const pool = new Pool({
    host: "localhost",
    database: "my_database",
    port: 5432,
    user: "postgres",
    password: "root",
});

pool.connect((err, client) => {
    if (err) {
        console.error("Error connecting to the PostgreSQL database:", err);
    } else {
        console.log("Connected to the PostgreSQL database");
        client.release();
    }
});

// Sign-up endpoint
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password, email) VALUES ($1, $2, $3)', [username, hashedPassword, email]);
        res.status(201).send('User created successfully');
    } catch (error) {
        console.error("Signup Error:", error.message);
        res.status(500).send('Server Error');
    }
});

// Sign-in endpoint
app.post('/api/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Received sign-in request:", req.body); // Log request body
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            console.error("Signin Error: Invalid credentials - user not found");
            return res.status(401).send('Invalid credentials');
        }
        const user = userResult.rows[0];
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            console.error("Signin Error: Invalid credentials - password mismatch");
            return res.status(401).send('Invalid credentials');
        }
        res.status(200).send('Sign-in successful');
    } catch (error) {
        console.error("Signin Error:", error.message);
        res.status(500).send('Server Error');
    }
});

app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await pool.query('SELECT * FROM tasks');
        res.json(tasks.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});


app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, date, completed, important } = req.body;
        await pool.query('INSERT INTO tasks (title, description, date, completed, important) VALUES ($1, $2, $3, $4, $5)', [title, description, date, completed, important]);
        res.status(201).send('Task created successfully');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});


app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, date, completed, important } = req.body;
        await pool.query('UPDATE tasks SET title = $1, description = $2, date = $3, completed = $4, important = $5 WHERE id = $6', [title, description, date, completed, important, id]);
        res.status(200).send('Task updated successfully');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});


app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.status(200).send('Task deleted successfully');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(500).send('Server Error');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
