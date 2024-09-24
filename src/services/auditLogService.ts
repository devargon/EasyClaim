import prisma from '../config/db';
import { AuditAction, Prisma } from '@prisma/client';
import { Request } from 'express';

export async function insertAuditLog(
    userId: number | null,  // userId can be null
    action: AuditAction,
    details: Prisma.InputJsonValue = {},  // Use Prisma.InputJsonValue instead
    req: Request                     // Accept Express.Request as last parameter
) {
    const ipAddress = req.get('x-forwarded-for') || req.socket.remoteAddress || req.ip || null;
    const userAgent = req.get('User-Agent') || null;

    return prisma.auditLog.create({
        data: {
            userId: userId,                // Allow null userId
            action: action,
            details: details ?? {},        // Ensure details is never null, fallback to empty object
            ipAddress: ipAddress,
            userAgent: userAgent,
        },
    });
}

export async function insertUserLoginSuccess(userId: number, email: string, method: string, req: Request) {
    const details = {
        email: email,
        method: method,
    };
    return await insertAuditLog(userId, AuditAction.USER_LOGIN_SUCCESS, details, req);
}

export async function insertUserLoginFailure(email: string, failureReason: string, method: string, req: Request) {
    const details = {
        email: email,
        failureReason: failureReason,
        method: method,
    };
    return await insertAuditLog(null, AuditAction.USER_LOGIN_FAILURE, details, req);
}

export async function insertPasswordChanged(
    userId: number,
    method: string,
    initiatedBy: string,  // "user" or "admin"
    req: Request
) {
    const details = {
        method: method,
        initiatedBy: initiatedBy,
    };
    return await insertAuditLog(userId, AuditAction.PASSWORD_CHANGED, details, req);
}

export async function insertPasswordResetRequested(
    userId: number | null,
    deliveryMethod: string,  // e.g., "email", "SMS"
    req: Request
) {
    const details = {
        deliveryMethod: deliveryMethod,
    };
    return await insertAuditLog(userId, AuditAction.PASSWORD_RESET_REQUESTED, details, req);
}

export async function insertPasswordResetCompleted(
    userId: number,
    method: string,
    req: Request
) {
    const details = {
        method: method,  // e.g., "email_link", "security_questions"
    };
    return await insertAuditLog(userId, AuditAction.PASSWORD_RESET_COMPLETED, details, req);
}

export async function insertProfileUpdated(
    userId: number,
    changedFields: Record<string, { old: any; new: any }>,
    req: Request
) {
    const details = {
        changedFields: changedFields,
    };
    return await insertAuditLog(userId, AuditAction.PROFILE_UPDATED, details, req);
}

export async function insertAccountCreated(
    userId: number,
    referrer: string | null,
    name: string,
    email: string,
    req: Request
) {
    const details = {
        name: name,
        email: email,
        referrer: referrer,
    };
    return await insertAuditLog(userId, AuditAction.ACCOUNT_CREATED, details, req);
}

export async function insertAccountDeleted(
    userId: number,
    deletedBy: string,  // "user" or "admin"
    reason: string | null,
    req: Request
) {
    const details = {
        deletedBy: deletedBy,
        reason: reason,
    };
    return await insertAuditLog(userId, AuditAction.ACCOUNT_DELETED, details, req);
}

export async function insertAccountLocked(
    userId: number,
    reason: string,
    lockedBy: string,     // "system" or "admin"
    req: Request,
    adminUserId?: number // Include if locked by admin

) {
    const details: any = {
        reason: reason,
        lockedBy: lockedBy,
    };
    if (adminUserId) {
        details.adminUserId = adminUserId;
    }
    return await insertAuditLog(userId, AuditAction.ACCOUNT_LOCKED, details, req);
}

export async function insertAccountUnlocked(
    userId: number,
    unlockedBy: string,   // "system" or "admin"
    req: Request,
    adminUserId?: number, // Include if unlocked by admin
) {
    const details: any = {
        unlockedBy: unlockedBy,
    };
    if (adminUserId) {
        details.adminUserId = adminUserId;
    }
    return await insertAuditLog(userId, AuditAction.ACCOUNT_UNLOCKED, details, req);
}

export async function insertTwoFactorEnabled(
    userId: number,
    method: string,  // e.g., "authenticator_app", "SMS"
    req: Request
) {
    const details = {
        method: method,
    };
    return await insertAuditLog(userId, AuditAction.TWO_FACTOR_ENABLED, details, req);
}

export async function insertTwoFactorDisabled(
    userId: number,
    reason: string | null,
    req: Request
) {
    const details = {
        reason: reason,
    };
    return await insertAuditLog(userId, AuditAction.TWO_FACTOR_DISABLED, details, req);
}

export async function insertSessionTerminated(
    userId: number,
    terminatedBy: string,  // "user", "system", or "admin"
    req: Request
) {
    const details = {
        terminatedBy: terminatedBy,
    };
    return await insertAuditLog(userId, AuditAction.SESSION_TERMINATED, details, req);
}

export async function insertClaimSubmitted(
    userId: number,
    claimId: number,
    offset: number,
    totalAmount: number,
    totalAmountAfterOffset: number,
    req: Request
) {
    const details = {
        claimId: claimId,
        offset: offset,
        totalAmount: totalAmount,
        totalAmountAfterOffset: totalAmountAfterOffset
    };
    return await insertAuditLog(userId, AuditAction.CLAIM_SUBMITTED, details, req);
}

export async function insertClaimUpdated(
    userId: number,
    claimId: number,
    changedFields: Record<string, { old: any; new: any }>,
    req: Request
) {
    const details = {
        claimId: claimId,
        changedFields: changedFields,
    };
    return await insertAuditLog(userId, AuditAction.CLAIM_UPDATED, details, req);
}

export async function insertClaimDeleted(
    userId: number,
    claimId: number,
    req: Request
) {
    const details = {
        claimId: claimId,
    };
    return await insertAuditLog(userId, AuditAction.CLAIM_DELETED, details, req);
}

export async function insertClaimStatusChanged(
    userId: number,
    claimId: number,
    oldStatus: string,
    newStatus: string,
    req: Request
) {
    const details = {
        claimId: claimId,
        oldStatus: oldStatus,
        newStatus: newStatus,
    };
    return await insertAuditLog(userId, AuditAction.CLAIM_STATUS_CHANGED, details, req);
}

export async function insertExpenseCreated(
    userId: number,
    expenseId: number,
    amount: string,  // String to preserve decimal precision
    categoryId: number | null,
    req: Request
) {
    const details = {
        expenseId: expenseId,
        amount: amount,
        categoryId: categoryId,
    };
    return await insertAuditLog(userId, AuditAction.EXPENSE_CREATED, details, req);
}

export async function insertExpenseUpdated(
    userId: number,
    expenseId: number,
    changedFields: Record<string, { old: any; new: any }>,
    req: Request
) {
    const details = {
        expenseId: expenseId,
        changedFields: changedFields,
    };
    return await insertAuditLog(userId, AuditAction.EXPENSE_UPDATED, details, req);
}

export async function insertExpenseDeleted(
    userId: number,
    expenseId: number,
    deletedBy: string,  // "user" or "admin"
    reason: string | null,
    req: Request
) {
    const details = {
        expenseId: expenseId,
        deletedBy: deletedBy,
        reason: reason,
    };
    return await insertAuditLog(userId, AuditAction.EXPENSE_DELETED, details, req);
}

export async function insertAttachmentUploaded(
    userId: number,
    attachmentId: number,
    expenseId: number | null,
    fileName: string,
    fileSize: number,  // Size in bytes
    mimeType: string,
    req: Request
) {
    const details = {
        attachmentId: attachmentId,
        expenseId: expenseId,
        fileName: fileName,
        fileSize: fileSize,
        mimeType: mimeType,
    };
    return await insertAuditLog(userId, AuditAction.ATTACHMENT_UPLOADED, details, req);
}

export async function insertAttachmentDeleted(
    userId: number,
    attachmentId: number,
    deletedBy: string,  // "user" or "admin"
    reason: string | null,
    req: Request
) {
    const details = {
        attachmentId: attachmentId,
        deletedBy: deletedBy,
        reason: reason,
    };
    return await insertAuditLog(userId, AuditAction.ATTACHMENT_DELETED, details, req);
}

export async function insertAttachmentPresignedUrlRequested(
    userId: number,
    reason: string | null,
    req: Request
) {
    const details = {
        reason: reason,
    };
    return await insertAuditLog(userId, AuditAction.ATTACHMENT_PRESIGNED_URL_REQUESTED, details, req);
}
