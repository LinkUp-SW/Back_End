import express from 'express';
import { CreateComment, deleteComment, getCommentsController } from '../../controllers/posts/comments.controller.ts';

const router = express.Router();




router.post('/comment', (req,res) =>{
    CreateComment(req,res);
});

router.get('/comment', (req,res) =>{
    getCommentsController(req,res);
});

router.delete('/comment', (req,res) =>{
    deleteComment(req,res);
});

export default router;
