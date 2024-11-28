const express = require("express");
const path = require("path");
const helmet = require("helmet");
const exceptionHandler = require("express-exception-handler");
const cors = require("cors");
exceptionHandler.handle();
const app = express();
const error = require("../api/middlewares/error");
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  },
};
app.use(helmet());
const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
      },
    }),
  );
  app.use(
    helmet.hsts({
      maxAge: 365 * 24 * 60 * 60,
      includeSubDomains: true,
    }),
  );
} else {
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'", "localhost:5173"],
        scriptSrc: ["'self'", "localhost:5173"],
      },
    }),
  );
}
app.use(helmet.referrerPolicy({ policy: "no-referrer" }));
app.use(helmet.frameguard({ action: "deny" }));
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../api/views"));
global.WhatsAppInstances = {};

const routes = require("../api/routes/");
app.use("/", routes);
app.use(error.handler);

module.exports = app;
