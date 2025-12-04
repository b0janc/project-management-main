import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

// ==========================================
// 1. CREATE TASK
// ==========================================
export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { projectId, title, description, type, status, priority, assigneeId, dueDate } = req.body;
        const origin = req.get('origin');

        // Validasi Input Dasar
        if (!projectId || !title) {
            return res.status(400).json({ message: "Project ID and Title are required" });
        }

        // Cek Permission Project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        } 
        
        // Validasi Member (Assignee)
        if (assigneeId && !project.members.find((member) => member.user.email === assigneeId || member.userId === assigneeId)) {
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

        // --- PREPARE DATA OBJECT ---
        // Kita susun object datanya dulu agar bisa melakukan kondisional pada assignee
        const taskData = {
            title,
            description,
            priority: priority || "MEDIUM",
            status: status || "TO_DO",
            type: type || "TASK",
            due_date: validDueDate,
            createdById: userId, // Scalar ini sepertinya aman (tidak error di log)
            
            // Relasi Project (Wajib Connect)
            project: {
                connect: { id: projectId }
            }
        };

        // 🎯 FIX: Relasi Assignee (Gunakan Connect jika ada ID)
        if (assigneeId) {
            taskData.assignee = {
                connect: { id: assigneeId }
            };
        }

        // Create Task
        const task = await prisma.task.create({
            data: taskData
        });
            
        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true, project: true }
        });

        // Trigger Email
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
// 2. UPDATE TASK
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

        const { id: _, projectId, workspaceId, dueDate, assigneeId, ...otherData } = req.body;

        // Siapkan object update
        const updateData = { ...otherData };

        // Handle Tanggal
        if (dueDate !== undefined) {
            if (dueDate) {
                const parsed = new Date(dueDate);
                updateData.due_date = !isNaN(parsed.getTime()) ? parsed : null;
            } else {
                updateData.due_date = null;
            }
        }

        // 🎯 FIX: Handle Assignee Update (Gunakan Connect/Disconnect)
        if (assigneeId !== undefined) {
            if (assigneeId) {
                updateData.assignee = { connect: { id: assigneeId } };
            } else {
                // Jika dikirim null/kosong, putuskan hubungan (disconnect)
                updateData.assignee = { disconnect: true };
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: updateData
        });

        res.json({ task: updatedTask, message: "Task updated successfully" });

    } catch (error) {
        console.error("Update Task Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// ==========================================
// 3. DELETE TASK
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
}