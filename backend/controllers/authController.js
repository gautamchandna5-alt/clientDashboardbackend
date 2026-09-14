import bcrypt from 'bcrypt';
import pool from '../db.js';
import jwt from 'jsonwebtoken';

//---GENERATING ACCESS AND REFRESH TOKENS---


const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};



//----HANDLE REGISTER AND LOGIN---




//REGISTER USER


export const register = async (req, res) => {

    const { name, email, password } = req.body;
    if(!name || !email || !password) {
        return res.status(400).json({ message: 'all fields are required' });
    }

    try{
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if(userExists.rows.length > 0){
        return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, passwordHash, 'ADMIN']
    );


    res.status(201).json({ message: 'User registered successfully.', user: newUser.rows[0] });
    } catch (error) {
    res.status(500).json({ message: 'Server error during registration.' });
    }

}


//LOGIN USER


    export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });

    try{
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

        await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

        res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true, 
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, 
        });

        


        res.status(200).json({ 
        message: 'Login successful.',
        accessToken: accessToken, 
        user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login.' });
    }
    }


    // cookie-parser middleware
    export const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken; 
    
    if (!token) return res.status(401).json({ message: 'Not authenticated.' });

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

        const userQuery = await pool.query('SELECT * FROM users WHERE id = $1 AND refresh_token = $2', [decoded.id, token]);
        
        if (userQuery.rows.length === 0) {
            return res.status(403).json({ message: 'Invalid refresh token.' });
        }

        const user = userQuery.rows[0];

        const newAccessToken = generateAccessToken(user);

        res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired refresh token.' });
    }
};