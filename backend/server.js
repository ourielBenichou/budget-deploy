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

import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const legacyFrontendPath = path.join(__dirname, '../frontend');
const distPath = path.join(legacyFrontendPath, 'dist');
const hasDistBuild = fs.existsSync(path.join(distPath, 'index.html'));
const frontendPath = hasDistBuild ? distPath : legacyFrontendPath;
const APP_VERSION = '2026-06-17-fix-frontend-build-v1';

if (!hasDistBuild) {
    console.warn('WARNING: frontend/dist not found — serving dev index.html (app may appear blank). Run frontend build.');
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

if (hasDistBuild) {
    app.use('/src', express.static(path.join(legacyFrontendPath, 'src'), staticOptions));
}

app.get('/', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/app', (_req, res) => {
    if (hasDistBuild) {
        return res.sendFile(path.join(distPath, 'index.html'));
    }
    res.sendFile(path.join(legacyFrontendPath, 'app.html'));
});

app.get(['/admin', '/admin.html'], (_req, res) => {
    res.sendFile(path.join(legacyFrontendPath, 'admin.html'));
});

app.get(['/download', '/download.html'], (_req, res) => {
    const downloadFile = hasDistBuild
        ? path.join(distPath, 'download.html')
        : path.join(legacyFrontendPath, 'download.html');

    if (fs.existsSync(downloadFile)) {
        return res.sendFile(downloadFile);
    }

    res.sendFile(path.join(legacyFrontendPath, 'download.html'));
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

    if (!hasDistBuild && req.path === '/app.html') {
        return res.sendFile(path.join(legacyFrontendPath, 'app.html'));
    }

    if (req.path === '/login.html') {
        if (hasDistBuild) {
            return res.sendFile(path.join(distPath, 'index.html'));
        }
        return res.sendFile(path.join(legacyFrontendPath, 'login.html'));
    }

    next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT} (${APP_VERSION})`));
