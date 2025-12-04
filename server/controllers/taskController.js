import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

// --- CREATE TASK ---
export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        // FIX: Tambahkan 'type' dan 'workspaceId' yang dibutuhkan Schema
        const { projectId, workspaceId, title, description, type, status, priority, assigneeId, dueDate } = req.body;
        const origin = req.get('origin');

        // FIX: Validasi Input Dasar
        if (!projectId || !title) {
            return res.status(400).json({ message: "Project ID and Title are required" });
        }

        // Check if user has admin role for project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        } 
        // FIX: Cek assignee hanya jika assigneeId dikirim (tidak null/undefined)
        else if (assigneeId && !project.members.find((member) => member.user.email === assigneeId || member.userId === assigneeId)) {
            // Catatan: Pastikan assigneeId yang dikirim frontend adalah 'userId' atau 'email', sesuaikan validasi di atas
            return res.status(403).json({ message: "Assignee is not a member of the project" });
        }

        // FIX: Validasi Tanggal (Mencegah "Invalid Date")
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
                workspaceId, // FIX: Masukkan workspaceId agar relasi database lengkap
                title,
                description,
                priority: priority || "MEDIUM",
                assigneeId: assigneeId || null, // FIX: Pastikan null jika kosong
                status: status || "TO_DO",
                type: type || "TASK", // FIX: Default type
                dueDate: validDueDate, // FIX: Gunakan tanggal yang sudah divalidasi
                createdById: userId // Opsional: Simpan siapa pembuatnya jika ada field-nya
            }
        });
            
        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true, project: true }
        });

        // FIX: Kirim Inngest hanya jika ada assignee
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
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const { userId } = await req.auth();

        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        // FIX: Sanitasi data update (Jangan update ID/ProjectId sembarangan)
        const { id, projectId, workspaceId, ...dataToUpdate } = req.body;

        const updatedTask = await prisma.task.update({
            where: { id: req.params.id },
            data: dataToUpdate // Hanya update field yang relevan
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

        // FIX: Validasi input taskIds
        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({ message: "Invalid task IDs provided" });
        }

        const tasks = await prisma.task.findMany({
            where: { id: { in: taskIds } }
        });

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Tasks not found" });
        }

        // FIX: Typo variable 'task' menjadi 'tasks'
        const project = await prisma.project.findUnique({
            where: { id: tasks[0].projectId }, // Mengambil project dari task pertama
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        await prisma.task.deleteMany({
            where: { id: { in: taskIds } }
        });

        res.json({ message: "Tasks deleted successfully" });

    } catch (error) {
        console.error("Delete Task Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}