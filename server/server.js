import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import workspaceRouter from './routes/workspaceRoutes.js';
import { protect } from './middlewares/authMiddlewares.js';


const corsOptions = {
  origin: 'http://localhost:5173', // Your React app's address
  credentials: true,               // THIS IS CRITICAL: Allows auth headers
  optionsSuccessStatus: 200        // Some browsers need this
};

const app = express();
app.use(express.json());
app.use(cors(corsOptions))
app.use(clerkMiddleware({ apiKey: process.env.CLERK_API_KEY }));

app.get('/api/workspaces', (req, res) => {
    // For testing, let's just send back some data
    res.status(200).json({ workspaces: [
        { id: '1', name: 'Test Workspace 1' },
        { id: '2', name: 'Test Workspace 2' }
    ]});
});

app.get('/',(req,res)=>res.send('Server Is Live'));

app.use("/api/inngest", serve({ client: inngest, functions }));

// Routes
app.use("/api/workspaces", protect, workspaceRouter);

const PORT = process.env.PORT || 5000
app.listen(PORT,()=> console.log(`Server running on port ${PORT}`))
