import { Request, Response } from 'express';
import { getSearchSuggestions } from '../../services/searchSuggestions.service.ts';
import { validateTokenAndGetUser } from "../../utils/helperFunctions.utils.ts";

export const searchSuggestionsController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the viewer user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    const { query } = req.query;

    if (query === undefined) {
        res.status(400).json({ message: 'Search query is required' });
        return;
      }

    // Convert to string and proceed (even if empty)
    const queryString = String(query);

    // Get viewer user ID
    const viewerUserId = typeof viewerUser._id === 'string' 
      ? viewerUser._id 
      : (viewerUser._id && typeof viewerUser._id === 'object' && 'toString' in viewerUser._id)
        ? viewerUser._id.toString()
        : String(viewerUser._id);

    // Get search suggestions
    const results = await getSearchSuggestions({ query: queryString }, viewerUserId, res);
    res.status(200).json(results);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error('Search suggestions error:', error);
      res.status(500).json({ message: 'Error fetching search suggestions', error });
    }
  }
};