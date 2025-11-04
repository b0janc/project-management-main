// In workspaceRoutes.js
import express from "express"
// 1. Import the new function
import { addMember, getUserWorkspaces, getWorkspaceMembers } from "../controllers/workspaceController.js"

const workspaceRouter = express.Router();   

workspaceRouter.get("/", getUserWorkspaces);
workspaceRouter.post("/add-member", addMember);

// 2. Add this new route
workspaceRouter.get("/:workspaceId/members", getWorkspaceMembers);

export default workspaceRouter;