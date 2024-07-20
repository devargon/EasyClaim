import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import {findAllClaimsByUserId, findClaimByShareId} from "../services/claimService";
import currency from "currency.js";
const router = express.Router();

function formatMoney(money: string | number, stripped_down: boolean = false) {
    const a = currency(Number(money));
    if (stripped_down) {
        return a.format({separator: '', symbol: ''});
    } else {
        return a.format();
    }
}

/* GET home page. */
router.get('/', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const claims = await findAllClaimsByUserId(req.user.id);
    let pendingClaimAmt = currency(0.00);
    let completedClaimAmt = currency(0.00);
    claims.forEach(claim => {
        const amount = Number(claim.totalAmountAfterOffset);
        if (claim.status === "PENDING") {
            pendingClaimAmt = pendingClaimAmt.add(amount);
        } else if (claim.status === "COMPLETED") {
            completedClaimAmt = completedClaimAmt.add(amount);
        }
    });
    res.render('claims', {title: 'Claims', claims, formatMoney, pendingClaimAmt: pendingClaimAmt.value, completedClaimAmt: completedClaimAmt.value});
});

router.get('/shared/:shareId', async (req: Request, res: Response, next: NextFunction) => {
    res.locals.showHeader = false;
    const claim = await findClaimByShareId(req.params.shareId || "");
    if (claim) {
        res.render('public_claim', {formatMoney, claim}, );
    } else {
        next();
    }

});

export default router;
