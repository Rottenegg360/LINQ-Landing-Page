const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet()); // Add security headers
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8000',
    credentials: true
}));
app.use(express.json());

// Rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: { message: 'Too many login attempts, please try again after 15 minutes' }
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { message: 'Too many requests, please try again later' }
});

// Apply rate limiting to routes
app.use('/api/admin/login', loginLimiter);
app.use('/api/', apiLimiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/linq', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB');
    // Create admin user after successful connection
    createInitialAdmin();
})
.catch(err => console.error('MongoDB connection error:', err));

// Define User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

// Define Admin Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    lastLogin: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date }
});

const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Password validation middleware
const validatePassword = [
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Create initial admin user if none exists
async function createInitialAdmin() {
    try {
        const adminExists = await Admin.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('linqkingkong123!', 10);
            await Admin.create({
                username: 'admin',
                password: hashedPassword
            });
            console.log('Initial admin user created successfully');
        } else {
            // Update existing admin password
            const hashedPassword = await bcrypt.hash('linqkingkong123!', 10);
            await Admin.updateOne(
                { username: 'admin' },
                { $set: { password: hashedPassword } }
            );
            console.log('Admin password updated successfully');
        }
    } catch (error) {
        console.error('Error managing admin user:', error);
    }
}

// API Routes
app.post('/api/subscribe', [
    body('email').isEmail().withMessage('Invalid email address'),
    body('name').trim().notEmpty().withMessage('Name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const user = new User({ name, email });
        await user.save();

        res.status(201).json({ message: 'Successfully subscribed!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin login route
app.post('/api/admin/login', [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        console.log('Login attempt for username:', username);
        
        const admin = await Admin.findOne({ username });
        if (!admin) {
            console.log('Admin not found');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if account is locked
        if (admin.lockedUntil && admin.lockedUntil > new Date()) {
            return res.status(403).json({ 
                message: 'Account is locked. Please try again later.',
                lockedUntil: admin.lockedUntil
            });
        }

        // Log the password comparison attempt
        console.log('Attempting password comparison');
        const validPassword = await bcrypt.compare(password.trim(), admin.password);
        console.log('Password comparison result:', validPassword);

        if (!validPassword) {
            // Increment failed login attempts
            admin.failedLoginAttempts += 1;
            
            // Lock account after 5 failed attempts
            if (admin.failedLoginAttempts >= 5) {
                admin.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
            }
            
            await admin.save();
            console.log('Invalid password');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Reset failed login attempts on successful login
        admin.failedLoginAttempts = 0;
        admin.lockedUntil = null;
        admin.lastLogin = new Date();
        await admin.save();

        console.log('Login successful');
        const token = jwt.sign(
            { username: admin.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Protected route to get subscribers
app.get('/api/subscribers', authenticateToken, async (req, res) => {
    try {
        const subscribers = await User.find({})
            .select('name email createdAt')
            .sort({ createdAt: -1 });
        
        res.json(subscribers);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Change admin password route
app.post('/api/admin/change-password', [
    authenticateToken,
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;
        const admin = await Admin.findOne({ username: req.user.username });

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, admin.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        admin.password = hashedPassword;
        await admin.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 