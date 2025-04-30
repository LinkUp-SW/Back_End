import mongoose from 'mongoose';
import users from '../models/users.model.ts';
import organizations from '../models/organizations.model.ts';
import jobs from '../models/jobs.model.ts';
import { Response } from 'express';

interface SuggestionParams {
  query: string;
  limit?: number;
}

/**
 * Escapes special characters in a string for use in a regex pattern
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
  

/**
 * Search Suggestions Service
 * -------------------------
 * Provides real-time search suggestions as users type in the search bar,
 * returning a mixture of users, industries, organizations, and jobs.
 * 
 * @param {SuggestionParams} params - The search parameters
 * @param {string} params.query - The search text to match against various entities
 * @param {number} [params.limit=10] - Maximum number of suggestions to return
 * @param {string} viewerUserId - ID of the user performing the search
 * @param {Response} res - Express Response object
 * 
 * @returns {Promise<Object>} - Search suggestions of different types
 */
export const getSearchSuggestions = async (
  params: SuggestionParams,
  viewerUserId: string,
  res: Response
) => {
  try {
    const { query, limit = 10 } = params;
    
    if (!query || query.trim().length === 0) {
      return { suggestions: [] };
    }
    
    const viewerObjectId = new mongoose.Types.ObjectId(viewerUserId);

    // Escape special regex characters in the query
    const escapedQuery = escapeRegExp(query);
    
    // Get viewer's connections for determining connection degrees
    const viewerUser = await users.findById(viewerUserId, { connections: 1, blocked: 1 }).lean();
    
    if (!viewerUser) {
      throw new Error('Viewer user not found');
    }
    
    // Extract viewer's connection IDs
    const viewerConnections = Array.isArray(viewerUser.connections) 
      ? viewerUser.connections.map(conn => 
          typeof conn === 'object' && conn._id 
            ? conn._id.toString() 
            : typeof conn === 'string' ? conn : String(conn)
        ) 
      : [];
    
    // Extract viewer's blocked users
    const viewerBlockedUsers = Array.isArray(viewerUser.blocked) 
      ? viewerUser.blocked.map(blocked => 
          typeof blocked === 'object' && blocked._id 
            ? blocked._id.toString() 
            : typeof blocked === 'string' ? blocked : String(blocked)
        ) 
      : [];
    
    // Get 2nd degree connections
    let secondDegreeConnections = new Set<string>();
    
    if (viewerConnections.length > 0) {
      const firstDegreeConnectionUsers = await users.find(
        { _id: { $in: viewerConnections.map(id => new mongoose.Types.ObjectId(id)) } },
        { connections: 1 }
      ).lean();
      
      firstDegreeConnectionUsers.forEach(connUser => {
        if (Array.isArray(connUser.connections)) {
          connUser.connections.forEach(secondConn => {
            const secondConnId = typeof secondConn === 'object' && secondConn._id 
              ? secondConn._id.toString() 
              : typeof secondConn === 'string' ? secondConn : String(secondConn);
            
            if (!viewerConnections.includes(secondConnId) && secondConnId !== viewerUserId) {
              secondDegreeConnections.add(secondConnId);
            }
          });
        }
      });
    }
    
    // Update the base exclusion conditions to properly exclude users who have blocked the viewer
    const baseExclusionConditions = [
        { _id: { $ne: viewerObjectId } }, // Exclude the viewer
        { _id: { $nin: viewerBlockedUsers.map(id => new mongoose.Types.ObjectId(id)) } }, // Exclude users blocked by viewer
        // Exclude users who have blocked the viewer - this condition was missing
        { 
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
        }
    ];
    
    // 1. Get user suggestions ]
const userSuggestions = await users.aggregate([
    {
      $lookup: {
        from: 'organizations',
        localField: 'work_experience.organization',
        foreignField: '_id',
        as: 'workOrganizations'
      }
    },
    {
      $match: {
        $and: [
          ...baseExclusionConditions,
          {
            $or: [
              // Search by first name
              { 'bio.first_name': { $regex: escapedQuery, $options: 'i' } },
              // Search by last name
              { 'bio.last_name': { $regex: escapedQuery, $options: 'i' } },
              // Search by combined full name
              {
                $expr: {
                  $regexMatch: {
                    input: { $concat: ['$bio.first_name', ' ', '$bio.last_name'] },
                    regex: escapedQuery,
                    options: 'i'
                  }
                }
              },
              // Search by headline
              { 'bio.headline': { $regex: escapedQuery, $options: 'i' } },
              // Search by industry
              { 'industry': { $regex: escapedQuery, $options: 'i' } },
            ]
          }
        ]
      }
    },
    {
      $project: {
        _id: 1,
        user_id: 1,
        'bio.first_name': 1,
        'bio.last_name': 1,
        'bio.headline': 1,
        profile_photo: 1,
        connections: 1,
        industry: 1,
      }
    },
    { $limit: limit }
  ]);
  
  // Process user suggestions with more complete information
  const processedUserSuggestions = userSuggestions.map(user => {
    // Determine connection degree
    let connectionDegree = '3rd+';
    
    if (viewerConnections.includes(user._id.toString())) {
      connectionDegree = '1st';
    } else if (secondDegreeConnections.has(user._id.toString())) {
      connectionDegree = '2nd';
    }
    
    return {
      type: 'user',
      user_id: user.user_id,
      name: `${user.bio?.first_name || ''} ${user.bio?.last_name || ''}`.trim(),
      headline: user.bio?.headline || '',
      profile_photo: !user.profile_photo || user.profile_photo === '' ? 
      'https://res.cloudinary.com/dyhnxqs6f/image/upload/v1719229880/meme_k18ky2_c_crop_w_674_h_734_x_0_y_0_u0o1yz.png' :  // Default image path
      user.profile_photo,
      connection_degree: connectionDegree,
      industry: user.industry || '',
    };
  });
    
  const organizationSuggestions = await organizations.aggregate([
    {
      $match: {
        $and: [
          // Alternative approach to exclude organizations that have blocked the viewer
          {
            $or: [
              { blocked: { $exists: false } },   // No blocked array exists
              { blocked: { $size: 0 } },         // Empty blocked array
              // None of the blocked items match viewer's ID
              { 
                $nor: [
                  { blocked: viewerObjectId },     // Direct ObjectId match
                  { blocked: viewerUserId },       // Direct string match
                  { "blocked._id": viewerObjectId }, // Match in embedded object
                  { "blocked._id": viewerUserId }  // Match in embedded object
                ]
              }
            ]
          },
          // Original search criteria remains the same
          {
            $or: [
              { name: { $regex: escapedQuery, $options: 'i' } },
              { industry: { $regex: escapedQuery, $options: 'i' } }
            ]
          }
        ]
      }
    },
    // Project statement remains the same
    {
      $project: {
        _id: 1,
        name: 1,
        category_type: 1,
        logo: 1,
        industry: 1,
        blocked: 1
      }
    },
    { $limit: limit * 2 }
  ]);
    
    const processedOrgSuggestions = organizationSuggestions.map(org => ({
      type: 'organization',
      _id: org._id,
      name: org.name,
      category_type: org.category_type,
      logo: org.logo,
      industry: org.industry
    }));
    
    // 3. Get job suggestions
    const jobSuggestions = await jobs.aggregate([
      {
        $match: {
          $or: [
            { job_title: { $regex: escapedQuery, $options: 'i' } },
            { location: { $regex: escapedQuery, $options: 'i' } },
            { organization_industry: { $regex: escapedQuery, $options: 'i' } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          job_title: 1,
          location: 1,
          organization_industry: 1
        }
      },
      { $limit: limit }
    ]);
    
    const processedJobSuggestions = jobSuggestions.map(job => ({
      type: 'job',
      _id: job._id,
      title: job.job_title,
      location: job.location,
      industry: job.organization_industry,
      is_job: true
    }));
    
    // 4. Get industry suggestions
    // Extract unique industries from organizations
    const industriesSuggestions = await organizations.aggregate([
      {
        $match: {
          industry: { $regex: escapedQuery, $options: 'i' }
        }
      },
      {
        $group: {
          _id: '$industry'
        }
      },
      { $limit: limit }
    ]);
    
    const processedIndustrySuggestions = industriesSuggestions.map(industry => ({
      type: 'industry',
      id: industry._id, // Using the industry name as ID
      name: industry._id
    }));
    
    // Combine all suggestions
    let combinedSuggestions = [
      ...processedUserSuggestions,
      ...processedOrgSuggestions,
      ...processedJobSuggestions,
      ...processedIndustrySuggestions
    ];
    
    // Sort by relevance (simple implementation - prioritize exact matches)
    combinedSuggestions.sort((a, b) => {
      const aName = 'name' in a ? a.name : (a.title || '');
      const bName = 'name' in b ? b.name : (b.title || '');
      
      // Check for exact matches or starts with
      const aStartsWithQuery = aName.toLowerCase().startsWith(escapedQuery.toLowerCase());
      const bStartsWithQuery = bName.toLowerCase().startsWith(escapedQuery.toLowerCase());
      
      if (aStartsWithQuery && !bStartsWithQuery) return -1;
      if (!aStartsWithQuery && bStartsWithQuery) return 1;
      
      // Default to alphabetical order
      return aName.localeCompare(bName);
    });
    
    // Ensure mixed suggestions by type
    // If we have too few suggestions overall, return all we have (up to limit)
    // Otherwise, try to include at least one of each type if available
    if (combinedSuggestions.length <= limit) {
      return { suggestions: combinedSuggestions };
    }
    
    // Strategy for mixed results:
    // 1. First, get at least one of each available type
    // 2. Then fill remaining slots based on relevance
    
    const typeGroups: Record<string, any[]> = {
      user: [],
      organization: [],
      job: [],
      industry: []
    };
    
    // Group by type
    combinedSuggestions.forEach(suggestion => {
      if (typeGroups[suggestion.type]) {
        typeGroups[suggestion.type].push(suggestion);
      }
    });
    
    let mixedSuggestions: any[] = [];
    
    // Add one of each type that has results
    Object.keys(typeGroups).forEach(type => {
      if (typeGroups[type].length > 0) {
        mixedSuggestions.push(typeGroups[type][0]);
        // Remove the added item
        typeGroups[type] = typeGroups[type].slice(1);
      }
    });
    
    // Fill remaining slots proportionally
    const remainingSlots = limit - mixedSuggestions.length;
    
    if (remainingSlots > 0) {
      // Recombine remaining items and sort by relevance
      const remainingSuggestions = Object.values(typeGroups).flat();
      
      // Sort remaining items by relevance (as before)
      remainingSuggestions.sort((a, b) => {
        const aName = 'name' in a ? a.name : (a.title || '');
        const bName = 'name' in b ? b.name : (b.title || '');
        
        const aStartsWithQuery = aName.toLowerCase().startsWith(escapedQuery.toLowerCase());
        const bStartsWithQuery = bName.toLowerCase().startsWith(escapedQuery.toLowerCase());
        
        if (aStartsWithQuery && !bStartsWithQuery) return -1;
        if (!aStartsWithQuery && bStartsWithQuery) return 1;
        
        return aName.localeCompare(bName);
      });
      
      // Add remaining items
      mixedSuggestions = [
        ...mixedSuggestions,
        ...remainingSuggestions.slice(0, remainingSlots)
      ];
    }
    
    return { suggestions: mixedSuggestions };
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    throw error;
  }
};