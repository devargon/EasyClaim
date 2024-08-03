import prisma from '../config/db';
import {deleteFile} from "../config/r2";


export async function findExpenseById(id: number) {
    return prisma.expense.findUnique({
        where: {id},
    });
}

export async function findExpensesByUserId(userId: number) {
    return prisma.expense.findMany({
        where: {userId},
        include: {
            attachments: true,
            category: true,
        },
        orderBy: {
            spentOn: "desc"
        }
    })
}

export async function findExpenseByIdAndUser(id: number, userId: number) {
    return prisma.expense.findUnique({
        where: {id, userId},
        select: {id: true, userId: true, spentOn: true, submittedAt: true, editedAt: true, amount: true, description: true, category: true, claim: true, claimComplete: true, claimId: true, attachments: true}
    });
}

export async function findAttachmentsOfExpense(expenseId: number) {
    return prisma.attachment.findMany({
        where: {expenseId}
    })
}

export async function deleteAttachment(id: number, expenseId: number, userId: number) {

    const deletedAttachment = await prisma.attachment.delete({
        where: {expenseId, uploaderId: userId, id}
    });
    if (deletedAttachment) {
        try {
            await deleteFile(deletedAttachment.fileObjectUrl);
        } catch (e) {
            console.error(`Failed to delete object ${deletedAttachment.fileObjectUrl} from bucket: `, e);
        }
    }
    return deletedAttachment;
}