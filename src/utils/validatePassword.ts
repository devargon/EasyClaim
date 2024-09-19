export function validatePassword(password: string) {
    const validations = {
        length: password.length >= 6 && password.length <= 20,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
    };

    const isValid = Object.values(validations).every(Boolean);
    return isValid;
}