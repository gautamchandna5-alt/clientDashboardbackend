import express from 'express';
import { createUser } from '../controllers/adminController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { getProjectManagers, createProject, getAdminOverview, deleteProject, deleteTask } from '../controllers/adminController.js';


const router = express.Router();

router.post('/create-user', verifyToken, requireRole('ADMIN'), createUser);
router.get('/pms', getProjectManagers);
router.get('/overview', getAdminOverview);
router.post('/projects', createProject);
router.delete('/projects/:projectId', deleteProject);
router.delete('/tasks/:taskId', deleteTask);


export default router;

