// --- CREATE TASK ---
export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { projectId, title, description, type, status, priority, assigneeId, dueDate } = req.body;
        const origin = req.get('origin');

        // 1. Validasi Input Dasar
        if (!projectId || !title) {
            return res.status(400).json({ message: "Project ID and Title are required" });
        }

        // 2. Cek Permission & Validasi Member
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

        // 3. Validasi Tanggal
        let validDueDate = null;
        if (dueDate) {
            const parsed = new Date(dueDate);
            if (!isNaN(parsed.getTime())) {
                validDueDate = parsed;
            }
        }

        // 4. Create Task (PERBAIKAN DI SINI)
        const task = await prisma.task.create({
            data: {
                // Hapus 'projectId' (scalar) yang menyebabkan error
                // projectId, 
                
                title,
                description,
                priority: priority || "MEDIUM",
                status: status || "TO_DO",
                type: type || "TASK",
                
                due_date: validDueDate, 
                
                assigneeId: assigneeId || null,
                createdById: userId,

                // ✅ GUNAKAN CONNECT UNTUK PROJECT
                project: {
                    connect: { id: projectId }
                }
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