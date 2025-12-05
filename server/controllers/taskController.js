import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

// ==========================================
// 1. CREATE TASK (AS SEEN IN VIDEO - BUGGY)
// ==========================================
export const createTask = async (req, res) => {
    try {
        // Asumsi video menggunakan req.auth() dari Clerk middleware
        const { userId } = await req.auth(); 
        
        // Asumsi video mengambil semua field yang dibutuhkan
        const { projectId, title, description, type, status, priority, assigneeId, dueDate } = req.body;
        const origin = req.get('origin'); // Digunakan untuk Inngest

        // 1. Check Project and Permissions (Asumsi video menggunakan logic ini)
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        } 
        
        // 2. Buat Task di Database (Bagian ini RENTAN ERROR)
        const task = await prisma.task.create({
            data: {
                // BUG: Ini sering kurang dan memicu error "Argument project is missing"
                projectId: projectId, 
                // BUG: Ini akan crash jika dueDate adalah string kosong ("")
                due_date: new Date() || null, 
                
                title,
                description,
                priority: priority || "MEDIUM",
                status: status || "TO_DO",
                type: type || "TASK",
                assigneeId: assigneeId, // BUG: Ini sering memicu error "Argument assignee is missing"
                
                // Asumsi field ini ada untuk audit
                createdById: userId, 
            }
        });
            
        // Ambil data lengkap untuk response
        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true, project: true }
        });

        // 3. Trigger Email (Inngest)
        // BUG: Jika SMTP gagal, ini akan memicu Error 500
        if (assigneeId && assigneeId !== userId) {
            await inngest.send({
                name: "app/task.assigned",
                data: {
                    taskId: task.id, origin
                }
            });
        }

        res.json({ task: taskWithAssignee, message: "Task created successfully" });

    } catch (error) {
        console.error("Create Task Error:", error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
}

// ==========================================
// 2. UPDATE TASK (VIDEO VERSION)
// ==========================================
export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return res.status(404).json({ message: "Task not found" });

        const { userId } = await req.auth();
        const project = await prisma.project.findUnique({ where: { id: task.projectId } });

        if (!project) return res.status(404).json({ message: "Project not found" });
        if (project.team_lead !== userId) return res.status(403).json({ message: "You don't have admin privileges" });

        // Asumsi video menggunakan update data mentah dari req.body
        const updatedTask = await prisma.task.update({
            where: { id },
            data: req.body // BUG: Ini bisa update field yang seharusnya immutable (e.g. projectId)
        });

        res.json({ task: updatedTask, message: "Task updated successfully" });

    } catch (error) {
        console.error("Update Task Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// ==========================================
// 3. DELETE TASK (VIDEO VERSION)
// ==========================================
export const deleteTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { taskIds } = req.body;

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({ message: "Invalid task IDs provided" });
        }

        const tasks = await prisma.task.findMany({ where: { id: { in: taskIds } } });
        if (tasks.length === 0) return res.status(404).json({ message: "Tasks not found" });

        const project = await prisma.project.findUnique({ where: { id: tasks[0].projectId } });

        if (!project) return res.status(404).json({ message: "Project not found" });
        if (project.team_lead !== userId) return res.status(403).json({ message: "You don't have admin privileges" });

        await prisma.task.deleteMany({ where: { id: { in: taskIds } } });

        res.json({ message: "Tasks deleted successfully" });

    } catch (error) {
        console.error("Delete Task Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};