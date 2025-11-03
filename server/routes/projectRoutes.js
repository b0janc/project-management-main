import { addMember, createProject, updateProject } from "../controllers/projectController.js";
import express from 'express';

const projectRouter = express.Router();

projectRouter.post('/', createProject);
projectRouter.put('/', updateProject);
projectRouter.post('/:projectId/addMember', addMember);

export default projectRouter;
