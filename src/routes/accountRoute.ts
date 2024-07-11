import express, { Request, Response, NextFunction } from 'express';
import {FormRegisterUser, LoginUser} from "../controllers/accountController";
import {redirectIfLoggedIn} from "../middlewares/redirectIfLoggedIn";
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import prisma from "../config/db";
import type {User} from "@prisma/client";

const router = express.Router();
/* GET home page. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.render('index', { title: 'Express' });
});

router.get('/login', redirectIfLoggedIn, (req: Request, res: Response, next: NextFunction) => {
    req.body.redirect = req.query.redirect || "/";
    res.render('login', { title: 'Login to EasyClaim', register_error: null, values: req.body });
});

router.post('/login', redirectIfLoggedIn, LoginUser)

router.get('/signup', redirectIfLoggedIn, (req: Request, res: Response, next: NextFunction) => {
    req.body.redirect = req.query.redirect || "/";
    res.render('signup', { title: 'Sign up for EasyClaim', register_error: null, values: req.body});
});

router.get('/signup/success', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
        if (!req.user.hasSeenWelcomePage) {
            await prisma.user.update({
                where: {id: req.user.id},
                data: {hasSeenWelcomePage: true}
            });
            return res.render('signupsuccessful', {title: "Signup Successful"})
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

export default router;
