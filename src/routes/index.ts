import express, { Request, Response, NextFunction } from 'express';
const router = express.Router();

/* GET home page. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.render('index', { title: 'Express' });
});

router.get('/login', (req: Request, res: Response, next: NextFunction) => {
  res.render('login', { title: 'Login to EasyExpense' });
});

router.get('/signup', (req: Request, res: Response, next: NextFunction) => {
  res.render('signup', { title: 'Sign up for EasyExpense' });
});

router.get('/expenses', (req: Request, res: Response, next: NextFunction) => {
  res.render('expenses', { title: 'Expenses' });
});

router.get('/claims', (req: Request, res: Response, next: NextFunction) => {
  res.render('claims', { title: 'Claims' });
});

export default router;
