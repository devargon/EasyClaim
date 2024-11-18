import {Request, Response, NextFunction} from 'express';
import isEmail from 'validator/lib/isEmail';
import {
    fetchRecentLoginLogsByUserId,
    findUserByEmail,
    findUserByEmailInternalUsage,
    registerUser
} from "../services/accountService";
import 'express-session';
import bcrypt from 'bcrypt';
import {validatePassword} from "../utils/validatePassword";
import {validateHCaptcha} from "../utils/validatehCaptcha";
import {platformExtractor} from "../utils/RequestPlatformExtractor";
import {sendNewLoginEmail} from "../utils/email/email";
import {insertAccountCreated, insertUserLoginFailure, insertUserLoginSuccess} from "../services/auditLogService";
import {User} from "@prisma/client";

const debug = require('debug')('easyclaim:accounts');

export const initiateUserSession = async (req: Request, foundUser: User, method: string)=> {
    const isSameCurrentLoggedInUser = req.user?.id === foundUser.id;
    req.session.userId = foundUser.id;
    req.session.save();
    const platform = platformExtractor(req);
    const recentLogins = await fetchRecentLoginLogsByUserId(foundUser.id, 30);
    const ipAddress = req.get('x-forwarded-for') || req.socket.remoteAddress || req.ip;
    let ipAddressPreviouslyLoggedIn = false;
    for (const recentLogin of recentLogins) {
        if (recentLogin.ipAddress === ipAddress) {
            console.log(`Same ip address for ${foundUser.email}`);
            ipAddressPreviouslyLoggedIn = true;
            break;
        }
    }
    if (!ipAddressPreviouslyLoggedIn) {
        console.log(`This is a new IP address being logged in to for ${foundUser.email}!`);
        sendNewLoginEmail(foundUser, platform);
    }
    await insertUserLoginSuccess(foundUser.id, req.body.email, method, req);
    return [isSameCurrentLoggedInUser, true]
}


// noinspection JSUnusedLocalSymbols
export const LoginUser = async (req: Request, res: Response, next: NextFunction) => {
    console.log(`Session: ${req.session}`);
    console.log("Login request received");

    if (!req.body.email || !req.body.password) {
        await insertUserLoginFailure(req.body.email, "emptyfield", "password", req);
        return res.status(400).render('pages/accounts/login', {title: 'Login to EasyClaim', login_error: "Your email or password is incorrect.", values: {email: req.body.email, redirect: req.body.redirect}})
    }
    debug(`Finding user with email ${req.body.email}`);
    console.log(`Email: ${req.body.email}, Password: ${req.body.password ? "Present" : "Not present"}`)
    const found_user = await findUserByEmailInternalUsage(req.body.email);
    if (!found_user || found_user.active === "DELETED") {
        await insertUserLoginFailure(req.body.email, "accountnotfound", "password", req);
        return res.status(401).render('pages/accounts/login', {title: 'Login to EasyClaim', login_error: "Your email or password is incorrect.", values: {email: req.body.email, redirect: req.body.redirect}})
    }
    console.log(`Found user ${found_user}`);

    debug(`Account for ${req.body.email} found. Comparing hashes`);

    const isValidPassword = found_user.password ? await bcrypt.compare(req.body.password, found_user.password) : false;
    debug(`Password match result for ${req.body.email}:  ${isValidPassword}`);
    console.log("Compared password hashes")
    if (!isValidPassword) {
        await insertUserLoginFailure(req.body.email, "wrongpassword", "password", req);
        return res.status(401).render('pages/accounts/login', {title: 'Login to EasyClaim', login_error: "Your email or password is incorrect.", values: {email: req.body.email, redirect: req.body.redirect}})
    }
    const [isSameLoggedInUser, loginSuccess] = await initiateUserSession(req, found_user, "password");
    if (loginSuccess) {
        return res.status(201).redirect(req.body.redirect || "/");
    } else {
        return res.status(500).render('pages/errors/500');
    }

}

// noinspection JSUnusedLocalSymbols
export const FormRegisterUser = async (req: Request, res: Response, next: NextFunction) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const confirm_password = req.body.confirmpassword;
    const h_captcha_response = req.body['h-captcha-response'];

    let register_error;
    const hCaptchaResult = await validateHCaptcha(h_captcha_response);
    if (!hCaptchaResult) {
        register_error = "You must complete the captcha puzzle."
    }
    if (!isEmail(email, {allow_display_name: false})) register_error = "Please enter a valid email address.";
    if (confirm_password !== password) register_error = "Passwords do not match.";
    const passwordIsValid = validatePassword(password);
    if (!passwordIsValid) {register_error = "Your password did not meet the security requirements. Please make a stronger password.";}

    if (register_error) {
        return res.status(400).render('pages/accounts/signup', {title: 'Sign up for EasyClaim', register_error, values: { name, email }});
    }
    debug(`Checking for existing user for ${req.body.email}`);
    const existingUser = await findUserByEmailInternalUsage(email);
    if (existingUser && existingUser.active !== "DELETED") {
        register_error = `An account with this email already exists. Try <a href="/accounts/login">logging in</a> instead.`
        return res.status(400).render('pages/accounts/signup', {title: 'Sign up for EasyClaim', register_error, values: { name, email }});
    }
    debug(`Registering user ${req.body.email}...`);
    const user = await registerUser(name, email, password, "standard-form-signup");
    debug(`Registration completed for ${req.body.email}`);
    await insertAccountCreated(user.id, null, name, email, "standard-form-signup", req);
    req.session.userId = user.id;
    req.session.save();
    return res.status(201).redirect("/accounts/signup/success");
}