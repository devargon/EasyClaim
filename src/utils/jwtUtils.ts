import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface OAuthTokenPayload extends JWTPayload {
    easyClaimUserId?: number;
    service: string;
    serviceUserId: string;
    userEmail?: string;
    serviceEmail: string;
    profilePicture?: string;
    accessToken?: string;
    action: 'emailDiscrepancy' | 'verifyOAuthConnection' | 'unlinkExistingOAuthConnectionThenLink' | 'success' | 'error'
}

type TokenPayload = OAuthTokenPayload;

// Function to generate a JWT
export const generateToken = async (payload: TokenPayload, duration: string): Promise<string> => {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(duration)
        .sign(secret);
};

// Function to verify a JWT
export const verifyToken = async (token: string): Promise<TokenPayload | null> => {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as TokenPayload; // Type assertion to TokenPayload
    } catch (error) {
        return null; // Token is invalid or expired
    }
};
