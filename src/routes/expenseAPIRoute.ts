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

function formatMoney(money: string | number, stripped_down: boolean = false) {
    const a = currency(Number(money));
    let format;
    if (stripped_down) {
        return a.format({separator: '', symbol: ''});
    } else {
        return a.format();
    }
}

function validateExpenseMiddleware(req: Request, res: Response, next: NextFunction) {
    const amount = req.body.expense_amt;
    const amount_regex = /^\d+(?:\.\d{2})?$/;
    console.log(amount);

    if (!amount || !amount_regex.test(amount)) {
        const error_message = "You did not enter a valid expense amount.";
        return res.status(400).json({ error_message });
    }
    const amount_actual = Number(amount);
    console.log(amount_actual);

    if (amount_actual < 0.01) {
        const error_message = "You must spend at least $0.01 to record this expense!";
        return res.status(400).json({ error_message });
    }

    const category = req.body.category;
    const category_actual = Number(category);
    if (isNaN(category_actual)) {
        const error_message = "Please choose a valid expense category.";
        return res.status(400).json({ error_message });
    }

    const spent_on = req.body.spent_dt;
    const spent_on_actual = new Date(spent_on);
    if (isNaN(spent_on_actual.getTime())) { // Using getTime to check for invalid date
        const error_message = "Please provide a valid date.";
        return res.status(400).json({ error_message });
    }

    const description = req.body.description === "" ? null : req.body.description;

    // Storing values in res.locals for access outside the middleware
    res.locals.expense = {
        amount: amount_actual,
        category: category_actual,
        spent_on: spent_on_actual,
        description: description
    };

    next(); // Proceed to the next middleware or route handler
}



// noinspection JSUnusedLocalSymbols
router.post('/new', redirectAsRequiresLogin, validateExpenseMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }

    const { amount, category, spent_on, description } = res.locals.expense;

    const new_expense = await prisma.expense.create({
        data: {
            amount: amount,
            description: description,
            categoryId: category,
            spentOn: spent_on,
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

router.post("/:expenseId/delete", redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const expenseId = req.params.expenseId;
    const expenseIdActual = parseInt(expenseId, 10);
    if (isNaN(expenseIdActual)) {
        return res.status(400).json({error_message: "not a valid expenseId"});
    }
    const expense = await prisma.expense.findFirst({where: {userId: req.user.id, id: expenseIdActual}, include: {category: true}});
    if (!expense) {
        return res.status(404).json({error_message: `Expense #${expenseIdActual} not found.`});
    }
    if (expense.claimId) {
        return res.status(400).json({error_message: `Expense #${expenseIdActual} is already linked to a claim.`});
    } else if (expense.claimComplete) {
        return res.status(400).json({error_message: `Expense #${expenseIdActual} has been claimed and can't be deleted for tracking purposes.`});
    } else {
        const a = await prisma.expense.delete({where: {userId: req.user.id, id: expense.id}});
        if (a) {
            return res.status(200).json({success_message: `Expense #${expenseIdActual} deleted.`});
        } else {
            return res.status(404).json({error_message: `Expense #${expenseIdActual} not found.`});
        }

    }
})

router.post("/:expenseId/edit", redirectAsRequiresLogin, validateExpenseMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const expenseId = req.params.expenseId;
    const expenseIdActual = parseInt(expenseId, 10);

    const { amount, category, spent_on, description } = res.locals.expense;

    if (isNaN(expenseIdActual)) {
        return res.status(400).json({error_message: "not a valid expenseId"});
    }
    const expense = await prisma.expense.findFirst({where: {userId: req.user.id, id: expenseIdActual}, include: {category: true}});
    if (!expense) {
        return res.status(404).json({error_message: `Expense #${expenseIdActual} not found.`});
    }
    if (expense.claimId) {
        return res.status(400).json({error_message: `Expense #${expenseIdActual} can't be edited while it's linked to a claim.`});
    } else if (expense.claimComplete) {
        return res.status(400).json({error_message: `Expense #${expenseIdActual} has been claimed and can't be edited for tracking purposes.`});
    } else {
        const updatedExpense = await prisma.expense.update({
            where: {
                id: expenseIdActual,
                userId: {
                    equals: req.user.id
                }
            },
            data: {
                amount: amount,
                description: description,
                categoryId: category,
                spentOn: spent_on
            },
            include: {
                category: true,
            }
        })
        if (updatedExpense) {
            const renderedExpenseCard = pug.renderFile("./src/views/components/expense-card.pug", {
                expense: updatedExpense,
                formatMoney
            });
            const return_obj = {
                expense: updatedExpense,
                html: {
                    id: `expense-${updatedExpense.id}`,
                    render: renderedExpenseCard
                },
            }
            res.status(200).json(return_obj);
        } else {
            return res.status(404).json({error_message: `Expense #${expenseIdActual} not found.`});
        }

    }
})

router.get("/:expenseId", redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const expenseId = req.params.expenseId;
    const expenseIdActual = parseInt(expenseId, 10);
    if (isNaN(expenseIdActual)) {
        return res.status(400).json({error_message: "not a valid expenseId"});
    }
    const expense = await prisma.expense.findFirst({where: {userId: req.user.id, id: expenseIdActual}, include: {category: true}});
    if (!expense) {
        return res.status(404).json({error_message: `Expense #${expenseIdActual} not found.`});
    }
    return res.status(200).json(expense);
})





export default router;

