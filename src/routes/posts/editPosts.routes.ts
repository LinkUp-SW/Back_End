import express from 'express';
import { editPost } from '../../controllers/posts/editPosts.controller.ts';
const router = express.Router();




router.patch('/edit-post', (req,res) =>{
    editPost(req,res);
});


export default router;
