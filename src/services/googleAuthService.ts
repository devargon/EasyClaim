import { OAuth2Client } from 'google-auth-library';
import {OAuthUserData} from "../types";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleCredential = async (credential: string): Promise<OAuthUserData> => {
    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error('Invalid credential');
    return {
        userId: payload.sub,
        email: payload.email || "",
        name: payload.name as string,
        picture: payload.picture? payload.picture.replace("=s96-sn-c", "=s1024-c").replace("=s96-c", "=s1024-c") : undefined,
        provider: 'google'
    };
};
