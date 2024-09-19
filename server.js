const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to the database
db.connect((err) => {
    if (err) throw err;
    console.log('Connected to the database');
});

// Routes

// Index Route
app.get('/', (req, res) => {
    let search = req.query.search || '';
    let filter = req.query.filter || '';

    let query = `
        SELECT s.student_key, s.student_name, s.grade, sub.subject_name, s.remarks 
        FROM mst_student s 
        JOIN mst_subject sub ON s.subject_key = sub.subject_key
    `;

    if (search) {
        query += ` WHERE s.student_name LIKE '%${search}%'`;
    }
    
    if (filter) {
        const remarksFilter = filter === 'PASS' ? 'PASS' : 'FAIL';
        query += search ? ` AND s.remarks = '${remarksFilter}'` : ` WHERE s.remarks = '${remarksFilter}'`;
    }

    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('index', { students: results, search, filter });
    });
});

// Add Student Route
app.get('/add', (req, res) => {
    db.query('SELECT * FROM mst_subject', (err, subjects) => {
        if (err) throw err;
        res.render('add_student', { subjects });
    });
});

app.post('/add', (req, res) => {
    const { student_name, subject_key, grade } = req.body;
    db.query('INSERT INTO mst_student (student_name, subject_key, grade) VALUES (?, ?, ?)', 
             [student_name, subject_key, grade], (err) => {
        if (err) throw err;
        res.redirect('/');
    });
});

// Edit Student Route
app.get('/edit/:student_key', (req, res) => {
    const studentKey = req.params.student_key;

    db.query('SELECT * FROM mst_student WHERE student_key = ?', [studentKey], (err, student) => {
        if (err) throw err;
        db.query('SELECT * FROM mst_subject', (err, subjects) => {
            if (err) throw err;
            res.render('edit_student', { student: student[0], subjects });
        });
    });
});

app.post('/edit/:student_key', (req, res) => {
    const studentKey = req.params.student_key;
    const { student_name, subject_key, grade } = req.body;
    db.query('UPDATE mst_student SET student_name = ?, subject_key = ?, grade = ? WHERE student_key = ?', 
             [student_name, subject_key, grade, studentKey], (err) => {
        if (err) throw err;
        res.redirect('/');
    });
});

// Delete Student Route
app.get('/delete/:student_key', (req, res) => {
    const studentKey = req.params.student_key;
    db.query('DELETE FROM mst_student WHERE student_key = ?', [studentKey], (err) => {
        if (err) throw err;
        res.redirect('/');
    });
});

// Generate PDF Report
app.get('/report', (req, res) => {
    const doc = new PDFDocument();
    const filePath = path.join(__dirname, 'report.pdf');
    
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(25).text('Student Grades Report', { align: 'center' });
    doc.moveDown();
    
    db.query('SELECT s.student_name, sub.subject_name, s.grade, s.remarks FROM mst_student s JOIN mst_subject sub ON s.subject_key = sub.subject_key', (err, results) => {
        if (err) throw err;
        
        results.forEach((student) => {
            doc.text(`${student.student_name} - ${student.subject_name}: ${student.grade} (${student.remarks})`);
        });

        doc.end();
        res.download(filePath, 'report.pdf', (err) => {
            if (err) throw err;
            fs.unlinkSync(filePath); // Delete the file after download
        });
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
