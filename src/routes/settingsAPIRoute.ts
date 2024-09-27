import express, {Request, Response, NextFunction} from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import prisma from "../config/db";
import currency from "currency.js";
import pug from "pug";
import {Decimal} from "@prisma/client/runtime/library";
import config from "../config/configLoader";
import {processEmailUpdate, processPasswordUpdate, processProfileUpdate} from "../services/accountService";
import {insertExpenseUpdated, insertPasswordChanged, insertProfileUpdated} from "../services/auditLogService";

const router = express.Router();

router.post('/profile', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);
    if (!req.user) { return res.status(401).send();}
    const changedFields: Record<string, { old: any; new: any }> = {};
    if (req.user.name !== req.body.name) { changedFields.name = { old: req.user.name, new: req.body.name }; }
    const { error, success } = await processProfileUpdate(req.user.id, req.body.name);

    if (error) {
        return res.status(400).json({error_message: error})
    }
    if (success) {
        if (Object.keys(changedFields).length > 0) {
            await insertProfileUpdated(req.user.id, changedFields, req);
        }
        req.user = success;
        res.locals.user = success;
        return res.status(200).json({ name: success.name });
    }
    return res.status(500).send();
})

router.post('/account/email', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);
    if (!req.user) { return res.status(401).send();}
    const changedFields: Record<string, { old: any; new: any }> = {};
    if (req.user.email !== req.body.email) { changedFields.email = { old: req.user.email, new: req.body.email }; }
    const { error, success } = await processEmailUpdate(req.user.id, req.body.email);

    if (error) {
        return res.status(400).json({error_message: error})
    }
    if (success) {
        await insertProfileUpdated(req.user.id, changedFields, req);
        req.user = success;
        res.locals.user = success;
        return res.status(200).json({ email: success.email });
    }
    return res.status(500).send();
})

router.post('/account/password', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);
    if (!req.user) { return res.status(401).send();}
    const { error, success } = await processPasswordUpdate(req.user.id, req.body.old_password, req.body.password, req.body.confirmpassword);

    if (error) {
        return res.status(400).json({error_message: error})
    }
    if (success) {
        await insertPasswordChanged(req.user.id, "settings", "user", req);
        req.user = success;
        res.locals.user = success;
        return res.status(200).json({});
    }
    return res.status(500).send();
})

router.get("/limits/upload", redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) { return res.status(401).send();}
    const UPLOAD_LIMIT = config.app.attachments.maxFileNo;
    const FILESIZE_LIMIT = config.app.attachments.maxFileSizeInBytes;
    return res.json({fileLimit: UPLOAD_LIMIT, fileSize: FILESIZE_LIMIT})
})

export default router;
