import express, { Request, Response, NextFunction } from 'express';
import {FormRegisterUser, LoginUser} from "../controllers/accountController";
import {redirectIfLoggedIn} from "../middlewares/redirectIfLoggedIn";
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import prisma from "../config/db";
import type {User, UserOTP} from "@prisma/client";
import {
    createOTPRequest, createPasswordResetOTPRequest,
    findUserByEmail, findUserByEmailInternalUsage,
    getLatestOtpRequest, getLatestPasswordResetOTPRequestByEmail, processPasswordUpdate,
    updateOTPRequest
} from "../services/accountService";
import {verifyOTP} from "../utils/generateOTP";
import {PwResetSession} from "../../typing-stubs/express-session";
import {generateResetToken} from "../utils/generateToken";
import config from "../config/configLoader";
import {sendOTPEmail, sendPasswordChangedEmail} from "../utils/email/email";
import {validateHCaptcha} from "../utils/validatehCaptcha";
import {pathExtractor} from "../utils/RequestPathExtractor";
import {insertPasswordResetCompleted, insertPasswordResetRequested} from "../services/auditLogService";

const router = express.Router();
/* GET home page. */
// router.get('/', (req: Request, res: Response, next: NextFunction) => {
//     res.render('index', { title: 'Express' });
// });

function getCooldownForOTPRequest(request: UserOTP | null) {
    if (request) {
        return Math.ceil(config.app.accounts.resetPassword.durations.request - ((new Date().getTime() - request.createdAt.getTime()) / 1000));
    } else {
        return 0
    }

}

router.get('/login', redirectIfLoggedIn, (req: Request, res: Response, next: NextFunction) => {
    req.body.redirect = req.query.redirect || "/";
    res.locals.head.pageTitle = "Login";
    res.render('pages/accounts/login', { register_error: null, values: req.body });
});

router.post('/login', redirectIfLoggedIn, LoginUser)

router.get('/signup', redirectIfLoggedIn, (req: Request, res: Response, next: NextFunction) => {
    res.locals.head.pageTitle = "Sign up";
    res.render('pages/accounts/signup', { register_error: null, values: req.body});
});

router.get('/signup/success', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
        if (!req.user.hasSeenWelcomePage) {
            await prisma.user.update({
                where: {id: req.user.id},
                data: {hasSeenWelcomePage: true}
            });
            res.locals.head.pageTitle = "Sign up successful";
            return res.render('pages/accounts/signupsuccessful');
        }
    }
    return res.redirect("/");


});

router.post('/signup', redirectIfLoggedIn, FormRegisterUser);

router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
    req.session.destroy(function(err) {
        if (err) {
            return res.status(500).send("Unable to log out.")
        }
    })
    res.redirect("/");
})

router.get('/forgotpassword', (req: Request, res: Response, next: NextFunction) => {
    const errorCodes: {[key: string]: string} = {
        'EXPIRED_SESSION': 'Your password reset session has expired. Please restart again.',

    }
    const error_message = req.query.err ? errorCodes[req.query.err as string] || "Unknown error occured" : null;

    return res.render('pages/accounts/forgotpassword', {step: 'request_otp', error: error_message});
})

router.post('/forgotpassword', async (req: Request, res: Response, next: NextFunction) => {
    const path = pathExtractor(req);
    const req_email = req.body.email
    const h_captcha_response = req.body['h-captcha-response'];

    const hCaptchaResult = await validateHCaptcha(h_captcha_response);
    if (!hCaptchaResult) {
        if (path === "/accounts/forgotpassword/verify") {
            return res.redirect('/accounts/forgotpassword/verify?err=COMPLETE_CAPTCHA');
        } else {
            return res.status(400).render('pages/accounts/forgotpassword', {step: 'request_otp', error: "You must complete the captcha."});
        }
    }
    if (!req_email) {
        return res.status(400).render('pages/accounts/forgotpassword', {step: 'request_otp', error: "Please enter a valid email."});
    }
    const user_from_email = await findUserByEmailInternalUsage(req_email);
    if (!user_from_email || user_from_email.active === "DELETED") {
        return res.status(200).send();
    }
    const OTPRequest = await getLatestOtpRequest(user_from_email.id, "PASSWORD_RESET");
    if (OTPRequest) {
        if (new Date().getTime() - OTPRequest.createdAt.getTime() <= config.app.accounts.resetPassword.durations.request * 1000) {
            return res.redirect('/accounts/forgotpassword/verify?err=OTP_REQ_COOLDOWN')
        }
        if (!OTPRequest.isUsed) {
            if (!OTPRequest.isOverwritten) {
                await updateOTPRequest(OTPRequest.id, {isOverwritten: true});
            }
        }
    }
    try {
        const otpReq = await createPasswordResetOTPRequest(user_from_email);
        await sendOTPEmail(user_from_email.email, otpReq.otp);
        const pwResetSession: PwResetSession = {
            email: user_from_email.email,
            resetToken: undefined,
            resetTokenExpiresAt: undefined,
        }
        req.session.pwResetSession = pwResetSession;
        await insertPasswordResetRequested(user_from_email.id, "email", req);
        return res.redirect('/accounts/forgotpassword/verify');
    } catch (e) {
        console.error(`Error generating OTP for ${user_from_email.id}:${user_from_email.email}: `, e);
        return res.render('/accounts/forgotpassword');
    }

})

router.get('/forgotpassword/verify', async (req: Request, res: Response, next: NextFunction) => {
    if (typeof req.session.pwResetSession === undefined || !req.session.pwResetSession) {
        return res.redirect('/accounts/forgotpassword')
    }
    const errorCodes: {[key: string]: string} = {
        'OTP_REQ_COOLDOWN': 'You have already requested for an OTP in the past minute. Please enter it below.',
        'OTP_NOT_VERIFIED': 'You have not verified that your account belongs to you. Please enter the OTP below.',
        'COMPLETE_CAPTCHA': 'You must complete the captcha to request for a new OTP.'

    }
    const error_message = req.query.err ? errorCodes[req.query.err as string] || "An unknown error occured" : null;
    const OTPRequest = await getLatestPasswordResetOTPRequestByEmail(req.session.pwResetSession.email);
    return res.render('pages/accounts/forgotpassword', { step: 'verify_otp', otp_cooldown: getCooldownForOTPRequest(OTPRequest), error: error_message, requested_email: req.session.pwResetSession.email });
})

router.post('/forgotpassword/verify', async (req: Request, res: Response, next: NextFunction) => {
    if (typeof req.session.pwResetSession === undefined || !req.session.pwResetSession) {
        return res.redirect('/accounts/forgotpassword')
    }
    const requestOtp = req.body.otp;
    const OTPRequest = await getLatestPasswordResetOTPRequestByEmail(req.session.pwResetSession.email);
    if (!OTPRequest || OTPRequest.otp !== requestOtp) {
        console.log(`OTPRequest object: ${OTPRequest}`)
        return res.render('pages/accounts/forgotpassword', { step: 'verify_otp', otp_cooldown: getCooldownForOTPRequest(OTPRequest), error: 'The OTP you entered is incorrect, please try again.', requested_email: req.session.pwResetSession.email });
    }
    console.log("OTP is correct")
    if (OTPRequest.isUsed) {
        console.log("OTP is used, returning error");
        return res.render('pages/accounts/forgotpassword', { step: 'verify_otp', otp_cooldown: getCooldownForOTPRequest(OTPRequest), error: 'Your OTP is expired. Please request for a new one.', requested_email: req.session.pwResetSession.email });
    }
    if (OTPRequest.isOverwritten) {
        console.log("OTP is overwritte, returning error")
        return res.render('pages/accounts/forgotpassword', { step: 'verify_otp', otp_cooldown: getCooldownForOTPRequest(OTPRequest), error: 'Please request for a new OTP.', requested_email: req.session.pwResetSession.email });
    }
    if (!verifyOTP(requestOtp, OTPRequest.secret)) {
        console.log("OTP could not be verified for authenticity, returning error")
        return res.render('pages/accounts/forgotpassword', { step: 'verify_otp', otp_cooldown: getCooldownForOTPRequest(OTPRequest), error: 'Your OTP is invalid. Please request for a new one.', requested_email: req.session.pwResetSession.email });
    }
    req.session.pwResetSession.resetToken = generateResetToken();
    req.session.pwResetSession.resetTokenExpiresAt = new Date(Date.now() + config.app.accounts.resetPassword.durations.password * 1000).getTime();
    await updateOTPRequest(OTPRequest.id, {isUsed: true});
    return res.redirect('/accounts/forgotpassword/reset')
})

router.get('/forgotpassword/reset', async (req: Request, res: Response, next: NextFunction) => {
    const errorCodes: {[key: string]: string} = {
    }
    const error_message = req.query.err ? errorCodes[req.query.err as string] || "An unknown error occured" : null;
    if (!req.session.pwResetSession) {
        return res.redirect('/accounts/forgotpassword')
    }
    if (!(req.session.pwResetSession.resetToken && req.session.pwResetSession.resetTokenExpiresAt)) {
        return res.redirect('/accounts/forgotpassword/verify?err=OTP_NOT_VERIFIED');
    }
    console.log()
    if (new Date().getTime() > req.session.pwResetSession.resetTokenExpiresAt) {
        delete req.session.pwResetSession;
        return res.redirect('/accounts/forgotpassword?err=EXPIRED_SESSION')
    }
    return res.render('pages/accounts/forgotpassword', {step: 'reset_password', error: error_message, requested_email: req.session.pwResetSession.email});
})

router.post('/forgotpassword/reset', async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.pwResetSession) {
        return res.redirect('/accounts/forgotpassword')
    }
    if (!(req.session.pwResetSession.resetToken && req.session.pwResetSession.resetTokenExpiresAt)) {
        return res.redirect('/accounts/forgotpassword/verify?err=OTP_NOT_VERIFIED');
    }
    if (new Date().getTime() > req.session.pwResetSession.resetTokenExpiresAt) {
        delete req.session.pwResetSession;
        return res.redirect('/accounts/forgotpassword?err=EXPIRED_SESSION')
    }
    const user = await findUserByEmailInternalUsage(req.session.pwResetSession.email);
    if (!user || user.active === "DELETED") {
        return res.status(200).redirect('/accounts/forgotpassword?err=MISSING_USER');
    }
    const { error, success } = await processPasswordUpdate(user.id, null, req.body.password, req.body.confirmpassword, true);
    if (error) {
        return res.status(400).render('pages/accounts/forgotpassword', {step: 'reset_password', error: error})
    }
    await insertPasswordResetCompleted(user.id, "otp", req);
    req.session.destroy(function(err) {})
    sendPasswordChangedEmail(user);

    return res.status(200).render('pages/accounts/forgotpassword', {step: 'complete'});
})

export default router;
