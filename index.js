import express from "express";
import path from 'path';
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import jwt from 'jsonwebtoken';
import bcrypt from "bcrypt";

const app = express();


mongoose
  .connect("mongodb://127.0.0.1:27017", {
    dbName: "backend",
  })
  .then(() => console.log("Database Connected"))
  .catch((e) => console.log(e));
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});
const User = mongoose.model("User", userSchema);



// Middlewares dont know much abt it
app.use(express.static(path.join(path.resolve(), "public")));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// setting view engine for using it in api's
app.set("view engine", "ejs");



const isAuthenticated = async (req, res, next) => {
  const { token } = req.cookies;  // for checking token(cookie) exist or not 
  if (token) {
    const decoded = jwt.verify(token, "sdjasdbajsdbjasd"); //decode id of user

    req.user = await User.findById(decoded._id); // accessing user id from mongo db

    next();
  } else {  // no token means no cookie means u either logout or just opened the browser
    res.redirect("/login");
  }
};


app.get("/", isAuthenticated, (req, res) => {
  res.render("logout", { name: req.user.name });
});
app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/register", (req, res) => {
  res.render("register");
});



app.post("/login", async (req, res) => {
  const { email, password } = req.body; //importing email and password from user's input

  let user = await User.findOne({ email }); //finding that email in database

  if (!user) return res.redirect("/register");//if no emails render to register page

  const isMatch = await bcrypt.compare(password, user.password); //compare our decoded hashed password with users password ie from Database..

  if (!isMatch) //if password doesnot match Fuck off and put the password again
    return res.render("login", { email, message: "Incorrect Password" });

  const token = jwt.sign({ _id: user._id }, "sdjasdbajsdbjasd"); //creating a cookie and before it encrypt the id of user by JWT

  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + 60 * 1000),
  });
  res.redirect("/");
});



app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  let user = await User.findOne({ email }); //finding email in database 
  if (user) { 
    return res.redirect("/login"); // email already exists to send user to login page
  }
  const hashedPassword = await bcrypt.hash(password, 10); //hashing password (security)

  user = await User.create({
    name,
    email,
    password: hashedPassword,
  }); //putting user data in database and creating a token(cookie) for it, before creating cookie i encrypt the id of user by JWT

  const token = jwt.sign({ _id: user._id }, "sdjasdbajsdbjasd"); 

  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + 60 * 1000),
  });
  res.redirect("/"); // registeration complete now user can login
});



app.get("/logout", (req, res) => { //just delete the existed cookie
  res.cookie("token", null, { 
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.redirect("/");
});



app.listen(5000, () => {
  console.log("Server is working");
});
