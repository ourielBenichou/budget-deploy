import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import Transaction from './models/Transaction.js';
import MonthSettings from './models/MonthSettings.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import User from './models/User.js';
import { requireAuth } from './middleware/auth.js';

import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, '../frontend');
const APP_VERSION = '2026-06-13-render-stable-v1';
const APK_DOWNLOAD_URL =
    'https://raw.githubusercontent.com/ourielBenichou/budget-deploy/main/frontend/downloads/budget-app.apk';

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
    .then(async () => {
        console.log('✅ Connected to MongoDB successfully!');
        await bootstrapAdminUser();
    })
    .catch((err) => console.error('❌ MongoDB connection error:', err));
console.log('Attempting to connect to MongoDB...');

async function bootstrapAdminUser() {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!adminEmail) return;

    const result = await User.updateMany(
        { email: adminEmail },
        { $set: { role: 'admin' } }
    );

    if (result.modifiedCount > 0) {
        console.log(`Granted admin role to ${adminEmail}`);
    }
}

app.get('/api/health', (_req, res) => {
    const mongoState = mongoose.connection.readyState;
    const mongoOk = mongoState === 1;
    res.status(mongoOk ? 200 : 503).json({
        ok: mongoOk,
        version: APP_VERSION,
        mongo: mongoOk ? 'connected' : 'disconnected'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.post('/api/transactions', requireAuth, async (req, res) => {
    try {
        if (!req.body.id) {
            req.body.id = Date.now().toString();
        }

        const newTransaction = new Transaction({
            id: req.body.id,
            userId: req.userId,
            description: req.body.description,
            amount: req.body.amount,
            type: req.body.type,
            month: req.body.month,
            day: req.body.day,
            date: req.body.date
        });

        await newTransaction.save();
        res.status(201).json(newTransaction);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/transactions', requireAuth, async (req, res) => {
    try {
        const filter = { userId: req.userId };
        if (req.query.month) filter.month = req.query.month;
        const transactions = await Transaction.find(filter);
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/months/:month', requireAuth, async (req, res) => {
    try {
        const settings = await MonthSettings.findOne({
            userId: req.userId,
            month: req.params.month
        });

        if (settings) {
            res.json({
                month: settings.month,
                bankBalance: settings.bankBalance,
                exists: true
            });
            return;
        }

        res.json({ month: req.params.month, bankBalance: 5000, exists: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/months/:month', requireAuth, async (req, res) => {
    try {
        const { bankBalance } = req.body;
        if (bankBalance == null || isNaN(bankBalance)) {
            return res.status(400).json({ error: 'bankBalance is required' });
        }

        const result = await MonthSettings.findOneAndUpdate(
            { userId: req.userId, month: req.params.month },
            { bankBalance },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
    try {
        const transactionId = req.params.id;
        const result = await Transaction.findOneAndDelete({
            userId: req.userId,
            $or: [{ id: transactionId }, { _id: transactionId }]
        });

        if (!result) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/transactions/:id', requireAuth, async (req, res) => {
    try {
        const result = await Transaction.findOneAndUpdate(
            {
                userId: req.userId,
                $or: [{ id: req.params.id }, { _id: req.params.id }]
            },
            {
                amount: req.body.amount,
                day: req.body.day,
                date: req.body.date,
                description: req.body.description
            },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use((req, res, next) => {
    if (req.path.endsWith('.js') || req.path.endsWith('.html')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
});

app.use(express.static(frontendPath, {
    setHeaders(res, filePath) {
        if (filePath.endsWith('.apk')) {
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            res.setHeader('Content-Disposition', 'attachment; filename="budget-app.apk"');
        }
    }
}));

app.get('/', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/app', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'app.html'));
});

app.get('/admin', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'admin.html'));
});

app.get('/download', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'download.html'));
});

app.get('/downloads/budget-app.apk', (_req, res) => {
    res.redirect(302, APK_DOWNLOAD_URL);
});

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    if (req.path === '/app.html') {
        return res.sendFile(path.join(frontendPath, 'app.html'));
    }
    if (req.path === '/admin.html') {
        return res.sendFile(path.join(frontendPath, 'admin.html'));
    }
    if (req.path === '/download.html') {
        return res.sendFile(path.join(frontendPath, 'download.html'));
    }
    next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT} (${APP_VERSION})`));
