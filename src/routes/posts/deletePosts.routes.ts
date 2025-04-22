import express from 'express';
import { deletePost } from '../../controllers/posts/deletePosts.controller.ts';
const router = express.Router();




router.delete('/delete-post', (req,res) =>{
    deletePost(req,res);
});


export default router;
