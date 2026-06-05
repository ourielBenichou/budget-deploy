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
// אתה צריך להוסיף את החלק הזה ב-server.js כדי שיהיה אפשר "למשוך" נתונים:
app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find(); // שליפת כל הנתונים ממונגו
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// מחיקת רשומה
app.delete('/api/transactions/:id', async (req, res) => {
    await Transaction.findOneAndDelete({ id: req.params.id });
    res.json({ message: "Deleted" });
});

// עדכון רשומה (עריכה)
app.put('/api/transactions/:id', async (req, res) => {
    await Transaction.findOneAndUpdate({ id: req.params.id }, req.body);
    res.json({ message: "Updated" });
});

app.listen(5000, () => console.log('Server is running on port 5000'));
