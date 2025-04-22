import express from 'express';
import { deleteSavedPost, displaySavedPosts, savePost } from '../../controllers/posts/savedPosts.controller.ts';
const router = express.Router();




router.post('/save-post', (req,res) =>{
    savePost(req,res);
});

router.get('/save-post', (req,res) =>{
    displaySavedPosts(req,res);
});

router.delete('/save-post', (req,res) =>{
    deleteSavedPost(req,res);
});

export default router;
