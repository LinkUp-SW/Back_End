import { Request, Response } from 'express';
import { searchUsers } from '../../services/search.service.ts';
import { validateTokenAndGetUser} from "../../utils/helperFunctions.utils.ts";
import { connection } from 'mongoose';

export const searchUsersController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the viewer user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    const { query, connectionDegree,page, limit } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }


// Handle connection degree with more comprehensive normalization
let searchConnectionDegree: 'all' | '1st' | '2nd' | '3rd+' = 'all';

if (connectionDegree && typeof connectionDegree === 'string') {
  // Normalize the connection degree string
  const normalized = connectionDegree.trim();
  
  if (normalized === 'all' || normalized === '1st' || normalized === '2nd') {
    searchConnectionDegree = normalized as 'all' | '1st' | '2nd';
  } 
  // Special handling for 3rd+ with any encoding variants
  else if (normalized === '3rd+' || normalized.startsWith('3rd') || normalized.match(/^3rd[\s%+]/)) {
    searchConnectionDegree = '3rd+';

  }
}

    // Parse pagination params
    const searchPage = page && !isNaN(Number(page)) ? Number(page) : 1;
    const searchLimit = limit && !isNaN(Number(limit)) ? Number(limit) : 10;
    const searchParams = {
      query,
      connectionDegree: searchConnectionDegree,
      page: searchPage,
      limit: searchLimit
    };

    const viewerUserId = typeof viewerUser._id === 'string' 
      ? viewerUser._id 
      : (viewerUser._id && typeof viewerUser._id === 'object' && 'toString' in viewerUser._id)
        ? viewerUser._id.toString()
        : String(viewerUser._id);

    const results = await searchUsers(searchParams, viewerUserId, res);
    res.status(200).json(results);
  } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            res.status(401).json({ message: error.message,success:false });
    }
        else{
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Error searching users', error });
  }
}
};