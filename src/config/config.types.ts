export interface OAuthProviderConfig {
    clientId: string;
    icon: string;
    name: string;
    id: string;
    enabled: boolean;
}

export interface Config {
    app: {
        constants: {
            host: string;
            name: string;
        };
        accounts: {
            resetPassword: {
                durations: {
                    request: number;
                    otp: number;
                    password: number;
                };
            };
            profilePicture: {
                maxFileSizeInBytes: number;
            }
        };
        oauth: {
            google: OAuthProviderConfig;
            default: OAuthProviderConfig;
        };
        attachments: {
            maxFileNo: number;
            maxFileSizeInBytes: number;
        };
    };
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        from_email: string;
        bcc_email: string;
    };
}
