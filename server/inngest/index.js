import { Inngest } from "inngest";
import  prisma  from "../configs/prisma.js";

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
        Image: data?.profile_image_url,
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
        Image: data?.profile_image_url,
      }
    })
  }
);


// Create an empty array where we'll export future Inngest functions



export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation
];
