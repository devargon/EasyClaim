import { authenticator } from 'otplib';
import config from "../config/configLoader";

authenticator.options = { step: config.app.accounts.resetPassword.durations.otp }; // Set the step value to 300 seconds (5 minutes)

export const generateOTP = (): { token: string, secret: string } => {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);
    return { token, secret };
};

export const verifyOTP = (token: string, secret: string) => {
    return authenticator.verify({ token, secret });
}
