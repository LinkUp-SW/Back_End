import express from 'express';
import { createComment, deleteComment, getCommentsController, getRepliesController, updateComments } from '../../controllers/posts/comments.controller.ts';

const router = express.Router();




router.post('/comment/:postId', (req,res) =>{
    createComment(req,res);
});

router.get('/comment/:postId', (req,res) =>{
    getCommentsController(req,res);
});

router.get('/comment/:postId/:commentId', (req,res) =>{
    getRepliesController(req,res);
});

router.patch('/comment/:postId/:commentId', (req,res) =>{
    updateComments(req,res);
});

router.delete('/comment/:postId/:commentId', (req,res) =>{
    deleteComment(req,res);
});

export default router;
