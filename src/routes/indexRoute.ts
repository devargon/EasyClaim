import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import {findAllClaimsByUserId} from "../services/claimService";
import currency from "currency.js";
const router = express.Router();

function formatMoney(money: string | number, stripped_down: boolean = false) {
  const a = currency(Number(money));
  let format;
  if (stripped_down) {
    return a.format({separator: '', symbol: ''});
  } else {
    return a.format();
  }
}

/* GET home page. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.render('pages/index');
});

router.get('/auth/existingaccount', (req: Request, res: Response, next: NextFunction) => {

  return res.status(200).render('pages/accounts/auth/base2')
})
router.get('/flash', (req: Request, res: Response, next: NextFunction) => {
  return res.json(req.flash("a1b2c3"))
})

export default router;
