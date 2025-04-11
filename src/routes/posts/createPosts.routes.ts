import express from 'express';
import { createPost } from '../../controllers/posts/createPosts.Controller.ts';
const router = express.Router();




router.post('/create-post', (req,res) =>{
    createPost(req,res);
});


export default router;
