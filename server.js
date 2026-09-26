import "dotenv/config";
import express from "express";
import mysql from "mysql2";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import crypto from "crypto";
import cors from "cors";
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
const Port = process.env.PORT;
const MySQLStore = MySQLStoreFactory(session);
const app = express();
app.set("trust proxy", 1);

const sessionStore = new MySQLStore({
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB,
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    },
  }),
);

const mysqldb = mysql.createPool({
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(
  cors({
    origin: "https://pdmmarilao.bond",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
    async (error, result) => {
      if (error) {
        console.error(error);
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
          async (error, result) => {
            if (error) {
              console.error(err);
              return res.status(500).send("Database Error");
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
    async (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).send("Database Error");
      }

      if (result.length === 0) {
        return res.status(404).send("Email not Found");
      }

      try {
        const passwordcmp = await bcrypt.compare(password, result[0].password);

        if (passwordcmp) {
          req.session.regenerate((error) => {
            if (error) {
              console.error(error);
              return res.status(500).send("Session Error");
            }
            req.session.email = result[0].email;
            req.session.save((error) => {
              if (error) {
                console.error(error);
                return res.status(500).send("Session Error");
              }
              console.log("SESSION:", req.session);
              res.status(200).send("Login Success");
            });
          });
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

app.post("/forgot_password", (req, res) => {
  const email = req.body.email;
  const token = crypto.randomBytes(32).toString("hex");
  const expireAt = new Date(Date.now() + 15 * 60 * 1000);
  const resetUrl = `https://pdmmarilao.bond/reset_password.html?token=${token}`;
  const emailsend = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <style>
      @media (max-width: 640px) {
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
      margin: 0;
      padding: 20px 0;
      color: white;
      font-family: Arial, Helvetica, sans-serif;
      background-color: #ffffff;
    "
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="margin: 0 auto"
    >
      <tr align="center">
        <td>
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width: 600px;
              max-width: 600px;
              margin: 0 auto;
              background-color: #201205;
              border-radius: 10px;
            "
          >
            <tr align="center">
              <td style="padding-top: 25px">
                <img
                  src="https://pdmmarilao.bond/Pictures/pdm.png"
                  alt="Pambayang Dalubhasaan ng Marilao"
                  width="100"
                  style="width: 100px; display: block"
                />
              </td>
            </tr>

            <tr>
              <td align="center">
                <h2
                  id="pdmtitle"
                  style="font-weight: bold; margin: 15px 0; color: white"
                >
                  PAMBAYANG DALUBHASAAN
                  <span style="display: block; color: #fda900">
                    NG MARILAO
                  </span>
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
              <td>
                <h3
                  style="padding: 0 30px; margin-top: 25px; margin-bottom: 15px"
                >
                  PASSWORD RESET REQUEST
                </h3>
              </td>
            </tr>

            <tr>
              <td align="start">
                <h5
                  style="
                    padding: 0 30px;
                    margin-top: 5px;
                    margin-bottom: 20px;
                    line-height: 1.5;
                  "
                >
                  WE RECEIVED A REQUEST TO RESET YOUR PAMBAYANG DALUBHASAAN NG
                  MARILAO ACCOUNT PASSWORD.
                </h5>
              </td>
            </tr>

            <tr>
              <td>
                <p
                  style="padding: 0 30px; margin-top: 10px; margin-bottom: 10px"
                >
                  Click the button below to create a new password.
                </p>
              </td>
            </tr>

            <tr align="center">
              <td style="padding: 15px 30px 20px 30px">
                <a
                  href="${resetUrl}"
                  style="
                    display: inline-block;
                    padding: 13px 25px;
                    background-color: #fda900;
                    color: #201205;
                    text-decoration: none;
                    font-weight: bold;
                    border-radius: 5px;
                    font-size: 14px;
                  "
                >
                  RESET PASSWORD
                </a>
              </td>
            </tr>

            <tr>
              <td>
                <p
                  style="padding: 0 30px; margin-top: 5px; margin-bottom: 10px"
                >
                  This link will expire in
                  <span style="color: #fda900">15 minutes</span>
                  for security purposes.
                </p>
              </td>
            </tr>

            <tr>
              <td>
                <p
                  style="
                    padding: 0 30px;
                    margin-top: 10px;
                    margin-bottom: 20px;
                    color: #e6e6e6;
                    line-height: 1.5;
                    font-weight: normal;
                  "
                >
                  If you did not request a password reset, you can safely ignore
                  this email. Your password will remain unchanged.
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
              <td>
                <p style="color: #e6e6e6; margin: 15px 0 10px 0">
                  Pambayang Dalubhasaan ng Marilao
                </p>
              </td>
            </tr>

            <tr align="center">
              <td>
                <p
                  style="
                    margin: 0;
                    padding: 0 30px 1rem 30px;
                    color: rgba(255, 255, 255, 0.589);
                    font-weight: normal;
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
    (error, result) => {
      console.error(error);
      if (error) {
        return res.status(500).send("Database Error");
      }
      if (result.length === 0) {
        return res.status(404).send("Account Not Found");
      }
      mysqldb.query(
        "INSERT INTO password_reset(email, TOKEN, EXPIRES_AT) VALUES(?,?,?)",
        [email, token, expireAt],
        async (error, result) => {
          if (error) {
            console.error(error);
            return res.status(500).send("Database Error");
          }
          try {
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: email,
              subject: "Forgot Password",
              html: emailsend,
            });
            return res.status(200).send("done");
          } catch (error) {
            console.error(error);
            return;
          }
        },
      );
    },
  );
});

app.post("/reset_password", (req, res) => {
  const { password, token } = req.body;
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
                 YOUR PASSWORD HAS BEEN SUCCESSFULLY RESET
                </h3>
              </td>
            </tr>
            <tr>
              <td align="start" >
                <h5 style="padding: 0 30px;">
                USE THE NEW PASSWORD BELOW TO LOG IN TO THE PDM WEBSITE
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
              <td>
                <p style="padding: 0 30px;">
                
                   New Password:
              
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
    "SELECT * FROM password_reset WHERE TOKEN = ? AND EXPIRES_AT > NOW()",
    [token],
    async (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).send("Database Error");
      }
      if (result.length === 0) {
        return res.status(400).send("Invalid Token");
      }
      const email = result[0].email;
      const hashedpassword = await bcrypt.hash(password, 10);
      try {
        mysqldb.query(
          "UPDATE students SET password = ? WHERE email = ?",
          [hashedpassword, email],
          async (error, result) => {
            if (error) {
              console.error(error);
              return res.status(500).send("Database Error");
            }
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: email,
              subject: "Student Credentials",
              html: emailsend,
            });
            return res.status(200).send("done");
          },
        );
      } catch (error) {
        return;
      }
    },
  );
});

app.get("/check_reset_token", (req, res) => {
  const { token } = req.query;

  mysqldb.query(
    "SELECT * FROM password_reset WHERE TOKEN = ? AND EXPIRES_AT > NOW()",
    [token],
    (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).send("Database Error");
      }

      if (result.length === 0) {
        return res.status(400).send("Invalid or Expired Token");
      }

      return res.status(200).send("Valid Token");
    },
  );
});

app.get("/check_session", (req, res) => {
  if (!req.session.email) {
    return res.status(401).send("Not authenticated");
  }

  console.log("Logged in as:", req.session.email);

  res.status(200).send("Authenticated");
});

app.get("/student_data", (req, res) => {
  if (!req.session.email) {
    return res.status(401).send("Not authenticated");
  }

  mysqldb.query(
    "SELECT full_name,email,parent_email,student_number,profilephotos FROM students WHERE email = ?",
    [req.session.email],
    (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).send("Database Error");
      }

      if (result.length === 0) {
        return res.status(404).send("Student Not Found");
      }

      res.status(200).json(result[0]);
    },
  );
});

app.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Logout Failed");
    }

    res.clearCookie("connect.sid");
    res.status(200).send("Logout Success");
  });
});

app.post("/updateinfo", (req, res) => {
  const { fullname, studentnumber, parentemail, profilePhotoData } = req.body;

  const studentsession = req.session.email;

  const updates = [];
  const values = [];

  if (profilePhotoData) {
    updates.push("profilephotos = ?");
    values.push(profilePhotoData);
  }

  if (fullname) {
    updates.push("full_name = ?");
    values.push(fullname);
  }

  if (studentnumber) {
    updates.push("student_number = ?");
    values.push(studentnumber);
  }

  if (parentemail) {
    updates.push("parent_email = ?");
    values.push(parentemail);
  }

  if (updates.length === 0) {
    return res.status(400).send("Nothing to update");
  }

  values.push(studentsession);

  mysqldb.query(
    `UPDATE students SET ${updates.join(", ")} WHERE email = ?`,
    values,
    (err, result) => {
      if (err) {
        return res.status(500).send("Database error");
      }

      res.status(200).send("Done");
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
