import express from 'express';
import { searchUsersController } from '../../controllers/my_network/userSearch.controller.ts';
import { searchSuggestionsController } from '../../controllers/my_network/searchSuggestions.controller.ts';
const router = express.Router();

router.get('/users', searchUsersController);
router.get('/suggestions', searchSuggestionsController);
export default router;