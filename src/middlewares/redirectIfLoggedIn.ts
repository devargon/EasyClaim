import { Request, Response, NextFunction } from 'express';

export async function redirectIfLoggedIn(req: Request, res: Response, next: NextFunction) {
    if (req.user) {
        const rawRedirectUrl = req.query.redirect?.toString();
        const redirectUrl = rawRedirectUrl && rawRedirectUrl.startsWith("/") ? rawRedirectUrl : "/";
        return res.redirect(redirectUrl);
    }
    next();
}
