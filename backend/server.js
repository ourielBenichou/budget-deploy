import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import Transaction from './models/Transaction.js';
import MonthSettings from './models/MonthSettings.js';

import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, '../frontend');
const APP_VERSION = '2026-06-12-sync-v2';

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
    .then(async () => {
        console.log('✅ Connected to MongoDB successfully!');
        await migrateLegacyTransactions();
    })
    .catch((err) => console.error('❌ MongoDB connection error:', err));
console.log('Attempting to connect to MongoDB...');

async function migrateLegacyTransactions() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const result = await Transaction.updateMany(
        { $or: [{ month: { $exists: false } }, { month: null }, { month: '' }] },
        { $set: { month: currentMonth } }
    );
    if (result.modifiedCount > 0) {
        console.log(`Migrated ${result.modifiedCount} legacy transactions to ${currentMonth}`);
    }
}

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, version: APP_VERSION });
});

// נתיב להוספת הוצאה/הכנסה חדשה
app.post('/api/transactions', async (req, res) => {
    try {
        if (!req.body.id) {
            req.body.id = Date.now().toString();
        }
        const newTransaction = new Transaction(req.body);
        await newTransaction.save();
        res.status(201).json(newTransaction);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// אתה צריך להוסיף את החלק הזה ב-server.js כדי שיהיה אפשר "למשוך" נתונים:
app.get('/api/transactions', async (req, res) => {
    try {
        const filter = req.query.month ? { month: req.query.month } : {};
        const transactions = await Transaction.find(filter);
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/months/:month', async (req, res) => {
    try {
        const settings = await MonthSettings.findOne({ month: req.params.month });
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

app.put('/api/months/:month', async (req, res) => {
    try {
        const { bankBalance } = req.body;
        if (bankBalance == null || isNaN(bankBalance)) {
            return res.status(400).json({ error: 'bankBalance is required' });
        }

        const result = await MonthSettings.findOneAndUpdate(
            { month: req.params.month },
            { bankBalance },
            { upsert: true, new: true }
        );

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// מחיקת רשומה
app.delete('/api/transactions/:id', async (req, res) => {
    try {
        const transactionId = req.params.id;
        console.log("Attempting to delete transaction with ID:", transactionId);

        // ניסיון מחיקה לפי השדה id (כפי שאתה יוצר ב-main.js)
        // או לפי _id (ה-ID האוטומטי של מונגו)
        const result = await Transaction.findOneAndDelete({ 
            $or: [{ id: transactionId }, { _id: transactionId }] 
        });

        if (!result) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json({ message: "Deleted successfully" });
    } catch (err) {
        console.error("Server Error during delete:", err);
        res.status(500).json({ error: err.message });
    }
});

// עדכון רשומה (עריכה)
app.put('/api/transactions/:id', async (req, res) => {
    try {
        const result = await Transaction.findOneAndUpdate(
            { $or: [{ id: req.params.id }, { _id: req.params.id }] },
            req.body,
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: "Transaction not found" });
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

app.use(express.static(frontendPath));

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT} (${APP_VERSION})`));
