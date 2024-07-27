import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import {findAllClaimsByUserId, findClaimByShareId} from "../services/claimService";
import currency from "currency.js";
import {showClaims, showSharedClaim} from "../controllers/claimController";
const router = express.Router();

/* GET home page. */
router.get('/', redirectAsRequiresLogin, showClaims);

router.get('/share/:shareId', showSharedClaim);

export default router;
