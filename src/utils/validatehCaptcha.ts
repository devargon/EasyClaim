import dotenv from 'dotenv';
import * as hcaptcha from "hcaptcha";

dotenv.config();

const hCaptchaSecret = process.env.HCAPTCHA_SECRET || '';

export async function validateHCaptcha(token: string) {
    if (!token) {
        console.error("HCaptcha Response token is EMPTY")
        return false;
    }
    const data = await hcaptcha.verify(hCaptchaSecret, token);
    if (data.success) {
        return true
    } else {
        console.error(`Captcha validate result was not true: ${JSON.stringify(data)}`);
        return false;
    }
}