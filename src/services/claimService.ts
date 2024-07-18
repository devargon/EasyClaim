import prisma from '../config/db';
import currency from "currency.js";

export function createClaim(userId: number, affectedExpenseIds: number[], totalExpenseAmount: number, offsetAmount: number) {
    return prisma.$transaction(async (tx) => {
        const claim = await tx.claim.create({
            data: {
                userId: userId,
                claimOffset: offsetAmount,
                totalAmount: totalExpenseAmount
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

export async function findAllClaimsByUserId(userId: number) {
    const claims = await prisma.claim.findMany({
        where: {
            userId: userId
        },
        include: {
            expenses: {
                include: {
                    category: true,
                },
            }
        }
    });
    return claims.map(claim => {
        return {
            ...claim,
            totalAmountAfterOffset: currency(Number(claim.totalAmount)).subtract(Number(claim.claimOffset)),
        };
    });
}
export async function findClaimByIdAndUserId(claimId: number, userId: number) {
    return prisma.claim.findUnique({
        where: {
            id: claimId,
            userId: userId
        },
        include: {
            expenses: {
                include: {
                    category: true,
                },
            }
        }
    });
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