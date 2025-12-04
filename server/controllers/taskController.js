import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

// ==========================================
// 1. CREATE TASK
// ==========================================
export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        
        // Ambil data dari body
        // Catatan: workspaceId tidak dimasukkan ke DB Task, tapi dipakai untuk validasi jika perlu
        const { projectId, title, description, type, status, priority, assigneeId, dueDate } = req.body;
        const origin = req.get('origin');

        // --- VALIDASI INPUT ---
        if (!projectId || !title) {
            return res.status(400).json({ message: "Project ID and Title are required" });
        }

        // --- CEK PERMISSION & DATA PROJECT ---
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } 
        
        // Hanya Team Lead (Admin Project) yang boleh buat task
        if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        } 

        // Validasi Assignee (Harus member project)
        if (assigneeId) {
            const isMember = project.members.find((member) => 
                member.user.email === assigneeId || member.userId === assigneeId
            );
            if (!isMember) {
                return res.status(403).json({ message: "Assignee is not a member of the project" });
            }
        }

        // --- VALIDASI TANGGAL (PENTING) ---
        let validDueDate = null;
        if (dueDate) {
            const parsed = new Date(dueDate);
            // Cek apakah tanggal valid (bukan "Invalid Date")
            if (!isNaN(parsed.getTime())) {
                validDueDate = parsed;
            }
        }

        // --- SIMPAN KE DATABASE ---
        const task = await prisma.task.create({
            data: {
                title,
                description,
                priority: priority || "MEDIUM",
                status: status || "TO_DO",
                type: type || "TASK",
                
                // Gunakan nama kolom yang benar (snake_case)
                due_date: validDueDate, 
                
                assigneeId: assigneeId || null,
                createdById: userId,

                // Gunakan connect untuk menghubungkan ke Project
                project: {
                    connect: { id: projectId }
                }
            }
        });
            
        // Ambil data task lengkap dengan assignee untuk response
        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true, project: true }
        });

        // --- TRIGGER EMAIL (INNGEST) ---
        if (assigneeId && assigneeId !== userId) {
            await inngest.send({
                name: "app/task.assigned",
                data: {
                    taskId: task.id, 
                    origin
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
        
        // Cek apakah task ada
        const task = await prisma.task.findUnique({
            where: { id }
        });
        
        if (!task) return res.status(404).json({ message: "Task not found" });

        const { userId } = await req.auth();
        
        // Cek Project Permission
        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
        });

        if (!project) return res.status(404).json({ message: "Project not found" });
        if (project.team_lead !== userId) return res.status(403).json({ message: "You don't have admin privileges" });

        // Sanitasi Data: Buang field yang tidak boleh diupdate sembarangan
        const { id: _, projectId, workspaceId, dueDate, ...otherData } = req.body;

        // Siapkan object data update
        const updateData = { ...otherData };

        // Handle Tanggal Update
        if (dueDate !== undefined) {
            if (dueDate) {
                const parsed = new Date(dueDate);
                updateData.due_date = !isNaN(parsed.getTime()) ? parsed : null;
            } else {
                updateData.due_date = null; // Reset tanggal jika dikirim null/kosong
            }
        }

        // Lakukan Update
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

        // Validasi Array ID
        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({ message: "Invalid task IDs provided" });
        }

        // Cek Task Pertama untuk validasi Project permission
        const tasks = await prisma.task.findMany({
            where: { id: { in: taskIds } }
        });

        if (tasks.length === 0) return res.status(404).json({ message: "Tasks not found" });

        const project = await prisma.project.findUnique({
            where: { id: tasks[0].projectId }
        });

        if (!project) return res.status(404).json({ message: "Project not found" });
        if (project.team_lead !== userId) return res.status(403).json({ message: "You don't have admin privileges" });

        // Hapus Data
        await prisma.task.deleteMany({
            where: { id: { in: taskIds } }
        });

        res.json({ message: "Tasks deleted successfully" });

    } catch (error) {
        console.error("Delete Task Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}