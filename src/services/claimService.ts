import prisma from '../config/db';
import currency from "currency.js";

export function createClaim(userId: number, affectedExpenseIds: number[], totalExpenseAmount: number, offsetAmount: number, uuid: string) {
    let totalAmountAfterOffset = totalExpenseAmount;
    if (offsetAmount) totalAmountAfterOffset = currency(totalExpenseAmount).subtract(offsetAmount).value;
    return prisma.$transaction(async (tx) => {
        const claim = await tx.claim.create({
            data: {
                userId: userId,
                claimOffset: offsetAmount,
                totalAmount: totalExpenseAmount,
                totalAmountAfterOffset: totalAmountAfterOffset,
                shareId: uuid

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
    return prisma.claim.findMany({
        where: {
            userId: userId
        },
        include: {
            expenses: {
                include: {
                    category: true,
                },
            }
        },
        orderBy: [
            {
                status: 'asc'
            },
            {
                submittedAt: 'desc'
            },
        ]
    });
    // return claims.map(claim => {
    //     return {
    //         ...claim,
    //         totalAmountAfterOffset: currency(Number(claim.totalAmount)).subtract(Number(claim.claimOffset)),
    //     };
    // });
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


export async function findClaimByShareId(shareId: string) {
    return prisma.claim.findUnique({
        where: {
            shareId: shareId
        },
        include: {
            expenses: {
                include: {
                    category: true,
                    attachments: true,
                },
            },
            user: {
                select: {
                    id: true,
                    name: true,
                }
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

export async function updateClaim(claimId: number, offsetAmount: number) {
    await prisma.$executeRaw`
        UPDATE claim
        SET claimOffset            = ${offsetAmount},
            totalAmountAfterOffset = totalAmount - claimOffset
        WHERE id = ${claimId}
    `;
    return prisma.claim.findUnique({
        where: {
            id: claimId
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

export async function setClaimToComplete(claimId: number) {
    return prisma.$transaction(async (tx) => {

        await tx.expense.updateMany({
            data: {
                claimId: claimId,
                claimComplete: true,
            },
            where: {
                claimId: claimId
            }
        });

        return tx.claim.update({
            data: {
                status: "COMPLETED"
            },
            where: {
                id: claimId
            }
        });
    })
}