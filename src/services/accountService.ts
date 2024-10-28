import prisma from '../config/db';
import bcrypt from 'bcrypt';
import isEmail from "validator/lib/isEmail";
import {validatePassword} from "../utils/validatePassword";
import {generateOTP} from "../utils/generateOTP";
import {User} from "@prisma/client";

interface UserUpdateData {
    name?: string;
    email?: string;
    password?: string;
    createdAt?: Date;
}

interface UpdateOTPRequestOptions {
    isOverwritten?: boolean;
    isUsed?: boolean;
}

export async function registerUser(name: string, email: string, password: string | null, referer: string) {
    referer = referer.toLowerCase();
    const a = referer.split("-");
    if (password === null) {
        if (!(a[0] === "oauth" && ['google', 'microsoft'].includes(a.at(-1) || ""))) {
            throw new Error("Standard signup requires password")
        }
    }
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    return prisma.$transaction(async (tx) => {
        const user = await prisma.user.create({
            data: {
                name: name,
                email: email,
                password: hashedPassword,
            },
            include: {
                flags: true
            }
        });
        const userFlags = await prisma.userFlags.create({
            data: {
                userId: user.id
            }
        })
        user.flags = userFlags;
        return user;
    })
}

export async function findUserByEmailInternalUsage(email: string) {
    return prisma.user.findUnique({
        where: {email},
        include: {
            flags: true
        }
    });
}

export async function findUserByEmail(email: string, showSensitiveInformation: boolean = false) {
    return prisma.user.findUnique({
        where: {email},
        select: { id: true, name: true, createdAt: true, active: true },
    });
}

export async function findUserByIdInternalUsage(id: number) {
    return prisma.user.findUnique({
        where: {id},
        include: {
            flags: true
        }
    });
}

export async function findUserById(id: number) {
    return prisma.user.findUnique({
        where: {id},
        select: { id: true, name: true, createdAt: true},
    });
}

export async function getLatestPasswordResetOTPRequestByEmail(email: string) {
    return prisma.userOTP.findFirst({
        orderBy: {
            createdAt: 'desc'
        },
        where: {
            email,
            requestType: "PASSWORD_RESET"
        }
    })
}

export async function getLatestOtpRequest(userId: number, otp_class: string) {
    return prisma.userOTP.findFirst({
        orderBy: {
            createdAt: 'desc'
        },
        where: {
            userId,
            requestType: otp_class
        }
    })
}

export async function createPasswordResetOTPRequest(user: User) {
    return await createOTPRequest(user.id, user.email, "PASSWORD_RESET");
}

export async function createOTPRequest(userId: number, userEmail: string, otp_class: string) {
    const {token, secret} = generateOTP();
    return prisma.userOTP.create({
        data: {
            userId: userId,
            email: userEmail,
            requestType: otp_class,
            secret: secret,
            otp: token
        }
    });
}

export async function updateOTPRequest(id: number, options: UpdateOTPRequestOptions) {
    const updateData: any = {};

    if (options.isOverwritten !== undefined) {
        updateData.isOverwritten = options.isOverwritten;
    }
    if (options.isUsed !== undefined) {
        updateData.isUsed = options.isUsed;
    }

    return prisma.userOTP.update({
        data: updateData,
        where: { id }
    });
}




export async function processProfileUpdate(userId: number, newName: string) {
    if (!newName) {
        return { error: "Please enter a valid name." };
    } else if (newName.length > 50) {
        return { error: "Your name should not be longer than 50 characters." };
    }

    const result = await updateUser(userId, { name: newName });
    return { success: result };
}

export async function processEmailUpdate(userId: number, email: string) {
    if (!email) {
        return { error: "Please enter a valid name." };
    } else if (email.length > 255) {
        return { error: "Your email should not be longer than 255 characters." };
    } else if (!isEmail(email, {allow_display_name: false})) {
        return { error: "Please enter a valid email address." };
    }
    const userWithSameEmail = await findUserByEmail(email);
    if (userWithSameEmail && userWithSameEmail.active !== "DELETED") {
        return { error: `"${email}" has already been registered to an account.`}
    }

    const result = await updateUser(userId, { email: email });
    return { success: result };
}

export async function processPasswordUpdate(userId: number, old_password: null | string, new_password: string, confirm_password: string, isResetFlow: boolean = false) {
    const currentUser = await findUserByIdInternalUsage(userId);
    if (!currentUser || currentUser.active === "DELETED") {
        console.error(`Unable to find user with id ${userId}`);
        return {} // trigger 500
    }
    const noOldPasswordNeeded = isResetFlow || currentUser.password === null;
    if ((!noOldPasswordNeeded && !old_password) || !new_password || !confirm_password) {
        return { error: "You have not entered one or more required password fields." };
    } else if (new_password !== confirm_password) {
        return { error: "Your new passwords do not match." };
    }
    if (old_password === new_password) {
        return { error: "...what?" };
    }
    const requirementsOk = validatePassword(new_password)
    if (!requirementsOk) {
        return { error: "Your new password does not meet the minimum requirements. You need 6-20 characters in your passwords, of which includes at least 1 uppercase letter, 1 lowercase letter and 1 number." };
    }

    if (!noOldPasswordNeeded) {
        if (!old_password) {
            return { error: "Your current password is incorrect." };
        }
        const isValidPassword = noOldPasswordNeeded ? true : await bcrypt.compare(old_password, currentUser.password as string);
        console.log("Compared password hashes")
        if (!isValidPassword) {
            return { error: "Your current password is incorrect." };
        }
    }
    const newHashedPassword = await bcrypt.hash(new_password, 10);


    const result = await updateUser(userId, { password: newHashedPassword });
    return { success: result };
}


export async function updateUser(id: number, data: Partial<UserUpdateData>) {
    return prisma.user.update({
        where: {id},
        data: data
    })
}

export async function deleteUser(id: number) {
    return prisma.$transaction(async (tx) => {
        await tx.attachment.deleteMany({
            where: {
                uploaderId: id
            }
        })
        await tx.claim.deleteMany({
            where: {
                userId: id
            }
        })
        await tx.expense.deleteMany({
            where: {
                userId: id
            }
        })

        const uniqueName = `DeletedUser${id}`;
        const uniqueEmail = `easyclaim_deleteduser_${id}@deleted.nogra.app`;
        return prisma.user.update({
            where: {id},
            data: {
                name: uniqueName,
                email: uniqueEmail,
                active: "DELETED",
                deletedAt: new Date(),
            }
        })
    })
}