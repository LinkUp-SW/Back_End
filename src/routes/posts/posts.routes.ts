import express from 'express';
import { createPost } from '../../controllers/posts/createPosts.controller.ts';
import { editPost } from '../../controllers/posts/editPosts.controller.ts';
import { deletePost } from '../../controllers/posts/deletePosts.controller.ts';
import { getPost } from '../../controllers/posts/getPost.controller.ts';
import { displayUserPosts } from '../../controllers/posts/getUserPosts.controller.ts';
import { displayPosts } from '../../controllers/posts/displayPosts.Controller.ts';
import { searchPosts } from '../../controllers/posts/searchPosts.controller.ts';

const router = express.Router();




router.post('/posts', (req,res) =>{
    createPost(req,res);
});

router.get('/posts/feed', (req,res) =>{
    displayPosts(req,res);
});
router.patch('/posts/:postId', (req,res) =>{
    editPost(req,res);
});

router.delete('/posts/:postId', (req,res) =>{
    deletePost(req,res);
});

router.get('/posts/:postId', (req,res) =>{
    getPost(req,res);
});

router.get('/posts/user/:user_id', (req,res) =>{
    displayUserPosts(req,res);
});

// To match the pattern used by other routes:
router.get('/search/posts', (req, res) => {
    searchPosts(req, res);
});


export default router;
