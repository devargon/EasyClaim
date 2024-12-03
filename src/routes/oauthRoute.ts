import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import currency from "currency.js";
import oauthController from "../controllers/oauthController";
import prisma from "../config/db";
import {generateToken, OAuthTokenPayload, verifyToken} from "../utils/jwtUtils";
import config from "../config/configLoader";
import {OAuthProviderConfig} from "../config/config.types";
import {findUserByIdInternalUsage} from "../services/accountService";
import bcrypt from "bcrypt";
import {initiateUserSession} from "../controllers/accountController";
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
const router = express.Router();
const debug = require('debug')('easyclaim:oauthRoute');

function getClientDetails(service: string): OAuthProviderConfig {
    let oAuthClient = config.app.oauth.default;
    switch (service) {
        case "google":
            oAuthClient = config.app.oauth.google;
            break;
        default:
            break;
    }
    return oAuthClient;
}

function maskEmail(email: string) {
    const [username, domain] = email.split('@');
    const usernameLength = username.length;
    let maskedUsername;
    if (usernameLength <= 3) {
        maskedUsername = '*'.repeat(usernameLength - 1) + username[usernameLength - 1];
    } else {
        maskedUsername = username.slice(0, 2) + '*'.repeat(usernameLength - 4) + username.slice(-2);
    }
    return `${maskedUsername}@${domain}`;
}

router.post('/:provider/unlink', redirectAsRequiresLogin, oauthController.handleOAuthUnlink)

router.post('/google/callback', oauthController.handleGoogleRedirectCallback);

router.post('/google-onetap/callback', oauthController.handleGoogleOneTapCallback);

router.get('/process', async (req: Request, res: Response, next: NextFunction) => {
    if (!req.query.token) {
        return res.status(400).json({error_message: "Missing token"});
    }
    const result: OAuthTokenPayload | null = await verifyToken(req.query.token as string);
    if (!result) {
        return res.status(401).send();
    }
    const oAuthClient = getClientDetails(result.service);
    if (result.userEmail) {
        result.userEmail = maskEmail(result.userEmail);
    }
    if (result.serviceEmail) {
        result.serviceEmail = maskEmail(result.serviceEmail);
    }
    return res.render('pages/accounts/authadditionalsteps', {token: req.query.token, oAuthStep: result.action, oAuthPayload: result, oAuthClient});
})

router.post('/process', async (req: Request, res: Response, next: NextFunction) => {
    debug("/oauth/process: Received POST OAuth request")
    if (!req.query.token) {
        return res.status(400).json({error_message: "Missing token"});
    }
    const result: OAuthTokenPayload | null = await verifyToken(req.query.token as string);
    if (!result) {
        return res.status(401).send();
    }
    debug("/oauth/process: POST OAuth token decoded successfully")
    const oAuthClient = getClientDetails(result.service);
    switch (result.action) {
        case "emailDiscrepancy":
            debug("/oauth/process: Token is for an emailDiscrepancy request");
            if (result.easyClaimUserId) {
                await prisma.userFlags.upsert({
                    where: {userId: result.easyClaimUserId},
                    update: {WARN_OAUTH_EMAIL_DIFFERENT: true},
                    create: {userId: result.easyClaimUserId, WARN_OAUTH_EMAIL_DIFFERENT: true},
                })
                return res.redirect("/");
            } else {
                result.action = "error";
                const token = await generateToken(result, '24h');
                return res.redirect(`/oauth/process?token=${token}`);
            }
        case "unlinkExistingOAuthConnectionThenLink":
            debug("/oauth/process: Token is for an unlinkExistingOAuthConnectionThenLink request");
            debug("/oauth/process > unlinkExistingOAuthConnectionThenLink: Checking for existing user connection...");
            const existingUserConnection = await prisma.userConnection.findFirst({
                where: {
                    providerUserId: result.serviceUserId,
                    service: result.service
                },
                include: {
                    user: true
                }
            })
            if (existingUserConnection) {
                await prisma.userConnection.delete({
                    where: {
                        id: existingUserConnection.id
                    }
                })
                debug("/oauth/process > unlinkExistingOAuthConnectionThenLink: Existing user connection DELETED. Redirecting user to verify account now.");
                result.action = "verifyOAuthConnection";
            } else {
                debug("/oauth/process > unlinkExistingOAuthConnectionThenLink: Existing user connection NOT FOUND.");
                result.action = "error";
            }
            const token = await generateToken(result, '24h');
            return res.redirect(`/oauth/process?token=${token}`);

        case "verifyOAuthConnection":
            debug("/oauth/process: Token is for an verifyOAuthConnection request. Checking presence of password");
            const reqPassword = req.body.password;
            if (!reqPassword) {
                debug("No password provided, rejecting request");
                return res.status(401).render('pages/accounts/authadditionalsteps', {token: req.query.token, oAuthStep: result.action, oAuthPayload: result, oAuthClient})
            }
            const user = await findUserByIdInternalUsage(result.easyClaimUserId || 0);
            if (!user) {
                debug(`/oauth/process > verifyOAuthConnection: USER WITH ID ${result.easyClaimUserId} NOT FOUND`);
                return res.status(500).render('pages/errors/500');
            }
            if (await bcrypt.compare(reqPassword, user.password || "")) {
                debug(`/oauth/process > verifyOAuthConnection: User provided password is correct for potential account.`);
                debug(`/oauth/process > verifyOAuthConnection: Creating user connection...`);
                const newUserConnection = await prisma.userConnection.create({
                    data: {
                        userId: user.id,
                        service: result.service,
                        providerUserId: result.serviceUserId,
                        email: result.serviceEmail,
                    }
                })
                if (newUserConnection) {
                    debug(`/oauth/process > verifyOAuthConnection: User connection created.`);
                    result.action = "success";
                    const [isSameLoggedInUser, loginSuccess] = await initiateUserSession(req, user, "google-oauth");
                    return res.render('pages/accounts/authadditionalsteps', {token: req.query.token, oAuthStep: result.action, oAuthPayload: result, oAuthClient});
                }
            } else {
                debug(`/oauth/process > verifyOAuthConnection: User provided password is INCORRECT.`);
                if (result.userEmail) {
                    result.userEmail = maskEmail(result.userEmail);
                }
                if (result.serviceEmail) {
                    result.serviceEmail = maskEmail(result.serviceEmail);
                }
                return res.render('pages/accounts/authadditionalsteps', {token: req.query.token, oAuthStep: result.action, oAuthPayload: result, oAuthClient,
                    alerts: [{type: "danger", content: `The password you provided for your ${config.app.constants.name} account (${result.userEmail}) is incorrect.`}]});
            }
            break;
        default:
            return res.status(500).render('pages/errors/500');
    }
    if (result.userEmail) {
        result.userEmail = maskEmail(result.userEmail);
    }
    if (result.serviceEmail) {
        result.serviceEmail = maskEmail(result.serviceEmail);
    }
    return res.render('pages/accounts/authadditionalsteps', {token: req.query.token, oAuthStep: result.action, oAuthPayload: result, oAuthClient});
})
export default router;