module.exports = {
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
                    password: 900
                }
            }
        }
    },
    smtp: {
        host: 'email-smtp.eu-west-1.amazonaws.com',
        port: 465,
        secure: true,
        from_email: "EasyClaim by Nogra <easyclaim-noreply@nogra.app>",
        bcc_email: "nograbot@gmail.com"
    }
}