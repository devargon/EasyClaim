import {Request, Response, NextFunction} from 'express';
import isEmail from 'validator/lib/isEmail';
import prisma from '../config/db';
import {registerUser} from "../services/accountService";
import bcrypt from 'bcrypt';
const saltRounds =10

function validatePassword(password: string) {
    const validations = {
        length: password.length >= 6 && password.length <= 20,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
    };

    const isValid = Object.values(validations).every(Boolean);
    return isValid;
}

export const LoginUser = async (req: Request, res: Response, next: NextFunction) => {
    req.body.email
    req.body.password
}

export const FormRegisterUser = async (req: Request, res: Response, next: NextFunction) => {
    console.log("registering user")
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const confirm_password = req.body.confirmpassword;

    let register_error;
    if (!isEmail(email, {allow_display_name: false})) register_error = "Please enter a valid email address.";
    if (confirm_password !== password) register_error = "Passwords do not match.";
    const passwordIsValid = validatePassword(password);
    if (!passwordIsValid) {register_error = "Your password did not meet the security requirements. Please make a stronger password.";}

    if (register_error) {
        return res.render('signup', {title: 'Sign up for EasyClaim', register_error, values: { name, email }});
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
        register_error = `An account with this email already exists. Try <a href="/accounts/login">logging in</a> instead.`
        return res.render('signup', {title: 'Sign up for EasyClaim', register_error, values: { name, email }});
    }

    const user = await registerUser(name, email, password);
    return res.status(200).json(user);
}