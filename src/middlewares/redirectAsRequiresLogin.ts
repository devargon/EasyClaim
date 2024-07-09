import { Request, Response, NextFunction } from 'express';

export async function redirectAsRequiresLogin(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        const rawRedirectUrl = "/accounts/login?redirect=" + encodeURIComponent(req.originalUrl);
        return res.redirect(rawRedirectUrl);
    }
    next();
}
