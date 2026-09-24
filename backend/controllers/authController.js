import bcrypt from 'bcrypt';
import pool from '../db.js';
import jwt from 'jsonwebtoken';

// --- GENERATING ACCESS AND REFRESH TOKENS ---

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.ACCESS_TOKEN_SECRET, // Ensure this matches your .env exactly
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.REFRESH_TOKEN_SECRET, // Ensure this matches your .env exactly
    { expiresIn: '7d' }
  );
};

// --- AUTHENTICATION CONTROLLERS ---

// LOGIN USER
export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });

    try {
        const findUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if(findUser.rows.length === 0){
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = findUser.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if(!match){
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Save refresh token in DB for backend revocation control
        await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

        // Dynamic cookie settings: secure on Render, lax on localhost
        const isProduction = process.env.NODE_ENV === 'production';
        
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, 
        });

        res.status(200).json({ 
            message: 'Login successful.',
            accessToken: accessToken, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
}


// REFRESH TOKEN
export const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken; 
    
    if (!token) return res.status(401).json({ message: 'Not authenticated.' });

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

        // Verify token matches the one currently stored in the database
        const userQuery = await pool.query('SELECT * FROM users WHERE id = $1 AND refresh_token = $2', [decoded.id, token]);
        
        if (userQuery.rows.length === 0) {
            return res.status(403).json({ message: 'Invalid refresh token.' });
        }

        const user = userQuery.rows[0];
        const newAccessToken = generateAccessToken(user);

        // Send BOTH the new token and the user data back to the frontend
        res.status(200).json({ 
            accessToken: newAccessToken,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Refresh token error:", error);
        return res.status(403).json({ message: 'Invalid or expired refresh token.' });
    }
};


// LOGOUT USER
export const logout = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.sendStatus(204); // Already logged out

    try {
        // Remove token from database to prevent unauthorized persistence
        await pool.query('UPDATE users SET refresh_token = NULL WHERE refresh_token = $1', [token]);
        
        // Clear the cookie dynamically
        const isProduction = process.env.NODE_ENV === 'production';
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
        });

        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: 'Server error during logout.' });
    }
};