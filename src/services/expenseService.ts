import prisma from '../config/db';


export async function findExpenseById(id: number) {
    return prisma.expense.findUnique({
        where: {id},
    });
}

export async function findExpenseByIdAndUser(id: number, userId: number) {
    return prisma.expense.findUnique({
        where: {id, userId},
    });
}