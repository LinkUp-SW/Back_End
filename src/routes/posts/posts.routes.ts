import express from 'express';
import { createPost } from '../../controllers/posts/createPosts.controller.ts';
import { editPost } from '../../controllers/posts/editPosts.controller.ts';
import { deletePost } from '../../controllers/posts/deletePosts.controller.ts';
import { getPost } from '../../controllers/posts/getPost.controller.ts';
const router = express.Router();




router.post('/posts', (req,res) =>{
    createPost(req,res);
});

router.patch('/posts', (req,res) =>{
    editPost(req,res);
});

router.delete('/posts', (req,res) =>{
    deletePost(req,res);
});

router.get('/posts/:postId', (req,res) =>{
    getPost(req,res);
});
export default router;
