import { Request, Response } from "express";
import Users from "../models/users.model.ts";
import { usersInterface } from "../models/users.model.ts";
import { organizationsInterface } from "../models/organizations.model.ts";
import { ObjectId } from "mongodb";
import  "../models/posts.model.ts";
import  "../models/comments.model.ts";
import mongoose from "mongoose";
import jobs from "../models/jobs.model.ts";

/**
 * Validates that the provided user_id is a valid MongoDB ObjectId.
 * Returns the user_id if valid; otherwise sends an error response and returns null.
 */
export const validateUserId = (user_id: string, res: Response): string | null => {
    if (!user_id) {
        res.status(400).json({ message: "User ID is required" });
        return null;
    }
    return user_id;
};

/**
 * Validates the user_id passed in the request URL parameters.
 * Extracts the user_id from req.params and validates it.
 * Returns the user_id if valid; otherwise sends an error response and returns null.
 */
export const validateUserIdFromRequest = async (req: Request, res: Response): Promise<string | null> => {
    try{
    const {user_id} = req.params; // Assuming the user_id is passed in the URL as a parameter
    if (!user_id) {
        res.status(400).json({ message: "User ID is required in the URL" });
        return null;
    }
    const user = await Users.findOne({ user_id });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return null;
        }
    
    return user_id;
      }
      catch (error) {
        console.error("Error validating user ID:", error);
        res.status(500).json({ message: "Error validating user ID", error });
        return null;
      }
};




/**
 * Finds a user by the given user_id.
 * Returns the user document if found; otherwise sends a 404 response and returns null.
 */
export const findUserByUserId = async (user_id: string, res: Response) => {
    try {
        console.log(`Looking up user with ID: ${user_id}`);
        // Query the database using the `user_id` field
        const user = await Users.findOne({ user_id });
        //console.log("User found:", user); // Log the found user
        if (!user) {
            console.log(`No user found with ID: ${user_id}`);
            res.status(404).json({ message: "User not found" });
            return null;
        }
        return user;
    } catch (error) {
        console.error("Error finding user by user_id:", error);
        res.status(500).json({ message: "Error finding user", error });
        return null;
    }
};


/**
 * Checks if the current user has access to view the target user's profile.
 */
export const checkProfileAccess = async (
  currentUserId: string,
  targetUserId: string
): Promise<{ accessGranted: boolean; reason?: string }> => {
  try {
    if (currentUserId === targetUserId) {
      return { accessGranted: true }; // Allow access to own profile
    }
    // Find the target user by their user_id
    const targetUser = await Users.findOne({ user_id: targetUserId });
    if (!targetUser) {
      return { accessGranted: false, reason: "User not found" }; // Target user does not exist
    }
    const currentUser = await Users.findOne({ user_id: currentUserId }) as usersInterface;
    if (!currentUser) {
        return { accessGranted: false, reason: "Current user not found" };
    }
    
    const isBlocking = currentUser.blocked.some(
      (blocked: any) => blocked._id.toString() === (targetUser._id as ObjectId).toString()
    );
    if (isBlocking) {
      return { accessGranted: false, reason: "blocking" };
    } 

    const isBlocked = targetUser.blocked.some(
      (blocked: any) => blocked._id.toString() === (currentUser._id as ObjectId).toString()
    );
    if (isBlocked) {
      return { accessGranted: false, reason: "blocked" };
    }

    // Allow access if the profile is public
    if (
      targetUser.privacy_settings &&
      targetUser.privacy_settings.flag_account_status === "Public"
    ) {
      return { accessGranted: true };
    }

    // Allow access if the current user is connected to the target user
    const isConnected = targetUser.connections.some(
      (connection: any) => connection._id === (currentUser._id as ObjectId).toString()
    );
    if (isConnected) {
      return { accessGranted: true };
    }

    // Deny access if the profile is private
    return { accessGranted: false, reason: "private" };
  } catch (error) {
    console.error("Error checking profile access:", error);
    return { accessGranted: false, reason: "error" };
  }
};


/**
 * Fetches the 10 most recent posts for a user.
 * @param userId - The user ID to fetch posts for.
 * @returns An array of cleaned posts.
 */
export const getUserPostsLimited = async (userId: string): Promise<any[]> => {
  const user = await Users.findOne({ user_id: userId })
      .select("activity.posts")
      .populate({
          path: "activity.posts",
          model: 'posts', // Reference the posts collection
          options: { sort: { date: -1 } }, // Sort by date in descending order
      })
      .lean() as { activity?: { posts?: any[] } };

  if (!user || !user.activity || !user.activity.posts) return [];
  return user.activity.posts.slice(0, 10); // Return the 10 most recent posts with full data
};

/**
 * Fetches the 10 most recent comments for a user.
 * @param userId - The user ID to fetch comments for.
 * @returns An array of cleaned comments.
 */
export const getUserCommentsLimited = async (userId: string): Promise<any[]> => {

  const user = await Users.findOne({ user_id: userId })
      .select("activity.comments")
      .populate({
          path: 'activity.comments',
          model: 'comments', // Reference the comments collection
          options: { sort: { date: -1 } }, // Sort by date in descending order
      })
      .lean() as { activity?: { comments?: any[] } };

  if (!user || !user.activity || !user.activity.comments) return [];
  return user.activity.comments.slice(0, 10); // Return the 10 most recent comments with full data

};

/**
 * Fetches the 10 most recent reacted posts for a user.
 * @param userId - The user ID to fetch reacted posts for.
 * @returns An array of cleaned reacted posts.
 */
export const getUserReactedPostsLimited = async (userId: string): Promise<any[]> => {

  const user = await Users.findOne({ user_id: userId })
      .select("activity.reacted_posts")
      .populate({
          path: 'activity.reacted_posts',
          model: 'posts', // Reference the posts collection
          options: { sort: { date: -1 } }, // Sort by date in descending order
      })
      .lean() as { activity?: { reacted_posts?: any[] } };

  if (!user || !user.activity || !user.activity.reacted_posts) return [];
  return user.activity.reacted_posts.slice(0, 10); // Return the 10 most recent reacted posts with full data
};

export enum SkillSourceType {
  EDUCATION = 'education',
  EXPERIENCE = 'experience',
  LICENSE = 'license'
}

export const updateUserSkills = (
  user: usersInterface, 
  skills: string[], 
  sourceId: string,
  sourceType: SkillSourceType
) => {
  if (skills && skills.length > 0) {
    for (const skillName of skills) {
      const skillIndex = user.skills.findIndex(skill => skill.name === skillName);
      
      if (skillIndex !== -1) {
        // Skill exists, add reference to appropriate array if not already there
        const idExists = (() => {
          switch(sourceType) {
            case SkillSourceType.EDUCATION:
              return user.skills[skillIndex].educations.includes(sourceId);
            case SkillSourceType.EXPERIENCE:
              return user.skills[skillIndex].experiences.includes(sourceId);
            case SkillSourceType.LICENSE:
              return user.skills[skillIndex].licenses.includes(sourceId);
          }
        })();
        
        if (!idExists) {
          switch(sourceType) {
            case SkillSourceType.EDUCATION:
              user.skills[skillIndex].educations.push(sourceId);
              break;
            case SkillSourceType.EXPERIENCE:
              user.skills[skillIndex].experiences.push(sourceId);
              break;
            case SkillSourceType.LICENSE:
              user.skills[skillIndex].licenses.push(sourceId);
              break;
          }
        }
      } else {
        // Skill doesn't exist, create it with reference in the appropriate array
        const newSkill = {
          _id: new ObjectId().toString(),
          name: skillName,
          endorsments: [],
          educations: sourceType === SkillSourceType.EDUCATION ? [sourceId] : [],
          experiences: sourceType === SkillSourceType.EXPERIENCE ? [sourceId] : [],
          licenses: sourceType === SkillSourceType.LICENSE ? [sourceId] : []
        };
        
        user.skills.push(newSkill);
      }
    }
  }
};

export const handleRemovedSkills = (
  user: usersInterface, 
  oldSkills: string[], 
  newSkills: string[], 
  sourceId: string,
  sourceType: SkillSourceType
) => {
  const removedSkills = oldSkills.filter(skill => !newSkills.includes(skill));
  
  for (const skillName of removedSkills) {
    const skillIndex = user.skills.findIndex(skill => skill.name === skillName);
    
    if (skillIndex !== -1) {
      // Remove the reference from the appropriate array
      switch(sourceType) {
        case SkillSourceType.EDUCATION:
          user.skills[skillIndex].educations = user.skills[skillIndex].educations.filter(id => id !== sourceId);
          break;
        case SkillSourceType.EXPERIENCE:
          user.skills[skillIndex].experiences = user.skills[skillIndex].experiences.filter(id => id !== sourceId);
          break;
        case SkillSourceType.LICENSE:
          user.skills[skillIndex].licenses = user.skills[skillIndex].licenses.filter(id => id !== sourceId);
          break;
      }
    }
  }
};

export const handleDeletedSkills = (
  user: usersInterface, 
  skillNames: string[], 
  sourceId: string,
  sourceType: SkillSourceType
): void => {
  for (const skillName of skillNames) {
    const skillIndex = user.skills.findIndex(skill => skill.name === skillName);
    
    if (skillIndex !== -1) {
      // Remove the reference from the appropriate array
      switch(sourceType) {
        case SkillSourceType.EDUCATION:
          user.skills[skillIndex].educations = user.skills[skillIndex].educations.filter(id => id != sourceId);
          break;
        case SkillSourceType.EXPERIENCE:
          user.skills[skillIndex].experiences = user.skills[skillIndex].experiences.filter(id => id != sourceId);
          break;
        case SkillSourceType.LICENSE:
          user.skills[skillIndex].licenses = user.skills[skillIndex].licenses.filter(id => id != sourceId);
          break;
      }
    }
  }
};

/**
 * Helper function for paginated job queries with common aggregation logic
 * @param baseQuery - Base query object to filter jobs
 * @param cursor - Pagination cursor (MongoDB ObjectId string)
 * @param limit - Number of results to return
 * @param sortOptions - Sorting options for the query
 * @param extraStages - Additional aggregation stages to include
 * @returns Object containing job data, pagination info, and count
 */
export const paginatedJobQuery = async (
  baseQuery: any = {},
  cursor: string | null = null,
  limit: number = 10,
  sortOptions: any = { _id: -1 },
  extraStages: any[] = []
) => {
  try {
    // Check if database connection is established
    if (!mongoose.connection || !mongoose.connection.db) {
      throw new Error("Database connection not established");
    }
    
    const query = { ...baseQuery };
    
    // If a cursor is provided, fetch jobs after the cursor
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      query._id = { ...query._id, $lt: new mongoose.Types.ObjectId(cursor) };
    }
    
    // Build the aggregation pipeline
    const pipeline: any[] = [
      { $match: query },
      { $sort: sortOptions },
      { $limit: limit + 1 } // Get one extra to determine if there's a next page
    ];
    
    // Add organization lookup by default
    pipeline.push({
      $lookup: {
        from: 'organizations',
        localField: 'organization_id',
        foreignField: '_id',
        as: 'organization'
      }
    },
    { $unwind: '$organization' });
    
    // Add applications lookup by default
    pipeline.push({
      $lookup: {
        from: 'applications',
        localField: '_id',
        foreignField: 'job_id',
        as: 'applications'
      }
    });
    
    // Add any extra aggregation stages
    pipeline.push(...extraStages);
    
    // Execute the aggregation
    const collection = mongoose.connection.db.collection('jobs');
    const jobsData = await collection.aggregate(pipeline).toArray();
    
    // Determine if there's a next page and calculate the next cursor
    const hasNextPage = jobsData.length > limit;
    const nextCursor = hasNextPage ? jobsData[limit - 1]._id : null;
    
    // Return only the requested number of jobs
    const jobsToReturn = hasNextPage ? jobsData.slice(0, limit) : jobsData;
    
    // Count total matching jobs
    const totalCount = await collection.countDocuments(query);
    
    return {
      data: jobsToReturn,
      count: jobsToReturn.length,
      total: totalCount,
      nextCursor: nextCursor,
      hasNextPage
    };
  } catch (error) {
    console.error("Error in paginated job query:", error);
    throw error;
  }
};

export const getTimeAgoStage = () => {
  return {
      $addFields: {
          timeAgo: {
              $let: {
                  vars: {
                      diffInMs: { $subtract: [new Date(), "$posted_time"] },
                      diffInSeconds: { $divide: [{ $subtract: [new Date(), "$posted_time"] }, 1000] },
                      diffInMinutes: { $divide: [{ $subtract: [new Date(), "$posted_time"] }, 1000 * 60] },
                      diffInHours: { $divide: [{ $subtract: [new Date(), "$posted_time"] }, 1000 * 60 * 60] },
                      diffInDays: { $divide: [{ $subtract: [new Date(), "$posted_time"] }, 1000 * 60 * 60 * 24] }
                  },
                  in: {
                      $cond: [
                          { $gte: ["$$diffInDays", 1] },
                          { $concat: [{ $toString: { $floor: "$$diffInDays" } }, " day(s) ago"] },
                          {
                              $cond: [
                                  { $gte: ["$$diffInHours", 1] },
                                  { $concat: [{ $toString: { $floor: "$$diffInHours" } }, " hour(s) ago"] },
                                  {
                                      $cond: [
                                          { $gte: ["$$diffInMinutes", 1] },
                                          { $concat: [{ $toString: { $floor: "$$diffInMinutes" } }, " minute(s) ago"] },
                                          { $concat: [{ $toString: { $floor: "$$diffInSeconds" } }, " second(s) ago"] }
                                      ]
                                  }
                              ]
                          }
                      ]
                  }
              }
          }
      }
  };
};

/**
 * Transforms skill names into skill objects.
 * @param user - The user object containing skills.
 * @param skillNames - Array of skill names to transform.
 * @returns An array of skill objects.
 */
export const transformSkillsToObjects = (user: any, skillNames: string[]): any[] => {
  if (!skillNames || skillNames.length === 0) return [];
  
  return skillNames.map(skillName => {
    const skillObj = user.skills.find((skill: any) => skill.name === skillName);
    if (skillObj) {
      return {
        _id: skillObj._id,
        name: skillObj.name
      };
    }
    return {
      name: skillName
    };
  }).filter(Boolean);
};

/**
 * Finds a user by MongoDB _id.
 * Returns the user document if found; otherwise sends a 404 response and returns null.
 */
export const findUserById = async (id: string, res: Response) => {
  try {
      console.log(`Looking up user with MongoDB ID: ${id}`);
      // Validate that the id is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
          console.log(`Invalid MongoDB ID format: ${id}`);
          res.status(400).json({ message: "Invalid user ID format" });
          return null;
      }
      
      // Query the database using the MongoDB `_id` field
      const user = await Users.findById(id);
      
      if (!user) {
          console.log(`No user found with MongoDB ID: ${id}`);
          res.status(404).json({ message: "User not found" });
          return null;
      }
      return user;
  } catch (error) {
      console.error("Error finding user by MongoDB ID:", error);
      res.status(500).json({ message: "Error finding user", error });
      return null;
  }
};