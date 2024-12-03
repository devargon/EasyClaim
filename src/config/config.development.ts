import { Config } from './config.types';

const config: Config = {
    app: {
        constants: {
            host: "http://localhost:3000",
            name: "EasyClaim (dev)",
        },
        accounts: {
            resetPassword: {
                durations: {
                    request: 60,
                    otp: 90,
                    password: 900,
                },
            },
            profilePicture: {
                maxFileSizeInBytes: 5000000,
            }
        },
        oauth: {
            google: {
                clientId: "773608657285-6st3votov9quvhes6sj73864int11nn7.apps.googleusercontent.com",
                icon: "/assets/icons/google-temp-icon.svg",
                name: "Google",
                id: "google",
                enabled: true,
            },
            default: {
                clientId: "",
                icon: "/assets/icons/icon-512.png",
                name: "Undefined",
                id: "undefined",
                enabled: false,
            }
        },
        attachments: {
            maxFileNo: 3,
            maxFileSizeInBytes: 8000000,
        },
    },
    smtp: {
        host: "email-smtp.eu-west-1.amazonaws.com",
        port: 465,
        secure: true,
        from_email: "EasyClaim by Nogra <easyclaim-noreply@nogra.app>",
        bcc_email: "nograbot@gmail.com",
    },
};

export default config;