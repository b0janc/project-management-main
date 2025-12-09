import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware.js';
import { addComment,getTaskComments } from '../controllers/commentController.js';

const commentRouter = express.Router();

commentRouter.post('/', addComment);
commentRouter.get('/:taskId', getTaskComments);


// --- SOLUSI ANTI-CRASH VERCEL ---
// Kita wajib menggunakan folder '/tmp' karena folder lain dikunci (Read-Only)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp'); // Path absolut ke folder sementara Vercel
  },
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + cleanName);
  }
});

const upload = multer({ storage: storage });
// -------------------------------

commentRouter.post(
    '/comments', 
    protect, 
    upload.single('file'), 
    commentController.addComment
);

commentRouter.get('/comments/:taskId', protect, commentController.getTaskComments);

export default router;
