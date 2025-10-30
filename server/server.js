import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "/inngest/index.js";

const app = express();
app.use(express.json());
app.use(cors())
app.use(clerkMiddleware({ apiKey: process.env.CLERK_API_KEY }));

app.get('/',(req,res)=>res.send('Server Is Live'));

app.use("/api/inngest", serve({ client: inngest, functions }));

const PORT = process.env.PORT || 5000
app.listen(PORT,()=> console.log(`Server running on port ${PORT}`))
