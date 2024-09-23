import express, {Request, Response, NextFunction} from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import prisma from "../config/db";
import currency from "currency.js";
import pug from "pug";
import {Decimal} from "@prisma/client/runtime/library";
import {processEmailUpdate, processPasswordUpdate, processProfileUpdate} from "../services/accountService";

const router = express.Router();

router.post('/profile', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);
    if (!req.user) { return res.status(401).send();}
    const { error, success } = await processProfileUpdate(req.user.id, req.body.name);

    if (error) {
        return res.status(400).json({error_message: error})
    }
    if (success) {
        req.user = success;
        res.locals.user = success;
        return res.status(200).json({ name: success.name });
    }
    return res.status(500).send();
})

router.post('/account/email', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);
    if (!req.user) { return res.status(401).send();}
    const { error, success } = await processEmailUpdate(req.user.id, req.body.email);

    if (error) {
        return res.status(400).json({error_message: error})
    }
    if (success) {
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
        req.user = success;
        res.locals.user = success;
        return res.status(200).json({});
    }
    return res.status(500).send();
})

export default router;
