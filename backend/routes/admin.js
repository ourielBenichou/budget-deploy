import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAdmin, publicUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/users', requireAdmin, async (_req, res) => {
    try {
        const users = await User.find()
            .select('username email displayName role createdAt')
            .sort({ createdAt: -1 });

        res.json(users.map(publicUser));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/users/:id', requireAdmin, async (req, res) => {
    try {
        const { displayName, username, email, role, password } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (displayName?.trim()) {
            user.displayName = displayName.trim();
        }

        if (username?.trim()) {
            const existingUsername = await User.findOne({
                username: username.trim(),
                _id: { $ne: user._id }
            });
            if (existingUsername) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            user.username = username.trim();
        }

        if (email?.trim()) {
            const normalizedEmail = email.trim().toLowerCase();
            const existingEmail = await User.findOne({
                email: normalizedEmail,
                _id: { $ne: user._id }
            });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            user.email = normalizedEmail;
        }

        if (role === 'admin' || role === 'user') {
            user.role = role;
        }

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }
            user.passwordHash = await bcrypt.hash(password, 10);
        }

        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        if (adminEmail && user.email === adminEmail) {
            user.role = 'admin';
        }

        await user.save();
        res.json({ user: publicUser(user) });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
