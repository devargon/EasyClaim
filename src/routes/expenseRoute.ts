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

// noinspection JSUnusedLocalSymbols
router.post('/api/new', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    let error_message;
    console.log(req.body);

    const amount = req.body.expense_amt;
    const amount_regex = /^\d+(?:\.\d{2})?$/
    console.log(amount)

    if (!amount || !amount_regex.test(amount)) {
        error_message = "You did not enter a valid expense amount.";
        return res.status(400).json({error_message});
    }
    const amount_actual = Number(amount);
    console.log(amount_actual);

    if (amount_actual < 0.01) {
        error_message = "You must spend at least $0.01 to record this expense!";
        return res.status(400).json({error_message});
    }

    const category = req.body.category;
    const category_actual = Number(category);
    if (isNaN(category_actual)) {
        error_message = "Please choose a valid expense category.";
        return res.status(400).json({error_message});
    }

    const spent_on = req.body.spent_dt;
    const spent_on_actual = new Date(spent_on);
    if (!isValidDate(spent_on_actual)) {
        error_message = "Please provide a valid date.";
        return res.status(400).json({error_message});
    }

    const description = req.body.description === "" ? null : req.body.description;

    const new_expense = await prisma.expense.create({
        data: {
            amount: amount_actual,
            description: description,
            categoryId: category_actual,
            spentOn: spent_on_actual,
            userId: req.user.id
        },
        include: {
            category: true,
        }
    })
    const renderedExpenseCard = pug.renderFile("./src/views/components/expense-card.pug", {
        expense: new_expense,
        formatMoney
    });
    const return_obj = {
        expense: new_expense,
        html: {
            id: `expense-${new_expense.id}`,
            render: renderedExpenseCard
        },
    }
    res.status(201).json(return_obj);
})
export default router;
