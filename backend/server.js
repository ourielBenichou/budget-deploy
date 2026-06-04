import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Transaction from './models/Transaction.js'; // ייבוא המודל שיצרנו

import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// התחברות ל-DB (הקוד שכבר יש לך)

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000 // ינסה להתחבר רק ל-5 שניות
})
    .then(() => console.log('✅ Connected to MongoDB successfully!'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));
console.log("Attempting to connect to MongoDB...");

// נתיב להוספת הוצאה/הכנסה חדשה
app.post('/api/transactions', async (req, res) => {
    try {
        const newTransaction = new Transaction(req.body);
        await newTransaction.save();
        res.status(201).json(newTransaction);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(5000, () => console.log('Server is running on port 5000'));
