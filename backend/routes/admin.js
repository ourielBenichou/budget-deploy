import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import MonthSettings from '../models/MonthSettings.js';
import RegistrationRequest from '../models/RegistrationRequest.js';
import { requireAdmin, publicUser, applyAdminEmailRole } from '../middleware/auth.js';
import { validatePassword } from '../utils/password.js';
import { seedRecurringTransactions, getPreviousMonthEndingBalance } from '../utils/seedRecurring.js';

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

function publicRegistrationRequest(request) {
    return {
        id: request._id.toString(),
        username: request.username,
        email: request.email,
        displayName: request.displayName,
        authType: request.authType,
        status: request.status,
        createdAt: request.createdAt
    };
}

router.get('/registration-requests', requireAdmin, async (req, res) => {
    try {
        const status = req.query.status || 'pending';
        const requests = await RegistrationRequest.find({ status })
            .sort({ createdAt: -1 });

        res.json(requests.map(publicRegistrationRequest));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/registration-requests/:id/approve', requireAdmin, async (req, res) => {
    try {
        const request = await RegistrationRequest.findById(req.params.id);

        if (!request || request.status !== 'pending') {
            return res.status(404).json({ error: 'Pending registration request not found' });
        }

        const existingUser = await User.findOne({
            $or: [{ email: request.email }, { username: request.username }]
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const user = await User.create({
            username: request.username,
            email: request.email,
            displayName: request.displayName,
            passwordHash: request.passwordHash,
            googleId: request.googleId,
            appleId: request.appleId,
            role: 'user'
        });

        await applyAdminEmailRole(user);

        request.status = 'approved';
        request.reviewedAt = new Date();
        request.reviewedBy = req.userId;
        await request.save();

        res.json({
            message: 'Registration approved',
            user: publicUser(user),
            request: publicRegistrationRequest(request)
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/registration-requests/:id/reject', requireAdmin, async (req, res) => {
    try {
        const request = await RegistrationRequest.findById(req.params.id);

        if (!request || request.status !== 'pending') {
            return res.status(404).json({ error: 'Pending registration request not found' });
        }

        request.status = 'rejected';
        request.reviewedAt = new Date();
        request.reviewedBy = req.userId;
        await request.save();

        res.json({
            message: 'Registration rejected',
            request: publicRegistrationRequest(request)
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

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
            const passwordError = validatePassword(password);
            if (passwordError) {
                return res.status(400).json({ error: passwordError });
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
        const transactions = await seedRecurringTransactions(user._id, month);
        const settings = await MonthSettings.findOne({ userId: user._id, month });
        const bankBalance = settings?.bankBalance
            ?? await getPreviousMonthEndingBalance(user._id, month);

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
