import express, {Request, Response, NextFunction} from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import prisma from "../config/db";
import currency from "currency.js";
import pug from "pug";
import {Decimal} from "@prisma/client/runtime/library";

const router = express.Router();

function isValidDate(date: any): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
}

function formatMoney(money: string | number) {
    return currency(Number(money)).format();
}

/* GET home page. */
// noinspection JSUnusedLocalSymbols
router.get('/', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const categories = await prisma.category.findMany();
    let expenses = await prisma.expense.findMany({where: {userId: req.user.id}, include: {category: true}, orderBy: {submittedAt: 'desc'}});

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

    setTimeout(() => {
    }, 3000);
    res.render('expenses', {
        title: 'Expenses',
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
