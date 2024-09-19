import session from 'express-session';

interface PwResetSession {
    email: string;
    resetToken?: string;
    resetTokenExpiresAt?: number;
}


declare module 'express-session' {
    export interface SessionData {
        userId: number;
        pwResetSession?: PwResetSession;
    }
}