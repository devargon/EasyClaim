// services/emailService.ts

import ejs from "ejs";
import nodemailer from "nodemailer";
import { join } from "path";
import { promisify } from "util";
import { htmlToText } from "html-to-text";
const debug = require('debug')('easyclaim:email');
import dotenv from "dotenv";
import config from "../../config/configLoader";
import {User} from "@prisma/client";
import {PlatformData} from "../RequestPlatformExtractor";


dotenv.config();

interface EmailOptions {
  email: string | string[];
  subject: string;
  html: string;
  text?: string;
}

let app_host = config.app.constants.host;
if (app_host.endsWith("/")) {
  app_host = app_host.substring(2);
}


const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const from_email = config.smtp.from_email;

const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const message = {
      from: from_email,
      to: Array.isArray(options.email) ? options.email.join(",") : options.email,
      subject: options.subject,
      html: options.html,
      text: options.text || htmlToText(options.html),
    };

    debug(`Sending email with subject "${options.subject}" to "${options.email}"`);
    const info = await transporter.sendMail(message);

    debug(`Email sent to "${options.email}": %s`, info.messageId);
    return true;
  } catch (error: any) {
    debug(`ERROR: Error occurred while sending email: ${error.message}`);

    switch (error.responseCode) {
      case 535:
        debug("ERROR: Authentication failed. Check your SMTP username/password.");
        break;
      case 550:
        debug("ERROR: Invalid recipient address.");
        break;
      default:
        debug("ERROR: Unknown error occurred.");
    }

    return false;
  }
};

const sendBulkEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const message = {
      from: from_email,
      to: Array.isArray(options.email) ? options.email.join(",") : options.email,
      subject: options.subject,
      html: options.html,
      text: options.text || htmlToText(options.html),
    };

    debug(`Sending bulk email with subject "${options.subject}" to multiple recipients.`);
    const info = await transporter.sendMail(message);

    debug(`Bulk email sent: %s`, info.messageId);
    return true;
  } catch (error: any) {
    debug(`ERROR: Error occurred while sending bulk email: ${error.message}`);

    switch (error.responseCode) {
      case 535:
        debug("ERROR: Authentication failed. Check your SMTP username/password.");
        break;
      case 550:
        debug("ERROR: Invalid recipient address.");
        break;
      default:
        debug("ERROR: Unknown error occurred.");
    }

    return false;
  }
};

const sendTemplateEmail = async (
    templateName: string,
    templateData: object,
    userEmail: string,
    subject: string
): Promise<boolean> => {
  const templatePath = join(__dirname, './templates', `${templateName}.ejs`);

  try {
    const htmlContent = await ejs.renderFile(templatePath, { ...templateData, app_host: app_host, app_name: config.app.constants.name });
    const emailOptions: EmailOptions = {
      email: userEmail,
      subject: subject,
      html: htmlContent,
    };
    return await sendEmail(emailOptions);
  } catch (error: any) {
    const err = error as Error;
    debug(`ERROR: Failed to render email template "${templateName}": ${error.message}`);
    return false;
  }
};

const sendOTPEmail = async (userEmail: string, otp: string): Promise<boolean> => {
  return sendTemplateEmail('easyclaim_otp', { otp }, userEmail, `Here is your One-Time Pin for EasyClaim`);
};

const sendNewLoginEmail = async (user: User, platform: PlatformData): Promise<boolean> => {
  return sendTemplateEmail('easyclaim_newlogin', { user, platform }, user.email, `New login to EasyClaim`);
};

const sendPasswordChangedEmail = async (user: User): Promise<boolean> => {
  return sendTemplateEmail('easyclaim_passwordreset', { user }, user.email, `Your EasyClaim password has been reset`);
};

const getEmailDomain = (email: string): string | null => {
  const atIndex = email.indexOf('@');
  return atIndex !== -1 ? email.slice(atIndex + 1) : null;
};

export { sendEmail, sendBulkEmail, sendOTPEmail, sendNewLoginEmail, sendPasswordChangedEmail, getEmailDomain };
