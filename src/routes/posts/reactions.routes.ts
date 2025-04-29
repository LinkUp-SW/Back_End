import express from 'express';
import { getReactionsForTarget, reactOnPost, removeReaction } from '../../controllers/posts/reacts.controller.ts';
const router = express.Router();




router.post('/reaction/:postId', (req,res) =>{
    reactOnPost(req,res);
});

router.delete('/reaction/:postId', (req,res) =>{
    removeReaction(req,res);
});

router.get('/reaction/:postId', (req,res) =>{
    getReactionsForTarget(req,res);
});
export default router;