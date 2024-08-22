import {Request, Response, NextFunction} from 'express';
import 'express-session';
import {findAllClaimsByUserId, findClaimByShareId} from "../services/claimService";
import currency from "currency.js";
import {formatMoney} from "../config/utils";

const debug = require('debug')('easyclaim:claims');

export const showClaims = async (req: Request, res: Response, next: NextFunction) => {
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
    res.locals.head.pageTitle = "My Claims";
    res.render('pages/claims', {claims, formatMoney, pendingClaimAmt: pendingClaimAmt.value, completedClaimAmt: completedClaimAmt.value});
}

export const showSharedClaim = async (req: Request, res: Response, next: NextFunction) => {
    res.locals.showHeader = false;
    res.locals.head.pageTitle = "View Claim";
    const claim = await findClaimByShareId(req.params.shareId || "");
    if (claim) {
        const money_display = formatMoney(Number(claim.totalAmountAfterOffset))
        res.locals.head.pageTitle = `View Claim (${money_display})`
        res.locals.head.description=`${claim.user.name} is claiming ${money_display}. Tap here to see what they spent.`
        res.render('pages/public_claim', {formatMoney, claim}, );
    } else {
        next();
    }
};