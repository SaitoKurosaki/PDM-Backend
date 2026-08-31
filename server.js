const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");

const mysqldb = mysql.createConnection({
  host: "localhost",
  user: "school",
  password: "Administrator",
  database: "school",
});

mysqldb.connect();

const app = express();
app.use(express.urlencoded({ extended: true }));

app.post("/signup", async (req, res) => {
  res.send("Sign Up Received");
  const hashedpassword = await bcrypt.hash(req.body.password, 10);
  mysqldb.query(
    "INSERT INTO students(full_name,email,password) values (?,?,?)",
    [req.body.full_name, req.body.email, hashedpassword],
  );
});

app.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const emaildb = mysqldb.query(
    "SELECT email, password FROM students where email = ?",
    [email],
    async (err, result) => {
      if (result.length === 0) {
        return res.send("Email not Found");
      }

      const passwordcmp = await bcrypt.compare(password, result[0].password);

      if (passwordcmp) {
        res.send("Login Sucess");
      } else {
        res.send("Wrong Password");
      }
    },
  );
});
app.get("/database", (req, res) => {
  mysqldb.query("SELECT * FROM students", [], (err, result) => {
    res.json(result);
  });
});
app.listen(3000, () => {});
