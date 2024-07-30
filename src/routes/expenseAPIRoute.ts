import express, {Request, Response, NextFunction} from 'express';
import {redirectAsRequiresLogin} from "../middlewares/redirectAsRequiresLogin";
import prisma from "../config/db";
import currency from "currency.js";
import pug, {render} from "pug";
import {Decimal} from "@prisma/client/runtime/library";
import {deleteAttachment, findAttachmentsOfExpense, findExpenseByIdAndUser} from "../services/expenseService";
import R2_URL, {generatePresignedUrl} from "../config/r2";
import { v4 as uuidv4 } from 'uuid';
import {Expense} from "@prisma/client";

const router = express.Router();

function isValidDate(date: any): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
}


async function renderExpenseCardForFrontend(expenseId?: number, userId?: number, expense?: Expense) {
    let updatedExpense;
    if (expense) updatedExpense = expense;
    else if (expenseId && userId) updatedExpense = await findExpenseByIdAndUser(expenseId, userId);
    else updatedExpense = null;
    if (updatedExpense) {
        const renderedExpenseCard = pug.renderFile("./src/views/components/expense-card.pug", {
            expense: updatedExpense,
            formatMoney,
            showHeader: true
        });
        return {id: `expense-${updatedExpense.id}`, render: renderedExpenseCard};
    }
    return null;
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
            attachments: true
        }
    })
    const renderedExpenseCard = pug.renderFile("./src/views/components/expense-card.pug", {
        expense: new_expense,
        formatMoney,
        showHeader: true
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
                attachments: true
            }
        })
        if (updatedExpense) {
            const expense_html = await renderExpenseCardForFrontend(undefined, undefined, updatedExpense);
            const return_obj = {
                expense: updatedExpense,
                html: expense_html
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
    const expense = await findExpenseByIdAndUser(expenseIdActual, req.user.id);
    if (!expense) {
        return res.status(404).json({error_message: `Expense #${expenseIdActual} not found.`});
    }
    return res.status(200).json(expense);
})

router.post('/:expenseId/attachments/upload', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const UPLOAD_LIMIT = 3
    const FILESIZE_LIMIT = 8000000

    const expenseId = parseInt(req.params.expenseId, 10);
    if (isNaN(expenseId)) {
        return res.status(400).json({error_message: "Unable to upload attachment.", dev_error: "not a valid expenseId"});
    }
    console.log(req.user.id, expenseId);
    const expense = await findExpenseByIdAndUser(expenseId, req.user.id);
    if (!expense) {
        return res.status(404).send({error_message: `Expense ${expenseId} not found.`});
    }
    if (expense.claimId) {
        return res.status(400).json({error_message: `Expense #${expenseId} can't be edited while it's linked to a claim.`});
    } else if (expense.claimComplete) {
        return res.status(400).json({error_message: `Expense #${expenseId} has been claimed and can't be edited for tracking purposes.`});
    }
    const expense_attachments = await findAttachmentsOfExpense(expense.id);
    if (expense_attachments.length >= UPLOAD_LIMIT) {
        return res.status(403).json({error_message: `You have reached the limit of ${UPLOAD_LIMIT} attachments.`});
    }
    const fileName = req.body.fileName;
    const fileSize = parseInt(req.body.size, 10);
    console.log(fileSize);
    if (isNaN(fileSize) || fileSize > FILESIZE_LIMIT) {
        return res.status(403).json({error_message: "Your attachment's exceeds the maxmimum file size of 8 MB."});
    }
    const contentType = req.body.contentType;
    const metaValue = `Attachment for Expense ${expense.id}`;
    const path = `${req.user.id}/${expense.id}/attachments/${uuidv4()}/`;
    const url = await generatePresignedUrl(path, fileName, fileSize, contentType, metaValue);
    return res.status(200).json(url);
})

router.post('/:expenseId/attachments', redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const UPLOAD_LIMIT = 3;
    const expenseId = parseInt(req.params.expenseId, 10);
    if (isNaN(expenseId)) {
        return res.status(400).json({error_message: "Unable to upload attachment.", dev_error: "Not a valid expenseId"});
    }
    const expense = await findExpenseByIdAndUser(expenseId, req.user.id);
    if (!expense) {
        return res.status(404).send({error_message: `Expense ${expenseId} not found.`});
    }
    if (expense.claimId) {
        return res.status(400).json({error_message: `Expense #${expenseId} can't be edited while it's linked to a claim.`});
    } else if (expense.claimComplete) {
        return res.status(400).json({error_message: `Expense #${expenseId} has been claimed and can't be edited for tracking purposes.`});
    }
    const expense_attachments = await findAttachmentsOfExpense(expense.id);
    if (expense_attachments.length >= UPLOAD_LIMIT) {
        return res.status(403).json({error_message: `You have reached the limit of ${UPLOAD_LIMIT} attachments.`});
    }
    // Maybe handle deletion of file from bucket here
    const { fileName, fileUrl, fileSize, mimeType} = req.body;
    if (!fileName || !fileUrl || !fileSize || !mimeType) {
        return res.status(400).json({error_message: `Unable to upload attachment.`, dev_error: `One or more fields are missing.`});
    }
    const attachment = await prisma.attachment.create({
        data: {
            uploaderId: req.user.id,
            expenseId,
            fileName,
            fileObjectUrl: fileUrl,
            fileUrl: `${R2_URL}/${fileUrl}`,
            fileSize,
            mimeType
        },
    });
    if (attachment) {
        const expense_html = await renderExpenseCardForFrontend(expenseId, req.user.id);
        if (expense_html) {
            return res.status(201).json({attachment, html: expense_html});
        }
        return res.status(201).json({attachment});
    } else {
        return res.status(500).json({error_message: `Unable to upload attachment.`});
    }
})

router.post(`/:expenseId/attachments/:attachmentId/delete`, redirectAsRequiresLogin, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).send();
    }
    const expenseId = parseInt(req.params.expenseId, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    if (isNaN(expenseId)) {
        return res.status(400).json({error_message: "Unable to delete attachment.", dev_error: "Not a valid expenseId"});
    }
    if (isNaN(attachmentId)) {
        return res.status(400).json({error_message: "Unable to delete attachment.", dev_error: "Not a valid attachmentId"});
    }
    const expense = await findExpenseByIdAndUser(expenseId, req.user.id);
    if (!expense) {
        return res.status(404).send({error_message: `Expense ${expenseId} not found.`});
    }
    if (expense.claimId) {
        return res.status(400).json({error_message: `Expense #${expenseId} can't be edited while it's linked to a claim.`});
    } else if (expense.claimComplete) {
        return res.status(400).json({error_message: `Expense #${expenseId} has been claimed and can't be edited for tracking purposes.`});
    }
    const deletedAttachment = await deleteAttachment(attachmentId, expenseId, req.user.id);
    if (deletedAttachment) {
        const expense_html = await renderExpenseCardForFrontend(expenseId, req.user.id);
        if (expense_html) {
            return res.status(200).json({success_message: "Attachment deleted.", html: expense_html});
        }
        return res.status(200).json({success_message: "Attachment deleted."});
    } else {
        return res.status(404).json({error_message: `Attachment ${attachmentId} not found.`});
    }
})

export default router;

