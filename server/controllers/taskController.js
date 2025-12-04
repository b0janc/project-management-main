import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

// --- CREATE TASK ---
export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        // workspaceId diambil dari body tapi TIDAK dimasukkan ke DB Task
        const { projectId, title, description, type, status, priority, assigneeId, dueDate } = req.body;
        const origin = req.get('origin');

        // Validasi Input Dasar
        if (!projectId || !title) {
            return res.status(400).json({ message: "Project ID and Title are required" });
        }

        // Cek Izin & Validasi Member
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        } else if (assigneeId && !project.members.find((member) => member.user.email === assigneeId || member.userId === assigneeId)) {
            return res.status(403).json({ message: "Assignee is not a member of the project" });
        }

        // Validasi Tanggal
        let validDueDate = null;
        if (dueDate) {
            const parsed = new Date(dueDate);
            if (!isNaN(parsed.getTime())) {
                validDueDate = parsed;
            }
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                // ❌ HAPUS BARIS INI: workspaceId, (Penyebab Error)
                
                title,
                description,
                priority: priority || "MEDIUM",
                assigneeId: assigneeId || null,
                status: status || "TO_DO",
                type: type || "TASK",
                
                // ✅ Gunakan nama kolom yang benar: due_date
                due_date: validDueDate, 
                
                createdById: userId
            }
        });
            
        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true, project: true }
        });

        // Trigger Email Notification
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

// --- UPDATE TASK ---
export const updateTask = async (req, res) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: req.params.id }
        });
        if (!task) return res.status(404).json({ message: "Task not found" });

        const { userId } = await req.auth();
        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
        });

        if (!project) return res.status(404).json({ message: "Project not found" });
        if (project.team_lead !== userId) return res.status(403).json({ message: "You don't have admin privileges" });

        // Sanitasi input: Hapus id, projectId, workspaceId dari data update
        const { id, projectId, workspaceId, dueDate, ...otherData } = req.body;

        // Siapkan object update
        const updateData = { ...otherData };

        // Handle dueDate mapping
        if (dueDate !== undefined) {
            if (dueDate) {
                const parsed = new Date(dueDate);
                updateData.due_date = !isNaN(parsed.getTime()) ? parsed : null;
            } else {
                updateData.due_date = null;
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({ task: updatedTask, message: "Task updated successfully" });

    } catch (error) {
        console.error("Update Task Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// --- DELETE TASK ---
export const deleteTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { taskIds } = req.body;

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({ message: "Invalid task IDs provided" });
        }

        const tasks = await prisma.task.findMany({
            where: { id: { in: taskIds } }
        });

        if (tasks.length === 0) return res.status(404).json({ message: "Tasks not found" });

        const project = await prisma.project.findUnique({
            where: { id: tasks[0].projectId }
        });

        if (!project) return res.status(404).json({ message: "Project not found" });
        if (project.team_lead !== userId) return res.status(403).json({ message: "You don't have admin privileges" });

        await prisma.task.deleteMany({
            where: { id: { in: taskIds } }
        });

        res.json({ message: "Tasks deleted successfully" });

    } catch (error) {
        console.error("Delete Task Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}