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
  const emailsend = `<body
  style="
    margin: 0;
    padding: 30px 10px;
    background-color: #0f0800;
    color: white;
    font-family: Arial, sans-serif;
    text-align: center;
  "
>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table
          style="
            border: 2px solid #fda900;
            border-radius: 5px;
            background-color: #130b02;
          "
        >
          <tr>
            <td align="center" style="padding: 32px 32px 0">
              <img
                src="https://pdmmarilao.bond/Pictures/pdm.png"
                style="width: 100px"
              />

              <h1 style="font-size: 1.4rem">
                PAMBAYANG DALUBHASAAN
                <span style="display: block; color: #fda900"> NG MARILAO </span>
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 0">
              <div
                style="
                  height: 2px;
                  width: 100%;
                  margin: 20px 0;
                  background-color: rgba(253, 169, 0, 0.2);
                "
              ></div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 32px">
              <h2 style="font-size: 1.3rem">Your Account Credentials</h2>

              <p style="color: rgba(255, 255, 255, 0.589)">
                Your account has been successfully created.
              </p>

              <p style="color: rgba(255, 255, 255, 0.589)">
                Use the credentials below to log in to the
                <span style="display: block">PDM Website</span>
              </p>

              <h3 style="padding-top: 20px">Account Information</h3>

              <p style="margin: 10px 0">
                <strong>Email Address:</strong>
                <span style="display: block">${email}</span>
              </p>

              <p style="margin: 10px 0">
                <strong>Password:</strong>
                <span style="display: block">${password}</span>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0">
              <div
                style="
                  height: 2px;
                  width: 100%;
                  margin: 20px 0;
                  background-color: rgba(253, 169, 0, 0.2);
                "
              ></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 15px 25px 15px">
              <p style="color: rgba(255, 255, 255, 0.781)">
                Pambayang Dalubhasaan ng Marilao
              </p>
              <p style="color: rgba(255, 255, 255, 0.589); font-size: 0.9rem">
                This is an automated message. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>


`;
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
                html: emailsend,
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
