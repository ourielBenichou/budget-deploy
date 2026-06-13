import jwt from 'jsonwebtoken';
import crypto from 'crypto';

let cachedKeys = null;
let cacheTime = 0;

async function getApplePublicKeys() {
    if (cachedKeys && Date.now() - cacheTime < 60 * 60 * 1000) {
        return cachedKeys;
    }

    const response = await fetch('https://appleid.apple.com/auth/keys');
    if (!response.ok) {
        throw new Error('Failed to fetch Apple public keys');
    }

    const data = await response.json();
    cachedKeys = data.keys;
    cacheTime = Date.now();
    return cachedKeys;
}

export async function verifyAppleIdToken(idToken, clientId) {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded?.header?.kid) {
        throw new Error('Invalid Apple token');
    }

    const keys = await getApplePublicKeys();
    const jwk = keys.find(key => key.kid === decoded.header.kid);
    if (!jwk) {
        throw new Error('Apple signing key not found');
    }

    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });

    return jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: clientId
    });
}
