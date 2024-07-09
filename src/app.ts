import 'express-async-errors';
import express, {Request, Response, Application, NextFunction} from "express";
import createError from 'http-errors';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import session from 'express-session';
import indexRouter from './routes/indexRoute';
import usersRouter from './routes/users';
import accountsRouter from './routes/accountRoute';
import {fetchUser} from "./middlewares/fetchUser";

var app: Application = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(session({
  secret: process.env.SESSION_SECRET || 'unknown',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === "production"}
}))


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(fetchUser);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/accounts', accountsRouter);



// 404 handler
app.use("*", function (req, res, next) {
  if (req.originalUrl.startsWith("/api")) {
    // Return a simple response for API requests
    return next(
        createError(404, `Unknown Resource ${req.method} ${req.originalUrl}`)
    );
  }
  // Return a simplified 404 error explaining what happened to frontend facing customers
  return res.status(404).render("404", {
    notfound_resource: `Unknown Resource ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // log the error to the console
  console.error(err);

  // respond with the error page or JSON
  if (req.accepts('html')) {
    // render the error page
    res.status(err.status || 500);
    res.render('error');
  } else {
    // respond with JSON
    res.status(err.status || 500).json({
      message: err.message,
      error: req.app.get('env') === 'development' ? err : {}
    });
  }
});

module.exports = app;
