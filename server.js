require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const cors = require("cors");

const Port = process.env.PORT;

const mysqldb = mysql.createPool({
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const app = express();

app.use(cors());
app.use(express.static("D:/PDM Project/PDM"));
app.use(express.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

app.post("/signup", async (req, res) => {
  const full_name = req.body.full_name;
  const email = req.body.email;
  const password = req.body.password;

  mysqldb.query(
    "SELECT * FROM students WHERE email = ?",
    [email],
    async (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Database Error");
      }

      if (result.length > 0) {
        return res.status(409).send("Email already registered");
      }

      try {
        const hashedpassword = await bcrypt.hash(password, 10);
        mysqldb.query(
          "INSERT INTO students(full_name, email, password) VALUES (?, ?, ?)",
          [full_name, email, hashedpassword],
          async (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).send("Sign Up Failed");
            }
            res.sendStatus(200);
            try {
              await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Student Credentials",
                text: "HELLO WORLD",
              });
            } catch (error) {
              console.error("Email Error:", error);
              return res.status(500).send("Email failed");
            }
          },
        );
      } catch (error) {
        console.error("Password Hash Error:", error);
        return res.status(500).send("Something went wrong");
      }
    },
  );
});

app.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  mysqldb.query(
    "SELECT email, password FROM students WHERE email = ?",
    [email],
    async (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Database Error");
      }

      if (result.length === 0) {
        return res.send("Email not Found");
      }

      try {
        const passwordcmp = await bcrypt.compare(password, result[0].password);

        if (passwordcmp) {
          res.send("Login Success");
        } else {
          res.send("Wrong Password");
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
      }
    },
  );
});

app.get("/database", (req, res) => {
  mysqldb.query("SELECT * FROM students", [], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database Error");
    }

    res.json(result);
  });
});

app.listen(Port, () => {
  console.log(`Server running on port ${Port}`);
});
