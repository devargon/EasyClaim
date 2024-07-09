import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import {FormRegisterUser, LoginUser} from "../controllers/accountController";
import {redirectIfLoggedIn} from "../middlewares/redirectIfLoggedIn";
const router = express.Router();

/* GET home page. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.render('index', { title: 'Express' });
});

router.get('/login', redirectIfLoggedIn, (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
        return res.status(200).send("You're already logged in mofo");
    }
    res.render('login', { title: 'Login to EasyClaim', register_error: null, values: req.body });
});

router.post('/login', redirectIfLoggedIn, LoginUser)

router.get('/signup', redirectIfLoggedIn, (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
        return res.status(200).send("You're already logged in mofo");
    }
    res.render('signup', { title: 'Sign up for EasyClaim', register_error: null, values: req.body});
});

router.post('/signup', redirectIfLoggedIn, FormRegisterUser);

export default router;
