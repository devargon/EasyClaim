import prisma from '../config/db';
import {UserProfilePicture} from "@prisma/client";
import {v4 as uuidv4} from "uuid";
import {uploadFileDirect} from "../config/r2";

export async function uploadProfilePicture(userId: number, fileName: string, fileMimeType: string, data: Buffer) {
    const path = `${userId}/avatar/`;

    const fileSize = Buffer.byteLength(data);

    const fileUrl = await uploadFileDirect(path, fileName, Buffer.byteLength(data), fileMimeType, "", data);

    const profilePicture = await prisma.userProfilePicture.upsert({
        where: {userId: userId},
        update: {fileName: fileName,
            fileUrl: fileUrl,
            fileObjectUrl: `${path}${fileName}`,
            mimeType: fileMimeType,
            fileSize: fileSize,
            userId: userId,
            createdAt: new Date()
        },
        create: {
            fileName: fileName,
            fileUrl: fileUrl,
            fileObjectUrl: `${path}${fileName}`,
            mimeType: fileMimeType,
            fileSize: fileSize,
            userId: userId
        },
    });
    return profilePicture
}