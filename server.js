require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const path = require("path");

// Create MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to database");
});

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/add-student", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "add-student.html"));
});

app.get("/edit-student/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "edit-student.html"));
});

// Get all students
// Assuming you're using Express.js

app.get('/students', (req, res) => {
    const query = req.query.query || '';
    const sortBy = req.query.sortBy || 'student_key';
    const sortDirection = req.query.sortDirection === 'desc' ? -1 : 1;

    let students = getStudentsFromDatabase(); // Fetch from your database

    // Filter by search query (e.g., name)
    if (query) {
        students = students.filter(student =>
            student.student_name.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Sort by specified column and direction
    students.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return -1 * sortDirection;
        if (a[sortBy] > b[sortBy]) return 1 * sortDirection;
        return 0;
    });

    res.json(students);
});


// Get a single student by ID
app.get("/students/:id", (req, res) => {
  const query = "SELECT * FROM mst_student WHERE student_key = ?";
  db.query(query, [req.params.id], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.length === 0) return res.status(404).send("Student not found");
    res.json(result[0]);
  });
});

// Add a new student
app.post("/students", (req, res) => {
  const { student_name, subject_key, grade } = req.body;
  const query =
    "INSERT INTO mst_student (student_name, subject_key, grade) VALUES (?, ?, ?)";
  db.query(query, [student_name, subject_key, grade], (err, result) => {
    if (err) return res.status(500).send(err);
    res.redirect("/");
  });
});

// Update a student
app.put("/students/:id", (req, res) => {
  const { student_name, subject_key, grade } = req.body;
  const query =
    "UPDATE mst_student SET student_name = ?, subject_key = ?, grade = ? WHERE student_key = ?";
  db.query(query, [student_name, subject_key, grade, req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.redirect("/");
  });
});

// Delete a student
app.delete("/students/:id", (req, res) => {
  const query = "DELETE FROM mst_student WHERE student_key = ?";
  db.query(query, [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.send("Student deleted successfully");
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
