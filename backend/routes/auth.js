import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { createToken, publicUser, requireAuth, applyAdminEmailRole } from '../middleware/auth.js';

const router = express.Router();

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

        const existing = await User.findOne({
            $or: [{ email: email.trim().toLowerCase() }, { username: username.trim() }]
        });
        if (existing) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            passwordHash,
            displayName: username.trim()
        });

        await applyAdminEmailRole(user);

        res.status(201).json({ token: createToken(user), user: publicUser(user) });
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

        const user = await User.findOne({
            $or: [{ username: username.trim() }, { email: username.trim().toLowerCase() }]
        });

        if (!user?.passwordHash) {
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

        let user = await User.findOne({
            $or: [{ googleId: payload.sub }, { email: payload.email?.toLowerCase() }]
        });

        if (!user) {
            const baseUsername = (payload.email?.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '');
            user = await User.create({
                email: payload.email.toLowerCase(),
                googleId: payload.sub,
                displayName: payload.name || baseUsername,
                username: `${baseUsername}_${payload.sub.slice(0, 6)}`
            });
        } else if (!user.googleId) {
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
