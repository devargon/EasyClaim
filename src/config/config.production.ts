import { Config } from './config.types';

const config: Config = {
    app: {
        constants: {
            host: "https://easyclaim.nogra.app",
            name: "EasyClaim",
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
                clientId: "406719413563-dehica2ku0gg1thoig9ldk5789eva9oi.apps.googleusercontent.com",
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