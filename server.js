import "dotenv/config";
import express from "express";
import mysql from "mysql2";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import cors from "cors";
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
  const emailsend = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>

@media(max-width: 640px) {
#pdmtitle {
  font-size: 20px !important;
}
h3 {
 text-align: center !important;
   font-size: 18px !important; 
}
h4 {
 font-size: 15px !important;
}

}
p {
  font-weight: bold;
}
    </style>
  </head>
  <body
    style="
      color: white;
      font-family: Arial, Helvetica, sans-serif;
    "
  >
    <table
      style=" margin: 0 auto; border-radius: 5px; ;"
      width="100%"
      cellpadding="0"
      cellspacing="0"
    >
      <tr align="center">
        <td>
          <table style="background-color: #201205;  border-radius: 10px; " width: 100% >
            <tr align="center" >
              <td style="padding-top:25px">
                <img
                  src="https://pdmmarilao.bond/Pictures/pdm.png"
                  style="width: 100px; "
                />
              </td>
            </tr>
            <tr>
              <td align="center">
                <h2 id="pdmtitle" style="font-weight: bold">
                  PAMBAYANG DALUBHASAAN<span
                    style="display: block; color: #fda900"
                    >NG MARILAO</span
                  >
                </h2>
              </td>
            </tr>
            <tr>
              <td>
                <div
                  style="height: 0.5px; width: 100%; background-color: #fda900"
                ></div>
              </td>
            </tr>
            <tr>
              <td >
                <h3 style="padding: 0 30px;">
                 YOUR ACCOUNT HAS BEEN SUCCESSFULLY CREATED
                </h3>
              </td>
            </tr>
            <tr>
              <td align="start" >
                <h5 style="padding: 0 30px;">
                 USE THE CREDENTIALS BELOW TO LOG IN TO THE PDM WEBSITE
                </h5>
              </td>
            </tr>
            <tr align="start">
              <td style="padding: 0 30px;">
                <p>
                  Account Information
                </p>
              </td>
            </tr>
            <tr align="start">
              <td >
                <p style="padding: 0 30px;">
             
                    Email Address:
               
                    <span style="display: block; ">${email}</span>
                  
                </p>
              </td>
            </tr>
            <tr align="start">
              <td>
                <p style="padding: 0 30px;">
                
                    Password:
              
                    <span style="display: block; ">${password}</span>
                  
                </p>
              </td>
            </tr>
            <tr>
              <td>
                <div
                  style="height: 0.5px; width: 100%; background-color: #fda900"
                ></div>
              </td>
            </tr>
            <tr align="center">
              <td><p style="color: #e6e6e6;">Pambayang Dalubhasaan ng Marilao</p></td>
            </tr>
            <tr align="center">
              <td>
                <p
                  style="
                    margin: 0;
                    padding-bottom: 1rem;
                    color: rgba(255, 255, 255, 0.589);
                    
                  "
                >
                  This is an automated message. Please do not reply.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>




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
    "SELECT email, password FROM students WHERE email = ? ",
    [email],
    async (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Database Error");
      }

      if (result.length === 0) {
        return res.status(404).send("Email not Found");
      }

      try {
        const passwordcmp = await bcrypt.compare(password, result[0].password);

        if (passwordcmp) {
          res.status(200).send("Login Success");
        } else {
          return res.status(401).send("Incorrect Password");
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
