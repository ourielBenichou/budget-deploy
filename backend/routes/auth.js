import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import RegistrationRequest from '../models/RegistrationRequest.js';
import { createToken, publicUser, requireAuth, applyAdminEmailRole } from '../middleware/auth.js';

const router = express.Router();

async function findPendingRequest(email, username) {
    const filters = [{ email: email?.toLowerCase() }, { username: username?.trim() }].filter(
        item => Object.values(item)[0]
    );

    if (!filters.length) return null;
    return RegistrationRequest.findOne({ status: 'pending', $or: filters });
}

router.get('/config', (_req, res) => {
    res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '' });
});

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username?.trim() || !email?.trim() || !password) {
            return res.status(400).json({ error: 'Username, email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const trimmedUsername = username.trim();

        const existingUser = await User.findOne({
            $or: [{ email: normalizedEmail }, { username: trimmedUsername }]
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const pendingRequest = await findPendingRequest(normalizedEmail, trimmedUsername);
        if (pendingRequest) {
            return res.status(400).json({ error: 'Registration request already pending approval' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await RegistrationRequest.create({
            username: trimmedUsername,
            email: normalizedEmail,
            passwordHash,
            displayName: trimmedUsername,
            authType: 'local',
            status: 'pending'
        });

        res.status(202).json({
            message: 'Registration request submitted. You can log in after admin approval.'
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username?.trim() || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const trimmedUsername = username.trim();
        const normalizedEmail = trimmedUsername.toLowerCase();

        const user = await User.findOne({
            $or: [{ username: trimmedUsername }, { email: normalizedEmail }]
        });

        if (!user) {
            const pendingRequest = await findPendingRequest(normalizedEmail, trimmedUsername);
            if (pendingRequest) {
                return res.status(403).json({ error: 'Registration request pending admin approval' });
            }
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.passwordHash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        await applyAdminEmailRole(user);

        res.json({ token: createToken(user), user: publicUser(user) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'Missing Google credential' });
        }
        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(503).json({ error: 'Google login is not configured' });
        }

        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!googleRes.ok) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        const payload = await googleRes.json();
        if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
            return res.status(401).json({ error: 'Invalid Google client' });
        }

        const email = payload.email?.toLowerCase();
        let user = await User.findOne({
            $or: [{ googleId: payload.sub }, { email }]
        });

        if (!user) {
            const pendingRequest = await RegistrationRequest.findOne({
                status: 'pending',
                $or: [{ email }, { googleId: payload.sub }]
            });

            if (pendingRequest) {
                return res.status(403).json({ error: 'Registration request pending admin approval' });
            }

            const baseUsername = (email?.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '');
            await RegistrationRequest.create({
                email,
                googleId: payload.sub,
                displayName: payload.name || baseUsername,
                username: `${baseUsername}_${payload.sub.slice(0, 6)}`,
                authType: 'google',
                status: 'pending'
            });

            return res.status(403).json({
                error: 'Account not found. A registration request was sent for admin approval.'
            });
        }

        if (!user.googleId) {
            user.googleId = payload.sub;
            if (!user.displayName && payload.name) user.displayName = payload.name;
            await user.save();
        }

        await applyAdminEmailRole(user);

        res.json({ token: createToken(user), user: publicUser(user) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        await applyAdminEmailRole(user);
        res.json({ user: publicUser(user) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
