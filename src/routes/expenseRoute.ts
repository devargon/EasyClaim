import express, {Request, Response, NextFunction} from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import prisma from "../config/db";
import currency from "currency.js";
import pug from "pug";
import {Decimal} from "@prisma/client/runtime/library";
import {findExpensesByUserId} from "../services/expenseService";

const router = express.Router();

function isValidDate(date: any): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
}

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
// noinspection JSUnusedLocalSymbols
router.get('/', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const categories = await prisma.category.findMany();
    let expenses = await findExpensesByUserId(req.user.id);

    const completedExpenses = expenses.filter(expense => expense.claimId !== null && expense.claimComplete);
    const incompleteExpenses = expenses.filter(expense => !expense.claimComplete)
    let incompleteExpensesAmt = currency(0.00);
    let pendingClaimExpenseAmt = currency(0.00);
    let completedExpenseAmt = currency(0.00);
    expenses.forEach(expense => {
        const amount = new Decimal(expense.amount).toNumber();
        if (expense.claimId === null) {
            incompleteExpensesAmt = incompleteExpensesAmt.add(amount);
        } else if (!expense.claimComplete) {
            pendingClaimExpenseAmt = pendingClaimExpenseAmt.add(amount);
        } else {
            completedExpenseAmt = completedExpenseAmt.add(amount);
        }
    });
    res.locals.head.pageTitle = "My Expenses";
    res.render('expenses', {
        completedExpenses,
        incompleteExpenses,
        categories: categories,
        formatMoney,
        amounts: {
            incomplete: incompleteExpensesAmt,
            pending: pendingClaimExpenseAmt,
            completed: completedExpenseAmt
        }
    });
});

export default router;
