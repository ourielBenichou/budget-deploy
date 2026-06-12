import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import MonthSettings from '../models/MonthSettings.js';
import { requireAdmin, publicUser } from '../middleware/auth.js';

const router = express.Router();

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function buildBudgetSummary(bankBalance, transactions) {
    const totalIncome = transactions
        .filter(t => t.type === 'income' || t.type === 'one-time-income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter(t => t.type === 'fixed-expense' || t.type === 'variable-expense')
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        bankBalance,
        totalIncome,
        totalExpenses,
        netBalance: bankBalance + totalIncome - totalExpenses
    };
}

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

router.get('/users/:id/budget', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const month = req.query.month || getCurrentMonthKey();
        const [settings, transactions] = await Promise.all([
            MonthSettings.findOne({ userId: user._id, month }),
            Transaction.find({ userId: user._id, month })
        ]);

        const bankBalance = settings?.bankBalance ?? 5000;

        res.json({
            user: publicUser(user),
            month,
            bankBalance,
            transactions,
            summary: buildBudgetSummary(bankBalance, transactions)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        if (req.params.id === req.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Cannot delete the last admin' });
            }
        }

        const userObjectId = new mongoose.Types.ObjectId(req.params.id);
        await Promise.all([
            Transaction.deleteMany({ userId: userObjectId }),
            MonthSettings.deleteMany({ userId: userObjectId }),
            User.findByIdAndDelete(req.params.id)
        ]);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
