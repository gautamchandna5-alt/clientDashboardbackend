import bcrypt from 'bcrypt';
import pool from '../db.js';

export const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!['PROJECT_MANAGER', 'DEVELOPER'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Must be PROJECT_MANAGER or DEVELOPER.' });
  }

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, passwordHash, role]
    );

    res.status(201).json({ 
      message: 'Team member created successfully.', 
      user: newUser.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while creating user.' });
  }
};



// Fetch all users with the PROJECT_MANAGER role
export const getProjectManagers = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email FROM users WHERE role = 'PROJECT_MANAGER'"
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching PMs:', error);
        res.status(500).json({ message: 'Server error fetching Project Managers' });
    }
};

// Create a new project and assign it to a PM
export const createProject = async (req, res) => {
    const { title, description, pmId } = req.body;

    if (!title || !pmId) {
        return res.status(400).json({ message: 'Title and Project Manager are required.' });
    }

    try {
        const result = await pool.query(
            "INSERT INTO projects (title, description, pm_id) VALUES ($1, $2, $3) RETURNING *",
            [title, description, pmId]
        );
        res.status(201).json({ message: 'Project assigned successfully', project: result.rows[0] });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: 'Server error creating project' });
    }
};

export const getAdminOverview = async (req, res) => {
    try {
        // Fetch all projects with their assigned PM's name
        const projects = await pool.query(`
            SELECT p.id, p.title, p.description, p.created_at, u.name AS pm_name 
            FROM projects p 
            JOIN users u ON p.pm_id = u.id 
            ORDER BY p.created_at DESC
        `);

        // Fetch all tasks with the Developer's name, Project title, and PM's name
        const tasks = await pool.query(`
            SELECT t.id, t.description, t.status, t.created_at, 
                   u.name AS dev_name, p.title AS project_title, pm.name AS pm_name 
            FROM tasks t 
            JOIN users u ON t.dev_id = u.id 
            JOIN projects p ON t.project_id = p.id 
            JOIN users pm ON p.pm_id = pm.id 
            ORDER BY t.created_at DESC
        `);

        res.status(200).json({ projects: projects.rows, tasks: tasks.rows });
    } catch (error) {
        console.error('Error fetching admin overview:', error);
        res.status(500).json({ message: 'Server error fetching overview data' });
    }
};


// Delete a project and all its associated tasks
export const deleteProject = async (req, res) => {
    const { projectId } = req.params;
    try {
        const result = await pool.query("DELETE FROM projects WHERE id = $1 RETURNING *", [projectId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json({ message: 'Project and associated tasks deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Server error deleting project' });
    }
};

// Delete a single standalone task
export const deleteTask = async (req, res) => {
    const { taskId } = req.params;
    try {
        const result = await pool.query("DELETE FROM tasks WHERE id = $1 RETURNING *", [taskId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ message: 'Server error deleting task' });
    }
};