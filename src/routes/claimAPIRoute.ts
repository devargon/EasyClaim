import express, {Request, Response, NextFunction} from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import currency from "currency.js";
import {findExpenseByIdAndUser} from "../services/expenseService";
import {createClaim, deleteClaim, findClaimByIdAndUserId, updateClaim, setClaimToComplete} from "../services/claimService";
import prisma from "../config/db";

import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// noinspection JSUnusedLocalSymbols



router.get('/:claimId/share', redirectAsRequiresLogin, async(req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }

    const claimId = parseInt(req.params.claimId, 10);
    if (isNaN(claimId)) {
        return res.status(404).json({error_message: "Claim not found"});
    }

    const claim = await findClaimByIdAndUserId(claimId, req.user.id)
    console.log(claim);
    if (!claim) {
        return res.status(404).json({error_message: "Claim not found"});
    } else {

        const formatted_total_claim_amount = currency(Number(claim.totalAmountAfterOffset))
        const claim_share_link = `${req.protocol}://${req.get('host')}/claims/share/${claim.shareId}`
        function generate_share_link(lang: string) {
            if (claim) {
                return `${req.protocol}://${req.get('host')}/claims/share/${lang}/${claim.shareId}`
            } else return "";
        }
        let messages: { [key: string]: { message: string, url: string, html: string} } = {};
        messages.en = {
            message: `Hi, I'm claiming \$${formatted_total_claim_amount} for some expenses. See the details of it with this link: ${generate_share_link('en')}`,
            url: generate_share_link('en'),
            html: `Hi, I'm claiming \$${formatted_total_claim_amount} for some expenses. See the details of it with this link: <a class="text-reset" href="${generate_share_link('en')}">${generate_share_link('en')}</a>`
        };

        messages.ms = {
            message: `Hai, saya ingin membuat tuntutan sebanyak \$${formatted_total_claim_amount} untuk beberapa perbelanjaan. Lihat butirannya di pautan ini: ${generate_share_link('ms')}`,
            url: generate_share_link('my'),
            html: `Hai, saya ingin membuat tuntutan sebanyak \$${formatted_total_claim_amount} untuk beberapa perbelanjaan. Lihat butirannya di pautan ini: <a class="text-reset" href="${generate_share_link('ms')}">${generate_share_link('ms')}</a>`
        };

        messages.es = {
            message: `Hola, estoy reclamando \$${formatted_total_claim_amount} por algunos gastos. Vea los detalles en este enlace: ${generate_share_link('es')}`,
            url: generate_share_link('es'),
            html: `Hola, estoy reclamando \$${formatted_total_claim_amount} por algunos gastos. Vea los detalles en este enlace: <a class="text-reset" href="${generate_share_link('es')}">${generate_share_link('es')}</a>`
        };

        messages.ja = {
            message: `こんにちは、いくつかの費用について\$${formatted_total_claim_amount}を請求しています。詳細はこのリンクをご覧ください: ${generate_share_link('ja')}`,
            url: generate_share_link('ja'),
            html: `こんにちは、いくつかの費用について\$${formatted_total_claim_amount}を請求しています。詳細はこのリンクをご覧ください: <a class="text-reset" href="${generate_share_link('ja')}">${generate_share_link('ja')}</a>`
        };

        messages.de = {
            message: `Hallo, ich beantrage \$${formatted_total_claim_amount} für einige Ausgaben. Einzelheiten finden Sie unter diesem Link: ${generate_share_link('de')}`,
            url: generate_share_link('de'),
            html: `Hallo, ich beantrage \$${formatted_total_claim_amount} für einige Ausgaben. Einzelheiten finden Sie unter diesem Link: <a class="text-reset" href="${generate_share_link('de')}">${generate_share_link('de')}</a>`
        };

        messages.fr = {
            message: `Bonjour, je réclame \$${formatted_total_claim_amount} pour certaines dépenses. Voir les détails via ce lien : ${generate_share_link('fr')}`,
            url: generate_share_link('fr'),
            html: `Bonjour, je réclame \$${formatted_total_claim_amount} pour certaines dépenses. Voir les détails via ce lien : <a class="text-reset" href="${generate_share_link('fr')}">${generate_share_link('fr')}</a>`,
        };

        messages['zh-CN'] = {
            message: `您好，我正在报销一些费用，总金额为 \$${formatted_total_claim_amount}。详细信息请查看此链接：${generate_share_link('zh-CN')}`,
            url: generate_share_link('zh-CN'),
            html: `您好，我正在报销一些费用，总金额为 \$${formatted_total_claim_amount}。详细信息请查看此链接：<a class="text-reset" href="${generate_share_link('zh-CN')}">${generate_share_link('zh-CN')}</a>`,
        };
        return res.status(200).json({
            default_url: claim_share_link,
            default_message: `Hi, I'm claiming \$${formatted_total_claim_amount} for some expenses. See the details of it with this link: ${generate_share_link('en')}`,
            default_html: `Hi, I'm claiming \$${formatted_total_claim_amount} for some expenses. See the details of it with this link: <a href="${generate_share_link('en')}"><${generate_share_link('en')}`,
            messages: messages
        });
    }
})


router.get('/:claimId', redirectAsRequiresLogin, async(req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }

    const claimId = parseInt(req.params.claimId, 10);
    if (isNaN(claimId)) {
        return res.status(404).json({error_message: "Claim not found"});
    }

    const claim = await findClaimByIdAndUserId(claimId, req.user.id)
    console.log(claim);
    if (!claim) {
        return res.status(404).json({error_message: "Claim not found"});
    } else {
        return res.status(200).json(claim);
    }
})


router.post("/:claimId/cancel", redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const claimId = req.params.claimId;
    const claimIdActual = parseInt(claimId, 10);
    if (isNaN(claimIdActual)) {
        return res.status(400).json({error_message: "not a valid claimId"});
    }
    const claim = await prisma.claim.findUnique({where: {id: claimIdActual, userId: req.user.id}});
    if (!claim) {
        return res.status(404).json({error_message: `Claim #${claimIdActual} not found.`});
    }
    if (claim.status === "COMPLETED") {
        return res.status(400).json({error_message: `Claim #${claimIdActual} is complete and can't be deleted.`});
    } else {
        const a = await deleteClaim(claim.id);
        if (a) {
            return res.status(200).json({success_message: `Expense #${claimIdActual} deleted.`});
        } else {
            return res.status(404).json({error_message: `Expense #${claimIdActual} not found.`});
        }
    }
})

router.post("/:claimId/complete", redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const claimId = req.params.claimId;
    const claimIdActual = parseInt(claimId, 10);
    if (isNaN(claimIdActual)) {
        return res.status(400).json({error_message: "not a valid claimId"});
    }
    const claim = await prisma.claim.findUnique({where: {id: claimIdActual, userId: req.user.id}});
    if (!claim) {
        return res.status(404).json({error_message: `Claim #${claimIdActual} not found.`});
    }
    if (claim.status === "COMPLETED") {
        return res.status(400).json({error_message: `Claim #${claimIdActual} is already complete.`});
    } else {
        const a = await setClaimToComplete(claim.id);
        if (a) {
            return res.status(200).json({success_message: `Expense #${claimIdActual} complete.`});
        } else {
            return res.status(404).json({error_message: `Expense #${claimIdActual} not found.`});
        }
    }
})

router.post("/:claimId/edit", redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const offsetAmount = Number(req.body.offsetAmount);
    if (isNaN(offsetAmount)) {
        return res.status(404).json({error_message: `Offset amount is not a valid number.`});
    }
    const claimId = parseInt(req.params.claimId, 10);
    if (isNaN(claimId)) {
        return res.status(404).json({error_message: `Claim ${claimId} not found.`});
    }

    const existingClaim = await findClaimByIdAndUserId(claimId, req.user.id)
    if (!existingClaim) {
        return res.status(404).json({error_message: `Claim #${claimId} not found.`});
    }
    if (existingClaim.status === "COMPLETED") {
        return res.status(400).json({error_message: `Claim #${claimId} is complete and can't be edited.`});
    } else {
        const updatedClaim = await updateClaim(existingClaim.id, offsetAmount);
        if (updatedClaim) {
            return res.status(200).json(updatedClaim);
        } else {
            return res.status(404).json({error_message: `Expense #${claimId} not found.`});
        }
    }
})

router.post('/new', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }

    const {expenses, offsetAmount} = req.body;

    const foundExpenses = [];
    const foundExpensesIds:  number[] = [];

    let expenseTotal = currency(0);

    for (const expenseId of expenses) {
        const actualExpenseId = parseInt(expenseId, 10);
        if (isNaN(actualExpenseId)) {
            return res.status(400).json({error_message: "At least one or more expenses have an invalid ID."});
        }

        let expense = await findExpenseByIdAndUser(actualExpenseId, req.user.id);
        if (!expense) {
            return res.status(400).json({error_message: "At least one or more expenses could not be found while making this claim."});
        }
        if (expense.claimId || expense.claimComplete) {
            return res.status(400).json({error_message: "At least one or more expenses has already been included in a claim."})
        }
        expenseTotal = expenseTotal.add(Number(expense.amount));
        foundExpenses.push(expense);
        foundExpensesIds.push(actualExpenseId);
    }

    if (isNaN(offsetAmount)) {
        return res.status(400).json({ error_message: "Offset amount is invalid." });
    }

    if (offsetAmount > expenseTotal.value) {
        return res.status(400).json({error_message: "Offset amount is more than the total amount of the expenses."});
    }

    const claim = await createClaim(req.user.id, foundExpensesIds, expenseTotal.value, offsetAmount, uuidv4());
    if (claim) {
        return res.status(200).json(claim);
    } else {
        return res.status(500).json({error_message: "Claim might not have been created properly."});
    }
});



export default router;

