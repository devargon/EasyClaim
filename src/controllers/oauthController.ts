import {NextFunction, Request, Response} from 'express';
import config from "../config/configLoader";
import {verifyGoogleCredential} from "../services/googleAuthService";
import {OAuthUserData} from "../types";
import {
    findUserByEmailInternalUsage,
    findUserByIdInternalUsage,
    findUserConnection,
    registerUser, registerUserWithConnection
} from "../services/accountService";
import {insertAccountCreated} from "../services/auditLogService";
import prisma from "../config/db";
import {initiateUserSession} from "./accountController";
import {generateToken, OAuthTokenPayload} from "../utils/jwtUtils";
import {downloadFileAsBuffer} from "../utils/fileDownloader";
import {generateNameAndMimeType} from "../utils/checkMime";
import {uploadProfilePicture} from "../services/settingsService";

const debug = require('debug')('easyclaim:oauthController');

const getCsrfTokenFromCookie = (req: Request) : string | null => {
    let csrfToken = null;
    const cookies = req.get("Cookie");
    if (!cookies) {
        return null;
    }
    cookies.split('; ').forEach(cookie => {
        cookie = cookie.trim();
        if (cookie.startsWith("g_csrf_token=")) {
            console.log("bruh")
            csrfToken = cookie.replace("g_csrf_token=", "");
            console.log(csrfToken);
        }
    })
    return csrfToken;
}

const oauthController = {
    handleGoogleRedirectCallback: async (req: Request, res: Response, next: NextFunction) => {
        // select_by can also be retrieved
        const { clientId, credential, g_csrf_token } = req.body;
        const cookieGCsrfToken = getCsrfTokenFromCookie(req);

        if (!g_csrf_token || g_csrf_token !== cookieGCsrfToken) {
            return res.status(400).send('Invalid CSRF token');
        }

        if (clientId !== config.app.oauth.google.clientId) {
            return res.status(400).send('Invalid client ID');
        }

        const userData = await verifyGoogleCredential(credential);
        return oauthController.handlePostOAuth(req, res, next, userData);
    },

    handleGoogleOneTapCallback: async(req: Request, res: Response, next: NextFunction) => {
        const { credential } = req.body;
        const userData = await verifyGoogleCredential(credential);
        return oauthController.handlePostOAuth(req, res, next, userData);

    },

    handlePostOAuth: async (req: Request, res: Response, next: NextFunction, userData: OAuthUserData) => {
        debug(`Checking for existing user for ${userData.email}`);
        const userConnection = await prisma.userConnection.findFirst({
            where: {
                service: userData.provider,
                providerUserId: userData.userId
            },
            include: {
                user: true
            }
        })

        if (userConnection) {
            debug(`User connection exists for ${userData.provider} account ID "${userData.userId}".`)
            const existingUser = userConnection.user;
            if (existingUser.active !== "DELETED") {
                if (userConnection.email === existingUser.email) {
                    debug(`${existingUser.email}'s ${userData.provider} connection: Both email and EasyClaim User ID matches. Will log in user`);
                    const [isSameLoggedInUser, loginSuccess] = await initiateUserSession(req, existingUser, "google-oauth");
                    if (loginSuccess) {
                        if (isSameLoggedInUser) {
                            return res.redirect(`/settings/connections?auth=success&provider=${userConnection.service}`)
                        } else {
                            return res.redirect('/')
                        }
                    } else {
                        return res.status(500).render('pages/errors/500');
                    }
                } else {
                    debug(`${existingUser.email}'s ${userData.provider} connection: Email DOES NOT MATCH (EasyClaim "${userData.email}" != ${userData.provider}"${userConnection.email}") but EasyClaim User ID matches. Will show diff email warning.`)
                    const payload: OAuthTokenPayload = {
                        easyClaimUserId: existingUser.id,
                        service: userConnection.service,
                        serviceUserId: userConnection.providerUserId,
                        accessToken: "",
                        action: 'emailDiscrepancy',
                        serviceEmail: userConnection.email,
                        userEmail: existingUser.email,
                        providerUserId: userData.provider,
                    }
                    const token = await generateToken(payload, "10m");
                    const [isSameLoggedInUser, loginSuccess] = await initiateUserSession(req, existingUser, "google-oauth");
                    res.redirect(`/auth/process?token=${token}`);
                }
            } else {
                debug("this should NEVER happen as conections are deleted when a user requestes to delete their account (their account will be soft deleted in the db)")
                return res.status(500).render('pages/errors/500');
            }
        } else {
            debug(`No connection exists for ${userData.provider} account "${userData.userId}". Checking for an existing account with email "${userData.email}...`)
            const existingUser = await findUserByEmailInternalUsage(userData.email);
            if (existingUser && existingUser.active !== "DELETED") {
                const isLinkedToAnotherAccount = await prisma.userConnection.findFirst({
                    where: {
                        service: userData.provider,
                        providerUserId: userData.userId,
                        NOT: { userId: existingUser.id },
                    },
                });
                if (isLinkedToAnotherAccount) {
                    debug(`User ${userData.email} already has a ${userData.provider} account linked to another EasyClaim account.`);
                    const payload: OAuthTokenPayload = {
                        easyClaimUserId: existingUser.id,
                        service: userData.provider,
                        serviceUserId: userData.userId,
                        action: 'unlinkExistingOAuthConnectionThenLink',
                        serviceEmail: userData.email,
                        userEmail: existingUser.email,
                    };

                    const token = await generateToken(payload, "10m");
                    return res.redirect(`/auth/process?token=${token}`);
                }
                const payload: OAuthTokenPayload = {
                    easyClaimUserId: existingUser.id,
                    service: userData.provider,
                    serviceUserId: userData.userId,
                    accessToken: "",
                    action: 'verifyOAuthConnection',
                    serviceEmail: userData.email,
                    userEmail: existingUser.email,
                    profilePicture: userData.picture,
                    providerUserId: userData.provider,
                }
                const token: string = await generateToken(payload, "10m");
                res.redirect(`/auth/process?token=${token}`);
            } else {
                debug(`Registering user ${userData.email}...`);
                const user = await registerUserWithConnection(userData.name, userData.email, null, userData.provider, userData.userId, "", "");
                if (userData.picture) {
                    const pictureBuffer = await downloadFileAsBuffer(userData.picture);
                    if (pictureBuffer) {
                        const [fileName, mimeType, error] = await generateNameAndMimeType(pictureBuffer);
                        if (error) {
                            return res.status(400).json({error_message: error})
                        }
                        const newProfilePicture = await uploadProfilePicture(user.id, fileName, mimeType, pictureBuffer);
                        debug(`Registration completed for ${userData.email}`);
                        await initiateUserSession(req, user, "google-oauth");
                        await insertAccountCreated(user.id, null, userData.name, userData.email, "oauth-google", req);
                        res.redirect('/accounts/signup/success')
                    }
                }
            }

        }

    }
}

export default oauthController;