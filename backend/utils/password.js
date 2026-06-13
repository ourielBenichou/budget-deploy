const PASSWORD_RULE_MESSAGE =
    'Password must be at least 6 characters and include uppercase, lowercase, and a number';

export function validatePassword(password) {
    if (!password || password.length < 6) {
        return PASSWORD_RULE_MESSAGE;
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        return PASSWORD_RULE_MESSAGE;
    }

    return null;
}
