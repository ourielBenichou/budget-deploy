import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function createToken(user) {
    return jwt.sign(
        {
            userId: user._id.toString(),
            email: user.email,
            role: user.role || 'user'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const payload = jwt.verify(header.slice(7), JWT_SECRET);
        req.userId = payload.userId;
        req.userRole = payload.role || 'user';
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export async function requireAdmin(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const payload = jwt.verify(header.slice(7), JWT_SECRET);
        req.userId = payload.userId;

        const user = await User.findById(req.userId).select('role');
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.userRole = 'admin';
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export function publicUser(user) {
    return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role || 'user'
    };
}

export async function applyAdminEmailRole(user) {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (adminEmail && user.email === adminEmail && user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
    }
    return user;
}
