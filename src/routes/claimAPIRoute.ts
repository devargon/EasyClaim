import express, {Request, Response, NextFunction} from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import currency from "currency.js";
import {findExpenseByIdAndUser} from "../services/expenseService";
import {createClaim} from "../services/claimService";

const router = express.Router();

// noinspection JSUnusedLocalSymbols
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

    const claim = await createClaim(req.user.id, foundExpensesIds, offsetAmount);
    if (claim) {
        return res.status(200).json(claim);
    } else {
        return res.status(500).json({error_message: "Claim might not have been created properly."});
    }
});



export default router;

