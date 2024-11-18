import 'express-async-errors';
import express, {Request, Response, Application, NextFunction} from "express";
import flash from "express-flash";
import createError from 'http-errors';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import session from 'express-session';
import indexRouter from './routes/indexRoute';
import accountsRouter from './routes/accountRoute';
import expenseRouter from './routes/expenseRoute';
import {fetchUser} from "./middlewares/fetchUser";
import expenseAPIRouter from './routes/expenseAPIRoute';
import claimAPIRouter from './routes/claimAPIRoute';
import settingsRouter from './routes/settingsRoute';
import settingsAPIRouter from './routes/settingsAPIRoute';
import claimRoute from './routes/claimRoute';
import oauthRouter from './routes/oauthRoute';
import {DataTypes, Sequelize} from "sequelize";
import {MariaDbDialect} from "@sequelize/mariadb";
import connectSessionSequelize from "connect-session-sequelize";
import {findUserById} from "./services/accountService";
import config from "./config/configLoader";

// Sequelize connection as URL:
console.log("Initializing Sequelize for Express session");

const SequelizeStore = connectSessionSequelize(session.Store);
const sequelize = new Sequelize(process.env.DB_SESSION_URL as string, {logging: false});

sequelize.define('Session', {
  sid: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  expires: DataTypes.DATE,
  data: DataTypes.TEXT,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE
});

function extendDefaultFields(defaults: any, session: any) {
  console.log(defaults, session);
  return {
    data: defaults.data,
    expires: defaults.expires,
    userId: session.userId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
}

var app: Application = express();

const sessionStore = new SequelizeStore({
  db: sequelize,
  table: "Session",
  extendDefaultFields: extendDefaultFields,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 7 * 24 * 60 * 60 * 1000,
})

console.log("Init Express application");


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.set('trust proxy', 1);
console.log("NODE_ENV: " + process.env.NODE_ENV)
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'unknown',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: process.env.NODE_ENV === "production",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  }
}))

sessionStore.sync();
console.log("Synced Session DB schema");

app.use(logger(process.env.NODE_ENV === "production" ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(fetchUser);
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.showHeader = true;

  res.locals.head = {};
  res.locals.head.siteName = "EasyClaim";
  res.locals.head.pageTitle = "EasyClaim";
  res.locals.head.description = "Effortlessly track your expenses and generate claims that are easy to share with EasyClaim. Simplify your financial management today."
  res.locals.head.keywords = "expense tracking, claim generation, shareable claims, expense management, financial management, expense reporting, budget tracking, personal finance, expense submission, claim submission, expense monitoring, claim details, expense categories, expense analysis, expense documentation, claim processing, expense conversion, expense claims, finance management, expense overview, expense records, shareable expense reports, digital expense tracking, online finance tools, expense management software, claim management, personal budgeting, expense auditing, expense management system";
  res.locals.head.author = "Nogra";
  res.locals.head.url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  res.locals.head.image = "";

  res.locals.oauth = {};
  res.locals.oauth.googleClientId = config.app.oauth.google.clientId;

  res.locals.app = {};
  res.locals.app.host = config.app.constants.host;
  res.locals.app.name = config.app.constants.name;

  res.locals.hcaptcha_sitekey = process.env.HCAPTCHA_SITEKEY

  res.locals.userStrings = {}
  res.locals.userStrings.avatarUrl = req.user?.profilePicture?.fileUrl || "/avatar/default";
  next();
});
app.use(flash());

app.use('/', indexRouter);
app.use('/accounts', accountsRouter);
app.use('/expenses', expenseRouter);
app.use('/claims', claimRoute);
app.use('/settings', settingsRouter);
app.use('/api/expenses', expenseAPIRouter);
app.use('/api/claims', claimAPIRouter);
app.use('/api/settings', settingsAPIRouter);
app.use('/auth', oauthRouter)

app.get('/500', function(req: Request, res: Response, next: NextFunction) {
  return res.render('pages/errors/500')
})

app.get('/404', function(req: Request, res: Response, next: NextFunction) {
  return res.render('pages/errors/404')
})

app.get('/avatar/default', function(req: Request, res: Response, next: NextFunction) {
  return res.sendFile(path.join(__dirname, 'public', 'assets/avatar/default.png'));
})



// 404 handler
app.use("*", function (req, res, next) {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(404).json({error: "Not found", error_message: "Not found"})
    // return next(
    //     createError(404, `Unknown Resource ${req.method} ${req.originalUrl}`)
    // );
  }
  return res.status(404).render("pages/errors/404", {
    notfound_resource: `Unknown Resource ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
// noinspection JSUnusedLocalSymbols
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  if (req.app.get('env') === 'development' || process.env.NODE_ENV === 'development') {
    if (req.accepts('html')) {
      res.status(err.status || 500);
      res.render('pages/errors/error');
    } else {
      res.status(err.status || 500).json({
        message: err.message,
        error: req.app.get('env') === 'development' ? err : {}
      });
    }
  } else {
    if (req.accepts('html')) {
      res.render('pages/errors/500');
    } else {
      res.status(err.status || 500).json({
        error: "Internal server error"
      });
    }
  }
});

module.exports = app;
