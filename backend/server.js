import express from 'express';
import dotenv from 'dotenv';
import pool from './db.js';
import cors from 'cors';

// cookies
import cookieParser from 'cookie-parser';

// routes
import authRoutes from './routes/authRoute.js';
import adminRoutes from './routes/adminRoute.js';
import pmRoutes from './routes/pmRoute.js';
import devRoutes from './routes/devRoute.js';

dotenv.config({ path: './.env' });




const app = express();

//fronted access

app.use(cors({
    origin: 'https://clientdashboard-qazvqb7qh-pspspsps.vercel.app/', 
    credentials: true 
}));

app.use(cookieParser());

app.use(express.json());
app.use('/api/pm', pmRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dev', devRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'Server is running smoothly' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(pool.connect);
});

