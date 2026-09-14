import express from 'express';
import { register, login, refreshToken } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refreshToken);

export default router;