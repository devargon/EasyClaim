import express, { Request, Response, NextFunction } from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import prisma from "../config/db";

const router = express.Router();

/* GET home page. */
router.get('/', redirectAsRequiresLogin, (req: Request, res: Response, next: NextFunction) => {
    res.render('expenses', { title: 'Expenses' });
});
export default router;
