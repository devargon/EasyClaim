import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
const router = express.Router();

/* GET home page. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.render('index', { title: 'Express' });
});

router.get('/expenses', redirectAsRequiresLogin, (req: Request, res: Response, next: NextFunction) => {
  res.render('expenses', { title: 'Expenses' });
});

router.get('/claims', redirectAsRequiresLogin, (req: Request, res: Response, next: NextFunction) => {
  res.render('claims', { title: 'Claims' });
});

export default router;
