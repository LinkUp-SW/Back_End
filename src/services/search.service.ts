import mongoose from 'mongoose';
import users from '../models/users.model.ts';
import organizations from '../models/organizations.model.ts';
import { Response } from 'express';
import { profile } from 'console';
import privacy_settings from '../models_to_delete/privacy_settings.model.ts';

/**
 * User Search Service
 * ------------------
 * Provides comprehensive search functionality for finding users in the system based on
 * various criteria including name, company, industry, and connection degree.
 * 
 * @param {SearchParams} searchParams - The search parameters
 * @param {string} searchParams.query - The search text to match against user data
 * @param {('name'|'company'|'industry'|'all')} [searchParams.filter='all'] - Which fields to search against
 * @param {('1st'|'2nd'|'all')} [searchParams.connectionDegree='all'] - Filter results by connection degree
 * @param {number} [searchParams.page=1] - Page number for pagination
 * @param {number} [searchParams.limit=10] - Number of results per page
 * 
 * @param {string} viewerUserId - ID of the user performing the search
 * @param {Response} res - Express Response object (used for error handling)
 * 
 * @returns {Promise<Object>} - Search results and pagination information
 * @returns {Array<Object>} results - Array of user objects matching the search criteria
 * @returns {string} results[].user_id - User's unique identifier
 * @returns {string} results[].name - User's full name
 * @returns {string} results[].headline - User's headline/title
 * @returns {string} results[].location - User's formatted location
 * @returns {string} results[].profile_photo - URL to user's profile photo
 * @returns {string} results[].connection_degree - Relationship to viewer ('1st', '2nd', or undefined)
 * @returns {Object} results[].mutual_connections - Information about shared connections
 * @returns {number} results[].mutual_connections.count - Number of mutual connections
 * @returns {string} results[].mutual_connections.suggested_name - Name of one mutual connection
 * @returns {Object} pagination - Pagination metadata
 * @returns {number} pagination.total - Total number of matching results
 * @returns {number} pagination.page - Current page number
 * @returns {number} pagination.limit - Results per page
 * @returns {number} pagination.pages - Total number of pages
 * 
 * @description
 * This service implements a search feature with the following capabilities:
 * 
 * 1. Text Search:
 *    - name: Searches in user's first name, last name, and user_id
 *    - company: Searches in organizations from both work experience and education
 *    - industry: Searches in the user's industry field
 *    - all: Searches across all fields (default)
 * 
 * 2. Connection Filtering:
 *    - 1st: Returns only the viewer's direct connections
 *    - 2nd: Returns only second-degree connections (connections of connections, 
 *           but not direct connections)
 *    - all: Returns users of any connection degree (default)
 * 
 * 3. Mutual Connections:
 *    - Each result includes the number of mutual connections
 *    - When mutual connections exist, provides one suggested name
 * 
 * 4. Exclusions:
 *    - Automatically excludes the viewer from results
 *    - Excludes users who have blocked the viewer
 *    - Excludes users who are blocked by the viewer
 * 
 * 5. Pagination:
 *    - Returns a subset of results based on page and limit parameters
 *    - Includes metadata for implementing pagination UI
 * 
 * @example
 * // Search for users with "engineer" in their profile, filtering by name
 * const results = await searchUsers(
 *   { query: "engineer", filter: "name", page: 1, limit: 10 },
 *   "current_user_id",
 *   response
 * );
 * 
 * @example
 * // Search for first-degree connections only
 * const connections = await searchUsers(
 *   { query: "", connectionDegree: "1st" },
 *   "current_user_id",
 *   response
 * );
 * 
 * @throws {Error} When viewer user is not found
 * @throws {Error} For database connection issues
 */


interface SearchParams {
  query: string;
  filter?: 'name' | 'company' | 'industry' | 'all';
  connectionDegree?: '1st' | '2nd' | '3rd+' | 'all';
  page?: number;
  limit?: number;
}

export const searchUsers = async (
  searchParams: SearchParams,
  viewerUserId: string,
  res: Response
) => {
  try {
    const { 
      query, 
      filter = 'all', 
      connectionDegree = 'all',
      page = 1, 
      limit = 10 
    } = searchParams;

    // Sanitize pagination parameters to ensure they're positive
    const safePage = Math.max(1, Number(page) || 1); // Ensure page is at least 1
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10)); // Ensure limit is between 1 and 100

    const skip = (safePage - 1) * safeLimit;
    
    // Convert viewerUserId to ObjectId
    const viewerObjectId = new mongoose.Types.ObjectId(viewerUserId);
    
    // First, get the viewer's connections
    const viewerUser = await users.findById(viewerUserId, { connections: 1 , blocked: 1 , sent_connections:1 , received_connections:1}).lean();
    
    if (!viewerUser) {
      throw new Error('Viewer user not found');
    }

    // Extract viewer's blocked IDs
    const viewerBlockedUsers = Array.isArray(viewerUser.blocked) 
    ? viewerUser.blocked.map(blocked => 
        typeof blocked === 'object' && blocked._id 
        ? blocked._id.toString() 
        : typeof blocked === 'string' ? blocked : String(blocked)
    ) 
    : [];
    
    // Extract viewer's connection IDs
    const viewerConnections = Array.isArray(viewerUser.connections) 
      ? viewerUser.connections.map(conn => 
          typeof conn === 'object' && conn._id 
            ? conn._id.toString() 
            : typeof conn === 'string' ? conn : String(conn)
        ) 
      : [];

    // Extract sent connection requests
     const viewerSentConnections = Array.isArray(viewerUser.sent_connections) 
     ? viewerUser.sent_connections.map(conn => 
         typeof conn === 'object' && conn._id 
           ? conn._id.toString() 
           : typeof conn === 'string' ? conn : String(conn)
       ) 
     : [];
   
   // Extract received connection requests
   const viewerReceivedConnections = Array.isArray(viewerUser.received_connections) 
     ? viewerUser.received_connections.map(conn => 
         typeof conn === 'object' && conn._id 
           ? conn._id.toString() 
           : typeof conn === 'string' ? conn : String(conn)
       ) 
     : [];
    
    // Get 2nd degree connections if needed
    let secondDegreeConnections: Set<string> = new Set();
    
    if (connectionDegree === '2nd' || connectionDegree === 'all') {
      // Get connections of the viewer's connections
      const firstDegreeConnectionUsers = await users.find(
        { _id: { $in: viewerConnections.map(id => new mongoose.Types.ObjectId(id)) } },
        { connections: 1 }
      ).lean();
      
      // Collect all 2nd degree connections
      firstDegreeConnectionUsers.forEach(connUser => {
        if (Array.isArray(connUser.connections)) {
          connUser.connections.forEach(secondConn => {
            const secondConnId = typeof secondConn === 'object' && secondConn._id 
              ? secondConn._id.toString() 
              : typeof secondConn === 'string' ? secondConn : String(secondConn);
            
            // Only add if not already a 1st degree connection and not the viewer
            if (!viewerConnections.includes(secondConnId) && secondConnId !== viewerUserId) {
              secondDegreeConnections.add(secondConnId);
            }
          });
        }
      });
    }
      
    // Base pipeline for all searches
    const basePipeline: mongoose.PipelineStage[] = [
      // Lookup organizations for education
      {
        $lookup: {
          from: 'organizations',
          localField: 'education.school',
          foreignField: '_id',
          as: 'educationOrganizations'
        }
      },
      // Lookup organizations for work experience
      {
        $lookup: {
          from: 'organizations',
          localField: 'work_experience.organization',
          foreignField: '_id',
          as: 'workOrganizations'
        }
      },
      // Exclude users who have blocked the viewer
      {
        $match: {
          $and: [
            { 
              $or: [
                { blocked: { $exists: false } },
                { blocked: { $size: 0 } },
                { 
                  "blocked._id": { 
                    $ne: viewerObjectId
                  } 
                }
              ]
            },

            // Exclude users the viewer has blocked
        {
            _id: { 
              $nin: viewerBlockedUsers.map(id => new mongoose.Types.ObjectId(id))
            }
          },
          // Exclude the viewer
          { _id: { $ne: viewerObjectId } }
          ]
        }
      }
    ];
    
    // Add connection degree filter
    let connectionCondition = null;
    
    // Fix the 3rd+ filtering condition
if (connectionDegree !== 'all') {
    console.log(`Filtering by connection degree: ${connectionDegree}`);
    if (connectionDegree === '1st') {
      // First degree: Include only direct connections
      connectionCondition = {
        _id: { $in: viewerConnections.map(id => new mongoose.Types.ObjectId(id)) }
      };
    } else if (connectionDegree === '2nd') {
      // Second degree: Include only connections of connections (not direct connections)
      connectionCondition = {
        _id: { $in: Array.from(secondDegreeConnections).map(id => new mongoose.Types.ObjectId(id)) }
      };
    } // Update this section in your connection filtering logic:

   // Replace your existing 3rd+ filtering logic with this improved version
else if (connectionDegree === '3rd+') {
  console.log("Applying 3rd+ degree filter");

  const refreshedFirstDegreeUsers = await users.find(
    { _id: { $in: viewerConnections.map(id => new mongoose.Types.ObjectId(id)) } },
    { connections: 1 }
  ).lean();
  
  secondDegreeConnections = new Set();
  
  // Rebuild the complete set of second-degree connections
  refreshedFirstDegreeUsers.forEach(connUser => {
    if (Array.isArray(connUser.connections)) {
      connUser.connections.forEach(secondConn => {
        const secondConnId = typeof secondConn === 'object' && secondConn._id 
          ? secondConn._id.toString() 
          : typeof secondConn === 'string' ? secondConn : String(secondConn);
        
        // Only add if not already a 1st degree connection and not the viewer
        if (!viewerConnections.includes(secondConnId) && secondConnId !== viewerUserId) {
          secondDegreeConnections.add(secondConnId);
        }
      });
    }
  });
  
  console.log(`Identified ${secondDegreeConnections.size} 2nd-degree connections`);
  
  const usersWithMutuals = await users.aggregate([
    { $match: { _id: { $ne: viewerObjectId } } },
    { $unwind: "$connections" },
    {
      $addFields: {
        connectionId: {
          $toString: {
            $cond: {
              if: { $eq: [{ $type: "$connections" }, "object"] },
              then: "$connections._id",
              else: "$connections"
            }
          }
        }
      }
    },
    { $match: { connectionId: { $in: viewerConnections } } },
    { $group: { _id: "$_id" } }
  ]);

  const mutualUsersIds = usersWithMutuals.map(u => u._id.toString());
  console.log(`Found ${mutualUsersIds.length} users with mutual connections`);
  
  const allExclusionIds = [
    ...viewerConnections, 
    ...Array.from(secondDegreeConnections),
    ...mutualUsersIds
  ];
  
  // Remove duplicates
  const uniqueExclusionIds = [...new Set(allExclusionIds)]
    .filter(Boolean)
    .map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (e) {
        console.warn(`Invalid ID format: ${id}`);
        return null;
      }
    })
    .filter(Boolean);

  connectionCondition = {
    _id: { $nin: uniqueExclusionIds }
  };
  
  console.log(`Excluding ${uniqueExclusionIds.length} users from 3rd+ results`);
}
  }
    
    // Search conditions based on filter
    let searchConditions = [];
    
    // Fix name search to handle full names correctly
    if (filter === 'name' || filter === 'all') {
      // Split the query into words for name searching
      const queryWords = query.trim().split(/\s+/);
      
      if (queryWords.length === 1) {
        // Single word search - search in first name, last name, or user_id
        searchConditions.push(
          { 'bio.first_name': { $regex: query, $options: 'i' } },
          { 'bio.last_name': { $regex: query, $options: 'i' } },
          { 'user_id': { $regex: query, $options: 'i' } }
        );
      } else {
        // Multi-word search (like "John Doe")
        // Try different combinations of the words
        
        // Option 1: First word matches first name, second+ words match last name
        searchConditions.push({
          $and: [
            { 'bio.first_name': { $regex: queryWords[0], $options: 'i' } },
            { 'bio.last_name': { $regex: queryWords.slice(1).join(' '), $options: 'i' } }
          ]
        });
        
        // Option 2: Any word matches either first or last name
        const wordConditions = queryWords.map(word => ({
          $or: [
            { 'bio.first_name': { $regex: word, $options: 'i' } },
            { 'bio.last_name': { $regex: word, $options: 'i' } }
          ]
        }));
        searchConditions.push({ $and: wordConditions });
        
        // Option 3: Full query matches user_id
        searchConditions.push({ 'user_id': { $regex: query, $options: 'i' } });
      }
    }
    
    if (filter === 'company' || filter === 'all') {
      searchConditions.push(
        { 'workOrganizations.name': { $regex: query, $options: 'i' } },
        { 'educationOrganizations.name': { $regex: query, $options: 'i' } }
      );
    }
    
    if (filter === 'industry' || filter === 'all') {
      searchConditions.push(
        { 'industry': { $regex: query, $options: 'i' } }
      );
    }
    
    // Add search conditions to pipeline with connection filter if present
    const pipeline: mongoose.PipelineStage[] = [
      ...basePipeline,
      ...(connectionCondition ? [{ $match: connectionCondition }] : []),
      { $match: { $or: searchConditions } },
      // Project only needed fields
      {
        $project: {
          _id: 1,
          user_id: 1,
          'bio.first_name': 1,
          'bio.last_name': 1,
          'bio.headline': 1,
          'bio.location': 1,
          profile_photo: 1,
          connections: 1,
          currentWorkplace: { $arrayElemAt: ['$workOrganizations.name', 0] },
          currentEducation: { $arrayElemAt: ['$educationOrganizations.name', 0] },
          privacy_settings: 1
        }
      },
      // Sort by most relevant 
        { $sort: { user_id: 1 as 1 } },
      // Pagination
      { $skip: skip },
      { $limit: safeLimit }
    ];
    
    // Count total results 
    const countPipeline: mongoose.PipelineStage[] = [
      ...basePipeline,
      ...(connectionCondition ? [{ $match: connectionCondition }] : []),
      { $match: { $or: searchConditions } },
      { $count: 'total' }
    ];
    
    // Execute pipelines
    const [results, countResult] = await Promise.all([
      users.aggregate(pipeline),
      users.aggregate(countPipeline)
    ]);
    
    const total = countResult[0]?.total || 0;
    
    // Process each result with mutual connections info
    const formattedResultsWithPromises = results.map(async user => {
      // Calculate connection degree for this user
      // Connection degree will be determined later based on mutual connections
      
      // Extract user's connection IDs for mutual calculations
      interface ConnectionObject {
        _id: string | mongoose.Types.ObjectId;
        [key: string]: any;
      }
      
      type Connection = ConnectionObject | string | unknown;
      
     // Replace the connection degree calculation with this more accurate version

// First determine mutual connections
const userConnections: string[] = Array.isArray(user.connections) 
? user.connections.map((conn: Connection) => 
    typeof conn === 'object' && conn !== null && '_id' in conn 
      ? ((conn as ConnectionObject)._id).toString() 
      : typeof conn === 'string' ? conn : String(conn)
  ) 
: [];
  
// Find mutual connections (intersection of sets)
const mutualConnectionIds = viewerConnections.filter(id => 
userConnections.includes(id)
);

const mutualCount = mutualConnectionIds.length;

// Then determine connection degree based partly on mutual connections
let connectionDegreeLabel = '';

if (viewerConnections.includes(user._id.toString())) {
connectionDegreeLabel = '1st';
} else if (mutualCount > 0 || secondDegreeConnections.has(user._id.toString())) {
// Either they're in the calculated 2nd degree set
// OR they have mutual connections with viewer (which makes them 2nd degree by definition)
connectionDegreeLabel = '2nd';
} else {
connectionDegreeLabel = '3rd+';
}
      
      // Get name of one mutual connection if any exist
      let mutualConnectionName = '';
      let mutualConnectionProfilePhoto = '';
      if (mutualCount > 0) {
        // Get just one mutual connection's details
        const mutualUser = await users.findById(
          mutualConnectionIds[0],
          { 'bio.first_name': 1, 'bio.last_name': 1, 'profile_photo': 1 }
        ).lean();
        
        if (mutualUser && mutualUser.bio) {
          mutualConnectionName = `${mutualUser.bio.first_name || ''} ${mutualUser.bio.last_name || ''}`.trim();
          mutualConnectionProfilePhoto = mutualUser.profile_photo ||
            'https://res.cloudinary.com/dyhnxqs6f/image/upload/v1719229880/meme_k18ky2_c_crop_w_674_h_734_x_0_y_0_u0o1yz.png'; // Default image path
        }
      }
      
      return {
        user_id: user.user_id,
        location: user.bio?.location ? 
          `${user.bio.location.city || ''}${user.bio.location.city && user.bio.location.country_region ? ', ' : ''}${user.bio.location.country_region || ''}`.trim() : 
          '',
        name: `${user.bio?.first_name || ''} ${user.bio?.last_name || ''}`.trim(),
        headline: user.bio?.headline || '',
        profile_photo: !user.profile_photo || user.profile_photo === '' ? 
          'https://res.cloudinary.com/dyhnxqs6f/image/upload/v1719229880/meme_k18ky2_c_crop_w_674_h_734_x_0_y_0_u0o1yz.png' :  // Default image path
          user.profile_photo,
        connection_degree: connectionDegreeLabel,
        mutual_connections: {
          count: mutualCount,
          suggested_name: mutualConnectionName,
          suggested_profile_photo: mutualConnectionProfilePhoto

        },
        is_in_sent_connections: viewerSentConnections.includes(user._id.toString()),
        is_in_received_connections: viewerReceivedConnections.includes(user._id.toString()),
        is_connect_by_email: user.privacy_settings?.flag_who_can_send_you_invitations === 'email' ? true : false,
      };
    });
    
    // Resolve all promises
    const formattedResults = await Promise.all(formattedResultsWithPromises);

    let nextPage = null;
    if (total > skip + formattedResults.length) {
      // There are more results available, set nextPage to the next page number
      nextPage = safePage + 1;
    }
    
    return {
      people: formattedResults,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(total / limit),
        nextCursor: nextPage
      }
    };
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};