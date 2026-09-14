import pool from '../db.js';

export const getMyTasks = async (req, res) => {
    const { devId } = req.params;

    try {
        const result = await pool.query(`
            SELECT t.id, t.description, t.status, t.created_at, p.title AS project_title 
            FROM tasks t 
            JOIN projects p ON t.project_id = p.id 
            WHERE t.dev_id = $1 
            ORDER BY t.created_at DESC
        `, [devId]);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching dev tasks:', error);
        res.status(500).json({ message: 'Server error fetching tasks' });
    }
};

export const completeTask = async (req, res) => {
    const { taskId } = req.params;

    try {
        const result = await pool.query(
            "UPDATE tasks SET status = 'COMPLETED' WHERE id = $1 RETURNING *",
            [taskId]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        res.status(200).json({ message: 'Task marked as completed', task: result.rows[0] });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Server error updating task' });
    }
};