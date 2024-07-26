import { AwsClient } from "aws4fetch";

const ACCOUNT_ID=process.env.CF_ACCOUNT_ID as string;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY as string;
const R2_BUCKET_NAME= process.env.R2_BUCKET_NAME as string;
const R2_SECRET = process.env.R2_SECRET as string;

const R2_URL = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

const client = new AwsClient({
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET
})