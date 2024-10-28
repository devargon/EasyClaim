export interface OAuthUserData {
    userId: string;
    email: string;
    name: string;
    picture?: string; // Profile picture might be optional
    provider: 'google' | 'microsoft' | 'discord' | string; // Extendable for other providers
}
