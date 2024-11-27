const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const mongoStore = require("connect-mongo")(session);
const methodOverride = require("method-override");
const path = require("path");
const fs = require("fs");
const logger = require("morgan");

const app = express();
const http = require("http").Server(app);

// Port setup
const port = process.env.PORT || 5000;

// Socket.io setup
require("./libs/chat.js").sockets(http);

// Logger middleware
app.use(logger("dev"));

// Database connection
const dbPath = `mongodb://localhost:27017/socketChatDB`; // Local MongoDB
mongoose.connect(dbPath, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Database Connection Established Successfully."))
  .catch(err => console.error("Database Connection Error:", err));

// HTTP method override middleware
app.use(
  methodOverride(function (req, res) {
    if (req.body && typeof req.body === "object" && "_method" in req.body) {
      const method = req.body._method;
      delete req.body._method;
      return method;
    }
  })
);

// Session setup
const sessionInit = session({
  name: "userCookie",
  secret: "9743-980-270-india",
  resave: true,
  saveUninitialized: true,
  store: new mongoStore({ mongooseConnection: mongoose.connection }),
  cookie: { maxAge: 80 * 80 * 800, httpOnly: true },
});

app.use(sessionInit);

// Static files
app.use(express.static(path.resolve(__dirname, "./public")));

// View engine setup
app.set("views", path.resolve(__dirname, "./app/views"));
app.set("view engine", "ejs");

// Parsing middlewares
app.use(bodyParser.json({ limit: "10mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

// Include models
fs.readdirSync("./app/models").forEach(function (file) {
  if (file.endsWith(".js")) {
    require("./app/models/" + file);
  }
});

// Include controllers
fs.readdirSync("./app/controllers").forEach(function (file) {
  if (file.endsWith(".js")) {
    const route = require("./app/controllers/" + file);
    route.controller(app);
  }
});

// Handling 404 errors
app.use(function (req, res) {
  res.status(404).render("message", {
    title: "404",
    msg: "Page Not Found.",
    status: 404,
    error: "",
    user: req.session.user,
    chat: req.session.chat,
  });
});

// Middleware to set logged-in user
const userModel = mongoose.model("User");

app.use(function (req, res, next) {
  if (req.session && req.session.user) {
    userModel.findOne({ email: req.session.user.email }, function (err, user) {
      if (user) {
        req.user = user;
        delete req.user.password;
        req.session.user = user;
        delete req.session.user.password;
        next();
      } else {
        next();
      }
    });
  } else {
    next();
  }
});

// Start the server
http.listen(port, function () {
  console.log("Chat App started at port :" + port);
});

