import fs from 'fs';
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
import { buildTransactionLookup } from './utils/transactionQuery.js';
import { seedRecurringTransactions, getPreviousMonthEndingBalance } from './utils/seedRecurring.js';

import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const legacyFrontendPath = path.join(__dirname, '../frontend');
const stagedPath = path.join(__dirname, 'public');
const distPath = fs.existsSync(path.join(stagedPath, 'index.html'))
    ? stagedPath
    : path.join(legacyFrontendPath, 'dist');
const hasDistBuild = fs.existsSync(path.join(distPath, 'index.html'));
const frontendPath = hasDistBuild ? distPath : legacyFrontendPath;
const APP_VERSION = '2026-07-07-react-components-v1';

function resolveFrontendFile(...parts) {
    const stagedFile = path.join(stagedPath, ...parts);
    if (fs.existsSync(stagedFile)) {
        return stagedFile;
    }

    return path.join(legacyFrontendPath, ...parts);
}

if (!hasDistBuild) {
    console.warn('WARNING: production frontend build not found — app may appear blank. Run frontend build and stage script.');
} else if (distPath === stagedPath) {
    console.log('Serving React build from backend/public');
} else {
    console.log('Serving React build from frontend/dist');
}
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

        let transactions = await Transaction.find(filter);

        if (req.query.month && transactions.length === 0) {
            transactions = await seedRecurringTransactions(req.userId, req.query.month);
        }

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
            if (settings.recurringSeeded && settings.bankBalance === 5000) {
                const carriedBalance = await getPreviousMonthEndingBalance(req.userId, req.params.month);
                if (carriedBalance !== 5000) {
                    settings.bankBalance = carriedBalance;
                    await settings.save();
                }
            }

            res.json({
                month: settings.month,
                bankBalance: settings.bankBalance,
                exists: true
            });
            return;
        }

        const bankBalance = await getPreviousMonthEndingBalance(req.userId, req.params.month);
        res.json({ month: req.params.month, bankBalance, exists: false });
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
        const result = await Transaction.findOneAndDelete(
            buildTransactionLookup(req.userId, req.params.id)
        );

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
        const update = {};
        if (req.body.amount != null && !Number.isNaN(req.body.amount)) update.amount = req.body.amount;
        if (req.body.day != null && !Number.isNaN(req.body.day)) update.day = req.body.day;
        if (req.body.date != null) update.date = req.body.date;
        if (req.body.description != null) update.description = req.body.description;

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const result = await Transaction.findOneAndUpdate(
            buildTransactionLookup(req.userId, req.params.id),
            update,
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

const staticOptions = {
    setHeaders(res, filePath) {
        if (filePath.endsWith('.apk')) {
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            res.setHeader('Content-Disposition', 'attachment; filename="budget-app.apk"');
        }
    }
};

app.use(express.static(frontendPath, staticOptions));

const srcStaticPath = fs.existsSync(path.join(stagedPath, 'src'))
    ? path.join(stagedPath, 'src')
    : path.join(legacyFrontendPath, 'src');

if (fs.existsSync(srcStaticPath)) {
    app.use('/src', express.static(srcStaticPath, staticOptions));
}

app.get('/', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/app', (_req, res) => {
    if (hasDistBuild) {
        return res.sendFile(path.join(distPath, 'index.html'));
    }
    res.status(404).send('Frontend build not found');
});

app.get(['/admin', '/admin.html'], (_req, res) => {
    if (hasDistBuild) {
        return res.sendFile(path.join(distPath, 'index.html'));
    }
    res.status(404).send('Frontend build not found');
});

app.get(['/download', '/download.html'], (_req, res) => {
    const downloadFile = resolveFrontendFile('download.html');
    res.sendFile(downloadFile);
});

app.get('/downloads/budget-app.apk', (_req, res) => {
    res.redirect(302, APK_DOWNLOAD_URL);
});

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }

    if (hasDistBuild && !path.extname(req.path)) {
        return res.sendFile(path.join(distPath, 'index.html'));
    }

    if (req.path === '/login.html' && hasDistBuild) {
        return res.sendFile(path.join(distPath, 'index.html'));
    }

    next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT} (${APP_VERSION})`));
