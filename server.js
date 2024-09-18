const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = 3000;

// MySQL connection
const connection = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASS,
    database: process.env.DATABASE_DB,
});

// Set up static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Render the HTML page with data from MySQL
app.get('/', (req, res) => {
    const searchQuery = req.query.search || '';
    const filterQuery = req.query.filter || '';

    let sql = `
        SELECT s.student_name, sub.subject_name, s.grade, s.remarks 
        FROM mst_student s
        JOIN mst_subject sub ON s.subject_key = sub.subject_key
        WHERE s.student_name LIKE ?`;

    let queryParams = [`%${searchQuery}%`];

    if (filterQuery) {
        sql += ` AND s.remarks = ?`;
        queryParams.push(filterQuery);
    }

    connection.query(sql, queryParams, (err, results) => {
        if (err) {
            return res.status(500).send('Database query error');
        }

        res.render('index.ejs', { students: results });
    });
});

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
