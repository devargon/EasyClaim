import {findUserByIdInternalUsage} from "../services/accountService";
import {Request, Response, NextFunction} from "express";
import type { User } from "@prisma/client";

declare module "express-serve-static-core" {
    interface Request {
        user?: User;
    }
}

export async function fetchUser(req: Request, res: Response, next: NextFunction) {
    if (req.session.userId) {
        try {
            const user = await findUserByIdInternalUsage(req.session.userId);
            if (user) {
                req.user = user;
                res.locals.user = user;
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            await new Promise<void>((resolve, reject) => {
                req.session.destroy((err) => {
                    if (err) {}
                    resolve();
                });
            });
        }
    }
    next();
}
