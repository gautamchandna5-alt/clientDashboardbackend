import express from 'express';
import { getMyTasks, completeTask } from '../controllers/devController.js';

const router = express.Router();

router.get('/tasks/:devId', getMyTasks);
router.patch('/tasks/:taskId/complete', completeTask);

export default router;