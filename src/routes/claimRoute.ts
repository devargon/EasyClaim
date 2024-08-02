import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import {findAllClaimsByUserId, findClaimByShareId} from "../services/claimService";
import currency from "currency.js";
import {showClaims, showSharedClaim} from "../controllers/claimController";
import {formatMoney} from "../config/utils";
const router = express.Router();

/* GET home page. */
router.get('/', redirectAsRequiresLogin, showClaims);

router.get('/share/:lang/:shareId', async (req, res,next) => {
    const shareId = req.params.lang || "";
    return res.redirect(`/claims/share/${shareId}`);
});

router.get('/share/:shareId', showSharedClaim);

export default router;
