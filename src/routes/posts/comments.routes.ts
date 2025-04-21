import express from 'express';
import { createComment, deleteComment, getCommentsController, updateComments } from '../../controllers/posts/comments.controller.ts';

const router = express.Router();




router.post('/comment', (req,res) =>{
    createComment(req,res);
});

router.get('/comment/:postId', (req,res) =>{
    getCommentsController(req,res);
});

router.patch('/comment', (req,res) =>{
    updateComments(req,res);
});

router.delete('/comment', (req,res) =>{
    deleteComment(req,res);
});

export default router;
