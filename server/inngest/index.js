import { Inngest } from "inngest";
import  prisma  from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";


// Create a client to send and receive events
export const inngest = new Inngest({ id: "Project-Management" });

//inngest function to save user data to database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: 'clerk/user.created' },
  async ({ event, step }) => {
    const { data } = event
    await prisma.user.create({
      data: {
        id: data.id,
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data?.last_name,
        image: data?.image_url,
      }
    })
  }
);

//inngest function to delete user data from database
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: 'clerk/user.deleted' },
  async ({ event, step }) => {
    const { data } = event
    await prisma.user.delete({
      where: { 
        id: data.id,
      }
    })
  }
);

//inngest function to update user data from database
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: 'clerk/user.updated' },
  async ({ event, step }) => {
    const { data } = event
    await prisma.user.update({
      where: { id: data.id },
      data: {
        id: data.id,
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data?.last_name,
        image: data?.image_url,
      }
    })
  }
);


//inngest function to save workspace from database

const syncWorkspaceCreation = inngest.createFunction(
  { id: "sync-workspace-from-clerk" },
  { event: 'clerk/organization.created' },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      }
    })
    //Add creator as Admin Member
    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN"
      }
    })
  }

);

//inngest function to update workspace from database

const syncWorkspaceUpdation = inngest.createFunction(
  { id: "update-workspace-from-clerk" },
  { event: 'clerk/organization.updated' },
  async ({ event, step }) => {
    const { data } = event
    await prisma.workspace.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url,
      }
    })
  }
);

//inngest function to delete workspace from database

const syncWorkspaceDeletion = inngest.createFunction(
  { id: "delete-workspace-with-clerk" },
  { event: 'clerk/organization.deleted' },
  async ({ event, step }) => {
    const { data } = event
    await prisma.workspace.delete({
      where: { id: data.id },
    })
  }
);


//inngest function to save workspace from database
// Fungsi untuk menangani Member Baru
export const syncWorkspaceMemberCreation = inngest.createFunction(
  { id: "sync-workspace-member-from-clerk" },
  [
    { event: "clerk/organizationInvitation.accepted" },
    { event: "clerk/organizationMembership.created" } // <-- TAMBAHAN PENTING
  ],
  async ({ event, step }) => {
    const data = event.data;
    
    await step.run("create-db-member", async () => {
      // Normalisasi data (karena struktur invitation & membership beda dikit)
      const userId = data.public_user_data?.user_id || data.public_user_data?.id || data.user_id;
      const workspaceId = data.organization?.id || data.organization_id;
      const role = data.role || "org:member"; // Default role
      
      // Ambil email (sedikit tricky karena posisinya beda-beda)
      // Di membership.created, email ada di public_user_data.identifier
      const email = data.public_user_data?.identifier || data.email_address;

      if (!userId || !workspaceId) {
        throw new Error("Missing userId or workspaceId from Clerk event");
      }

      console.log(`Syncing member: ${userId} to workspace: ${workspaceId}`);

      await prisma.workspaceMember.create({
        data: {
          userId: userId,
          workspaceId: workspaceId,
          role: role === "org:admin" ? "ADMIN" : "MEMBER",
        },
      });
    });
  }
);

// Inngest function to send Email on Task Creation
const sendTaskAssignmentEmail = inngest.createFunction(
  { id: "send-task-assignment-email" },
  { event: 'app/task.assigned' },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true, project: true }
    });

    await sendEmail({
      to: task.assignee.email,
      subject: `New Task Assigned: ${task.title}`,
      body: `Hi ${task.assignee.name},You have been assigned a new task: ${task.title}.
      ${new Date(task.due_date).toLocaleDateString()}.\n\n
      <a href=${origin}>View Task</a>`
    });

    if(new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()){
      await step.sleepUntil('wait-for-the-due-date', new Date(task.due_date));

      await step.run('check-if-task-is-completed', async ()=> {
        const task =await prisma.task.findUnique({
          where : {id: taskId},
          include: {assignee: true, project: true}
        })

      if(!task)return;

      if(task.status !== "DONE"){
        await step.run('send-task-reminder-mail', async ()=>{
          await sendEmail({
            to: task.assignee.email,
            sbuject: `Reminder for ${task.project.name}`,
            body: `Hi ${task.assignee.name},You have been assigned a new task: ${task.title}.
           ${new Date(task.due_date).toLocaleDateString()}.\n\n
          <a href=${origin}>View Task</a>`
          })
        })
      }

      })
    }
  }
);

// Create an empty array where we'll export future Inngest functions



export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    syncWorkspaceCreation,
    syncWorkspaceDeletion,
    syncWorkspaceUpdation,
    syncWorkspaceMemberCreation,
    sendTaskAssignmentEmail
];
