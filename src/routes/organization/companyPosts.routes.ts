import express from 'express';
import * as companyPostsControllers from '../../controllers/organization/companyPosts.controller.ts';

const router = express.Router();

// Create Post from company
router.post('/create-post-from-company/:organization_id', (req, res, next) => {
    companyPostsControllers.createPostFromCompany(req, res, next);
});

// Update Post from company
router.put('/update-post-from-company/:organization_id/:job_id', (req, res, next) => {
    companyPostsControllers.editPostFromCompany(req, res, next);
});

// Delete Post from company
router.delete('/delete-post-from-company/:organization_id/:job_id', (req, res, next) => {
    companyPostsControllers.deletePostFromCompany(req, res, next);
});

// Get all Posts from company
router.get('/get-posts-from-company/:organization_id', (req, res, next) => {
    companyPostsControllers.getCompanyPosts(req, res, next);
});

export default router;
