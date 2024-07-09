import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import {FormRegisterUser, LoginUser} from "../controllers/accountController";
const router = express.Router();

/* GET home page. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.render('index', { title: 'Express' });
});

router.get('/login', (req: Request, res: Response, next: NextFunction) => {
    res.render('login', { title: 'Login to EasyClaim' });
});

router.post('/login', LoginUser)

router.get('/register', (req: Request, res: Response, next: NextFunction) => {
    res.render('signup', { title: 'Sign up for EasyClaim', register_error: null, values: req.body});
});

router.post('/register', FormRegisterUser);

router.get('/expenses', (req: Request, res: Response, next: NextFunction) => {
    res.render('expenses', { title: 'Expenses' });
});

router.get('/claims', (req: Request, res: Response, next: NextFunction) => {
    res.render('claims', { title: 'Claims' });
});

export default router;
