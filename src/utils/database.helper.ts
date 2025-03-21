import { Request, Response } from "express";
import Users from "../models/users.model.ts";
import { usersInterface } from "../models/users.model.ts";
import { organizationsInterface } from "../models/organizations.model.ts";
import { ObjectId } from "mongodb";
import  "../models/posts.model.ts";
import  "../models/comments.model.ts";

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
};




/**
 * Finds a user by the given user_id.
 * Returns the user document if found; otherwise sends a 404 response and returns null.
 */
export const findUserByUserId = async (user_id: string, res: Response) => {
    try {
        // Query the database using the `user_id` field
        const user = await Users.findOne({ user_id });
        if (!user) {
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
 * This function can be extended based on your application's business rules.
 */
export const checkProfileAccess = async (
    currentUserId: string,
    targetUserId: string
  ): Promise<boolean> => {
    try {
      // Find the target user by their user_id
      const targetUser = await Users.findOne({ user_id: targetUserId });
      if (!targetUser) {
        return false; // Target user does not exist
      }
  
      // Allow access if the profile is public
      if (
        targetUser.privacy_settings &&
        targetUser.privacy_settings.flag_account_status === "Public"
      ) {
        return true;
      }
  
      // Deny access if the current user is blocked by the target user
      if (targetUser.blocked && targetUser.blocked.includes(currentUserId)) {
        return false;
      }
  
      // Allow access if the current user is connected to the target user
      if (
        targetUser.connections &&
        targetUser.connections.includes(currentUserId)
      ) {
        return true;
      }
  
      // Deny access if none of the conditions are met
      return false;
    } catch (error) {
      console.error("Error checking profile access:", error);
      return false;
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
      .lean();

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
      .lean();

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
      .lean();

  if (!user || !user.activity || !user.activity.reacted_posts) return [];
  return user.activity.reacted_posts.slice(0, 10); // Return the 10 most recent reacted posts with full data
};

export const updateUserSkills = (user: usersInterface, skills: string[], organization: string) => {
  if (skills && skills.length > 0) {
      for (const skillName of skills) {
          const skillIndex = user.skills.findIndex(skill => skill.name === skillName);
          
          if (skillIndex !== -1) {
              // If skill exists, update used_where
              const experienceExists = user.skills[skillIndex].used_where.includes(organization);
              
              if (!experienceExists) {
                  // If this skill doesn't have this experience in used_where, add it
                  user.skills[skillIndex].used_where.push(organization);  
              }
          } else {
              // If skill doesn't exist, create a new one
              user.skills.push({
                  _id: new ObjectId().toString(),
                  name: skillName,
                  endorsments: [],
                  used_where: [organization]
              });
          }
      }
  }
};

// Helper function to handle removed skills
export const handleRemovedSkills = (user: usersInterface, oldSkills: string[], newSkills: string[], organization: string) => {
  const removedSkills = oldSkills.filter(skill => !newSkills.includes(skill));
  for (const skillName of removedSkills) {
      const skillIndex = user.skills.findIndex(skill => skill.name === skillName);
      if (skillIndex !== -1) {
          // Remove this experience from the skill's used_where array
          user.skills[skillIndex].used_where = user.skills[skillIndex].used_where.filter(
              org => org.toString() !== organization.toString()
          );
      }
  }
};

/**
 * Handles skill and organization updates when deleting a work experience
 * @param user The user document
 * @param experienceSkills Array of skill names from the deleted experience
 * @param organization The organization from the deleted experience
 */
export const handleDeletedExperienceSkills = (user: usersInterface, experienceSkills: string[], organization: organizationsInterface): void => {
  // Check if this organization is used in any remaining work experiences
  const organizationStillUsed = user.work_experience.some(exp => 
    exp.organization === organization
  );
  
  // Process skills - remove organization from skills' used_where arrays if needed
  for (const skillName of experienceSkills) {
    const skillIndex = user.skills.findIndex(skill => skill.name === skillName);
    if (skillIndex !== -1 && !organizationStillUsed) {
      // Remove the organization from the skill's used_where array
      user.skills[skillIndex].used_where = user.skills[skillIndex].used_where.filter(
        org => org.toString() !== organization.toString()
      );
    }
  }
};
