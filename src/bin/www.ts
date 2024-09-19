#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('easyclaim:server');
var http = require('http');

import dotenv from 'dotenv';
dotenv.config();

console.log("Verifying required environment variables are present");
const requiredEnvVars = {
  'SESSION_SECRET': "Encoding session data for express-session",
  'DATABASE_URL': "Connecting to the database via Prisma",
  'DB_SESSION_URL': "Separate database URL storing express-session data.",
  'R2_ACCESS_KEY': "Access key for Cloudflare R2 Object Storage.",
  'CF_ACCOUNT_ID': "Your Cloudflare account ID in which you've created an R2 bucket.",
  'R2_BUCKET_NAME': "Your R2 bucket's name.",
  'R2_SECRET' : "Your R2 API access' secret.",
  'SMTP_USER' : "For email sending",
  'SMTP_PASSWORD': "For email sending"
};
const missingEnvVars = Object.entries(requiredEnvVars).filter(([envVar]) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables:`)
  missingEnvVars.forEach(missing => {
    console.log(`${missing[0]}: ${missing[1]}`);
  })
  console.error("Please provide them in the .env file before continuing.")
  process.exit(1);
}

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

var server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string | number): number | string | boolean {
  const port = typeof val === 'string' ? parseInt(val, 10) : val;

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log('Listening on ' + bind);
}
