import { Request, Response, NextFunction } from "express";
import { searchOrganizationsByType, searchAllOrganizations } from "../../utils/helper.ts";
import { categoryTypeEnum } from "../../models/organizations.model.ts";
import { validateTokenAndGetUser } from "../../utils/helperFunctions.utils.ts";
import users from '../../models/users.model.ts';
import mongoose from 'mongoose';

export const searchUsersByName = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the viewer user (optional)
    const viewerUser = await validateTokenAndGetUser(req, res);
    
    // Get name parameter from query
    const { name } = req.params;
    
    if (!name || typeof name !== 'string') {
      res.status(400).json({ message: 'Name parameter is required' });
      return;
    }
    
    // Build query to search for users by name
    const searchQuery: any = {};
    const nameParts = name.trim().split(/\s+/);
    
    if (nameParts.length === 1) {
      // Single word - search in both first and last name
      searchQuery.$or = [
        { 'bio.first_name': { $regex: nameParts[0], $options: 'i' } },
        { 'bio.last_name': { $regex: nameParts[0], $options: 'i' } }
      ];
    } else {
      // Multiple words - try different combinations
      searchQuery.$or = [
        // First word as first name, rest as last name
        {
          $and: [
            { 'bio.first_name': { $regex: nameParts[0], $options: 'i' } },
            { 'bio.last_name': { $regex: nameParts.slice(1).join(' '), $options: 'i' } }
          ]
        },
        // Any word in first or last name
        {
          $and: nameParts.map(word => ({
            $or: [
              { 'bio.first_name': { $regex: word, $options: 'i' } },
              { 'bio.last_name': { $regex: word, $options: 'i' } }
            ]
          }))
        }
      ];
    }
    
    // If user is authenticated, exclude blocked users
    if (viewerUser) {
      const viewerBlockedUsers = Array.isArray(viewerUser.blocked) 
        ? viewerUser.blocked.map(blocked => 
            typeof blocked === 'object' && blocked._id 
              ? blocked._id.toString() 
              : typeof blocked === 'string' ? blocked : String(blocked)
          ) 
        : [];
      
      if (viewerBlockedUsers.length > 0) {
        searchQuery._id = { 
          $nin: viewerBlockedUsers.map(id => new mongoose.Types.ObjectId(id)) 
        };
      }
      
      // Also exclude users who blocked the viewer
      if (viewerUser._id) {
        const viewerObjectId = typeof viewerUser._id === 'string' 
          ? new mongoose.Types.ObjectId(viewerUser._id) 
          : viewerUser._id;
        
        searchQuery.$and = searchQuery.$and || [];
        searchQuery.$and.push({
          $or: [
            { blocked: { $exists: false } },
            { blocked: { $size: 0 } },
            { 
              blocked: { 
                $not: { 
                  $elemMatch: { 
                    _id: viewerObjectId 
                  } 
                } 
              } 
            }
          ]
        });
      }
    }
    
    // Execute search query
    const searchResults = await users.find(searchQuery)
      .select('_id bio.first_name bio.last_name bio.headline profile_photo')
      .limit(10);
    
    // Format results
    const formattedResults = searchResults.map(user => ({
      _id: user._id,
      first_name: user.bio?.first_name || '',
      last_name: user.bio?.last_name || '',
      headline: user.bio?.headline || '',
      profile_photo: user.profile_photo || ''
    }));
    
    res.status(200).json({
      success: true,
      results: formattedResults
    });
  } catch (error) {
    console.error('Error searching users by name:', error);
    res.status(500).json({ message: 'Error searching users by name', error });
  }
};

/**
 * Search for companies (organizations with category_type "company")
 */
const searchCompanies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req.params;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: "Search query is required" });
      return;
    }
    
    const companies = await searchOrganizationsByType(query, categoryTypeEnum.company);
    
    res.status(200).json({
      message: "Companies retrieved successfully",
      data: companies.map(company => ({
        _id: company._id,
        name: company.name,
        logo: company.logo
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search for educational institutions (organizations with category_type "education")
 */
const searchEducationalInstitutions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req.params;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: "Search query is required" });
      return;
    }
    
    const institutions = await searchOrganizationsByType(query, categoryTypeEnum.education);
    
    res.status(200).json({
      message: "Educational institutions retrieved successfully",
      data: institutions.map(institution => ({
        _id: institution._id,
        name: institution.name,
        logo: institution.logo
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search for all organizations regardless of category_type
 */
const searchOrganizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req.params;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: "Search query is required" });
      return;
    }
    
    const organizations = await searchAllOrganizations(query);
    
    res.status(200).json({
      message: "Organizations retrieved successfully",
      data: organizations.map(org => ({
        _id: org._id,
        name: org.name,
        logo: org.logo,
        category_type: org.category_type
      }))
    });
  } catch (error) {
    next(error);
  }
};

export { searchCompanies, searchEducationalInstitutions, searchOrganizations };