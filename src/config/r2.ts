import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import R2 from "./r2";
dotenv.config();

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID as string;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY as string;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME as string;
const R2_SECRET = process.env.R2_SECRET as string;
const R2_BUCKET_CUSTOM_DOMAIN = process.env.R2_BUCKET_CUSTOM_DOMAIN as string;


let R2_URL: string;
if (R2_BUCKET_CUSTOM_DOMAIN) {
    R2_URL = `https://${R2_BUCKET_CUSTOM_DOMAIN}`;
} else {
    R2_URL = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}`;
}

const client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET,
    },
});

const debug = require('debug')('easyclaim:r2');

export async function generatePresignedUrl(path: string, fileName: string, fileSize: number, contentType: string, metaValue: string) {
    const fileUrl = `${R2_URL}/${path}${fileName}`
    if (path.startsWith("/")) {
        path = path.substring(1);
    }
    if (!path.endsWith("/")) {
        path = `${path}/`;
    }
    if (fileName.startsWith("/")) {
        fileName = fileName.substring(1);
    }

    debug(`Generating Presigned URL for ${fileUrl} with contentType ${contentType}, contentLength ${fileSize.toString()}`);

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: `${path}${fileName}`,
        ContentType: contentType,
        ContentLength: fileSize,
        Metadata: {
            'custom': metaValue,
        },
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    return {
        upload: signedUrl,
        fileUrl: `${path}${fileName}`,
    };
}

export async function deleteFile(key: string) {
    const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    });
    const response = await client.send(command);
    return response;
}

export async function uploadFileDirect(path: string, fileName: string, fileSize: number, contentType: string, metaValue: string, fileContent: Buffer) {
    const fileUrl = `${R2_URL}/${path}${fileName}`
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: `${path}${fileName}`,
        ContentType: contentType,
        ContentLength: fileSize,
        Metadata: {
            'custom': metaValue,
        },
        Body: fileContent
    });
    const response = await client.send(command);
    console.log(`S3 client response: ${response}`);
    return fileUrl;
}


export default R2_URL;