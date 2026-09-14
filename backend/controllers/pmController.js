import pool from '../db.js'; 

export const getMyProjects = async (req, res) => {
    const { pmId } = req.params;

    try {
        const result = await pool.query(
            "SELECT id, title, description, created_at FROM projects WHERE pm_id = $1 ORDER BY created_at DESC",
            [pmId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching PM projects:', error);
        res.status(500).json({ message: 'Server error fetching projects' });
    }
};

// Add these below your existing getMyProjects function

export const getDevelopers = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email FROM users WHERE role = 'DEVELOPER'"
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching developers:', error);
        res.status(500).json({ message: 'Server error fetching developers' });
    }
};

export const createTask = async (req, res) => {
    const { projectId, devId, description } = req.body;

    if (!projectId || !devId || !description) {
        return res.status(400).json({ message: 'Project, Developer, and Description are required.' });
    }

    try {
        const result = await pool.query(
            "INSERT INTO tasks (project_id, dev_id, description) VALUES ($1, $2, $3) RETURNING *",
            [projectId, devId, description]
        );
        res.status(201).json({ message: 'Task assigned successfully', task: result.rows[0] });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ message: 'Server error creating task' });
    }
};

export const getAssignedTasks = async (req, res) => {
    const { pmId } = req.params;
    try {
        const result = await pool.query(`
            SELECT t.id, t.description, t.status, t.created_at, 
                   u.name AS dev_name, p.title AS project_title 
            FROM tasks t 
            JOIN users u ON t.dev_id = u.id 
            JOIN projects p ON t.project_id = p.id 
            WHERE p.pm_id = $1 
            ORDER BY t.created_at DESC
        `, [pmId]);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching assigned tasks:', error);
        res.status(500).json({ message: 'Server error fetching tasks' });
    }
};