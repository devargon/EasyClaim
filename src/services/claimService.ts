import prisma from '../config/db';

export function createClaim(userId: number, affectedExpenseIds: number[], offsetAmount: number) {
    return prisma.$transaction(async (tx) => {
        const claim = await tx.claim.create({
            data: {
                userId: userId,
                claimOffset: offsetAmount
            }
        });

        await tx.expense.updateMany({
            data: {
                claimId: claim.id
            },
            where: {
                id: {
                    in: affectedExpenseIds,
                },
            }
        });

        return tx.claim.findUnique({
            where: {id: claim.id},
            include: {
                expenses: true
            }
        });
    })
}

export function deleteClaim(claimId: number) {
    return prisma.$transaction(async (tx) => {

        await tx.expense.updateMany({
            data: {
                claimId: null
            },
            where: {
                claimId: claimId
            }
        });

        return tx.claim.delete({
            where: {
                id: claimId
            }
        });
    })
}