import User from '../models/users.model.ts';
import { jobTypeEnum, experienceLevelEnum } from '../models/jobs.model.ts';
import { statusEnum, sexEnum, accountStatusEnum, invitationsEnum } from '../models/users.model.ts';
import mongoose, { Schema, Document, ObjectId } from "mongoose";
import { ConnectionUserInterface} from "../models/users.model.ts";
import Users from "../models/users.model.ts";
import { validateUserIdFromRequest, findUserByUserId, checkProfileAccess  } from "../utils/database.helper.ts";
import { Request , Response } from "express";
import { CustomError } from '../utils/customError.utils.ts';
import cloudinary from '../../config/cloudinary.ts';
export class UserRepository {
  async create(userId: string, firstName: string, lastName: string, email: string, password: string,
    country: string,
    city: string,
    isStudent: boolean,
    jobTitle?: string,
    school?: ObjectId,
    schoolStartYear?: number,
    schoolEndYear?: number,
    is16OrAbove?: boolean,
    birthDate?: Date,
    employmentType?: string,
    recentCompany?: ObjectId
  ) {
    const userData: any = {
      user_id: userId,
      email: email,
      password: password,
      bio: {
        first_name: firstName,
        last_name: lastName,
        headline: "", // Default empty headline
        experience: [],
        education: [],
        website: "",
        location: {
          country_region: country,
          city: city,
        },
        contact_info: {
          birthday: birthDate,
        },
      },
      organizations: [],
      skills: [],
      liscence_certificates: [],
      connections: [],
      followers: [],
      following: [],
      privacy_settings: {
        flag_account_status: accountStatusEnum.public,
        flag_who_can_send_you_invitations: invitationsEnum.everyone,
        flag_messaging_requests: true,
        messaging_read_receipts: true,
      },
      activity: {
        posts: [],
        reposted_posts: [],
        reacted_posts: [],
        comments: [],
        media: [],
      },
      status: statusEnum.finding_new_job,
      blocked: [],
      conversations: [],
      notification: [],
      applied_jobs: [],
      saved_jobs: [],
      subscription: {
        subscribed: false,
        subscription_started_at: null,
      },
      is_student: isStudent,
      is_verified: false,
      is_16_or_above: is16OrAbove,
    };
  
    if (isStudent) {
      userData.education = [
        {
          _id : new mongoose.Types.ObjectId(),
          school: school,
          start_date: schoolStartYear ? new Date(schoolStartYear, 0) : '',
          end_date: schoolEndYear ? new Date(schoolEndYear, 0) : '',
          skills: [],
          media: [],
        },
      ];
    } else {
      userData.work_experience = [
        {
          _id : new mongoose.Types.ObjectId(),
          title: jobTitle,
          employee_type: employmentType,
          organization: recentCompany,
          is_current: true,
          start_date: new Date(),
          skills: [],
          media: [],
        },
      ];
    }
  
    return User.create(userData);
  }

  async update(userId: string, firstName: string, lastName: string, email: string, password: string,
    country: string,
    city: string,
    isStudent: boolean,
    jobTitle?: string,
    school?: ObjectId,
    schoolStartYear?: number,
    schoolEndYear?: number,
    is16OrAbove?: boolean,
    birthDate?: Date,
    employmentType?: string,
    recentCompany?: ObjectId
  ) {
    // Similarly update the update method to use the correct structure
    return User.findOneAndUpdate(
      { user_id: userId },
      {
        $set: {
          email: email,
          password: password,
          'bio.first_name': firstName,
          'bio.last_name': lastName,
          'bio.location.country_region': country,
          'bio.location.city': city,
          'bio.contact_info.birthday': birthDate,
          is_student: isStudent,
          is_16_or_above: is16OrAbove,
          ...(school && { 'education.0.school': school }),
          ...(schoolStartYear && { 'education.0.start_date': new Date(schoolStartYear, 0) }),
          ...(schoolEndYear && { 'education.0.end_date': new Date(schoolEndYear, 0) }),
          ...(jobTitle && { 'work_experience.0.title': jobTitle }),
          ...(employmentType && { 'work_experience.0.employee_type': employmentType }),
          ...(recentCompany && { 'work_experience.0.organization': recentCompany })
        }
      },
      { new: true, upsert: false }
    );
  }

  async createAdmin(userId: string, firstName: string, lastName: string, email: string, password: string) {
    return User.create({
      user_id: userId,
      email: email,
      password: password,
      bio: {
        first_name: firstName,
        last_name: lastName,
        location: {
          country_region: "",
          city: ""
        },
      },
      is_verified: true,
      is_admin: true,
      privacy_settings: {
        flag_account_status: accountStatusEnum.public,
        flag_who_can_send_you_invitations: invitationsEnum.everyone,
        flag_messaging_requests: true,
        messaging_read_receipts: true
      },
      activity: {
        posts: [],
        reposted_posts: [],
        reacted_posts: [],
        comments: [],
        media: []
      },
    });
  }

  async findByEmail(email: string) {
    return User.findOne({ email });
  }

  async findByUserId(id: string) {
    return User.findOne({ user_id: id });
  }

  // createTempEmail method to create a temporary email for a user
  // This method updates the user's temp_email field in the database
  // It uses the findOneAndUpdate method to find the user by userId and set the temp_email field
  // The new option is set to true to return the updated document
  // The upsert option is set to false to avoid creating a new document if no match is found
  // Returns the updated user document
  async createTempEmail(userId: string, email: string) {
    // Calculate expiry time (10 minutes from now)
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10);
    
    return User.findOneAndUpdate(
      { user_id: userId },
      { 
        $set: { 
          temp_email: email,
          temp_email_expiry: expiryTime 
        }
      },
      { new: true, upsert: false }
    );
  }

  async findByTempEmail(email: string) {
    const user = await User.findOne({
      temp_email: email,
      temp_email_expiry: { $gt: new Date() } // Only return if not expired
    });
    
    if (!user) {
      // Clean up expired temp_email if found
      await User.updateOne(
        { temp_email: email },
        { $unset: { temp_email: "", temp_email_expiry: "" } }
      );
      return null;
    }
    
    return user;
  }

  async cleanupExpiredTempEmails() {
    return User.updateMany(
      { temp_email_expiry: { $lte: new Date() } },
      { $unset: { temp_email: "", temp_email_expiry: "" } }
    );
  }

  async deleteTempEmail(userId: string) {
    return User.updateOne({ user_id: userId }, { $unset: { temp_email: "", temp_email_expiry: "" } });
  }

  async createGoogleUser(user_id: string, email: string, firstName: string, lastName: string, password: string) {
    return User.create({
      user_id: user_id,
      email: email,
      bio: {
        first_name: firstName,
        last_name: lastName,
        location: {
          country_region: "",
          city: ""
        },
      },
      password: password,
      is_verified: true,
      privacy_settings: {
        flag_account_status: accountStatusEnum.public,
        flag_who_can_send_you_invitations: invitationsEnum.everyone,
        flag_messaging_requests: true,
        messaging_read_receipts: true
      },
      activity: {
        posts: [],
        reposted_posts: [],
        reacted_posts: [],
        comments: [],
        media: []
      },
      status: statusEnum.finding_new_job,
      is_16_or_above: true
    });
  }

  async updateEmail(user_id: string, email: string) {
    return User.updateOne({ user_id: user_id }, { $set: { email: email.toLowerCase() } });
  }

  async deleteAccount(userId: string) {
    try {
      // Find the user to be deleted
      const user = await User.findOne({ user_id: userId });
      if (!user) {
        throw new CustomError('User not found', 404);
      }
  
      const userObjectId = user.id;
  
      // 1. Clean up posts, comments, reactions
      await this.cleanupUserPosts(userObjectId);
      
      // 2. Clean up network connections
      await this.cleanupUserNetwork(userObjectId);
      
      // 3. Clean up job applications and saved jobs
      await this.cleanupUserJobs(userObjectId);
      
      // 4. Clean up media files from cloud storage
      await this.cleanupUserMedia(user);
      
      // 5. Clean up organization relationships
      await this.cleanupUserOrganizations(userObjectId);

      // 6. Clean up user conversations
      //await this.cleanupUserConversations(userObjectId);  --> TODO: Implement this method when conversations model is ready
      
      // 7. Delete the user account itself
      const deletedUser = await User.findOneAndDelete({ user_id: userId });
      
      return deletedUser;
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  }

  // private async cleanupUserConversations(userId: mongoose.Types.ObjectId) {

  
  // Helper methods to organize the cleanup process
  private async cleanupUserPosts(userId: mongoose.Types.ObjectId) {
    // Get post IDs created by this user
    const userPosts = await mongoose.model('posts').find({ user_id: userId });
    const userPostIds = userPosts.map(post => post._id);
    
    // Delete all comments by this user
    await mongoose.model('comments').deleteMany({ user_id: userId });
    
    // Delete all reactions by this user
    await mongoose.model('reactions').deleteMany({ user_id: userId });
    
    // Remove user reactions from other users' activity
    await User.updateMany(
      {}, 
      { $pull: { 'activity.reacts': { user_id: userId } } }
    );
    
    // Delete reposts by this user
    await mongoose.model('posts').deleteMany({ 
      user_id: userId,
      post_type: 'repost' 
    });
    
    // Delete all comments and reactions on the user's posts
    for (const postId of userPostIds) {
      await mongoose.model('comments').deleteMany({ post_id: postId });
      await mongoose.model('reactions').deleteMany({ target_id: postId });
    }
    
    // Delete all posts by this user
    await mongoose.model('posts').deleteMany({ user_id: userId });
  }
  
  private async cleanupUserNetwork(userId: mongoose.Types.ObjectId) {
    // Remove user from others' connections, followers, following lists
    await User.updateMany(
      {}, 
      { 
        $pull: { 
          connections: { _id: userId },
          followers: userId,
          following: userId,
          sent_connections: { _id: userId },
          received_connections: { _id: userId },
          blocked: { _id: userId },
          withdrawn_connections: { _id: userId }
        } 
      }
    );
  }
  
  private async cleanupUserJobs(userId: mongoose.Types.ObjectId) {
    // Delete job applications by this user
    await mongoose.model('jobApplications').deleteMany({ user_id: userId });
    
    // Remove job applications from jobs
    const jobs = await mongoose.model('jobs').find({ 
      applied_applications: { $in: [userId] } 
    });
    
    for (const job of jobs) {
      // Filter out the user's ID from the job's applied applications
      job.applied_applications = job.applied_applications.filter(
        (applicantId: mongoose.Types.ObjectId) => applicantId.toString() !== userId.toString()
      );
      await job.save();
    }
  }
  
  private async cleanupUserMedia(user: any) {
    // Delete profile photo from Cloudinary
    if (user.profile_photo && user.profile_photo !== process.env.DEFAULT_IMAGE_URL) {
      const profilePhotoId = this.extractPublicId(user.profile_photo);
      await cloudinary.uploader.destroy(profilePhotoId, { invalidate: true });
    }
    
    // Delete cover photo from Cloudinary
    if (user.cover_photo && user.cover_photo !== process.env.DEFAULT_IMAGE_URL) {
      const coverPhotoId = this.extractPublicId(user.cover_photo);
      await cloudinary.uploader.destroy(coverPhotoId, { invalidate: true });
    }
    
    // Delete resume from Cloudinary
    if (user.resume) {
      let resumeId = this.extractPublicId(user.resume);
      if (!resumeId.endsWith('.pdf')) {
        resumeId += '.pdf';
      }
      await cloudinary.uploader.destroy(resumeId, { invalidate: true, resource_type: "raw" });
    }
    
    // Delete media from education, work experience, licenses
    const mediaUrls = this.collectAllMediaUrls(user);
    await deleteMediaFromCloud(mediaUrls);
  }
  
  private async cleanupUserOrganizations(userId: mongoose.Types.ObjectId) {
    // Remove user from organization admins and followers
    await mongoose.model('organizations').updateMany(
      {}, 
      { 
        $pull: { 
          admins: userId,
          followers: userId,
          blocked: userId
        } 
      }
    );
  }
  
  private extractPublicId(url: string): string {
    if (!url) return '';
    const urlParts = url.split('/');
    const fileNameWithExtension = urlParts[urlParts.length - 1];
    const publicId = fileNameWithExtension.split('.')[0];
    return publicId;
  }
  
  private collectAllMediaUrls(user: any): string[] {
    const mediaUrls: string[] = [];
    
    // Collect from education
    if (user.education) {
      user.education.forEach((edu: any) => {
        if (edu.media) {
          edu.media.forEach((media: any) => {
            if (media.media) mediaUrls.push(media.media);
          });
        }
      });
    }
    
    // Collect from work experience
    if (user.work_experience) {
      user.work_experience.forEach((exp: any) => {
        if (exp.media) {
          exp.media.forEach((media: any) => {
            if (media.media) mediaUrls.push(media.media);
          });
        }
      });
    }
    
    // Collect from licenses
    if (user.liscence_certificates) {
      user.liscence_certificates.forEach((lic: any) => {
        if (lic.media) {
          lic.media.forEach((media: any) => {
            if (media.media) mediaUrls.push(media.media);
          });
        }
      });
    }
    
    return mediaUrls;
  }
}






/**
 * Checks if the viewer has access to the target user's profile.
 * Sends the appropriate response if access is denied.
 * @param viewerId - The ID of the viewer (current user).
 * @param targetUserId - The ID of the target user (profile owner).
 * @param res - The Express response object.
 * @returns A boolean indicating whether access is granted.
 */
export const handleProfileAccess = async (
  viewerId: string,
  targetUserId: string,
  res: Response
): Promise<boolean> => {
  const accessInfo = await checkProfileAccess(viewerId, targetUserId);

  if (!accessInfo.accessGranted) {
    if (accessInfo.reason === "blocked") {
      res.status(403).json({ message: "You are blocked from viewing this profile." });
    } 
    else if (accessInfo.reason === "blocking") {
      res.status(403).json({ message: "You are blocking this user." });
    }
    
    else if (accessInfo.reason === "private") {
      res.status(403).json({ message: "This profile is private." });
    } else {
      res.status(500).json({ message: "An error occurred while checking profile access." });
    }
    return false;
  }

  return true;
};


/**
 * Retrieves and formats a list of users based on their user IDs.
 * @param userIds - Array of user IDs to retrieve.
 * @param res - Express response object for error handling.
 * @returns An array of formatted user data.
 */
export const getFormattedUserList = async (
  userIds: mongoose.Types.ObjectId[],
  res: Response,
  includeConnections: boolean = false
): Promise<ConnectionUserInterface[] | null> => {
  try {
    const projection: any = {
      _id: 1,
      user_id: 1, // Include the _id field
      "bio.first_name": 1,
      "bio.last_name": 1,
      "bio.headline": 1,
      profile_photo: 1,
    };

    // Include the `connections` field only if requested
    if (includeConnections) {
      projection.connections = 1;
    }

    // Retrieve users from the database
    const users = await Users.find({ _id: { $in: userIds } }, projection).lean();

    // Map the users to the desired format
    return users.map((user) => {
      const formattedUser: ConnectionUserInterface = {
        _id: user._id as mongoose.Types.ObjectId,
        user_id: user.user_id,  
        name: `${user.bio.first_name} ${user.bio.last_name}`,
        headline: user?.bio.headline ?? "",
        profilePicture: user?.profile_photo ?? "",
      };

      // Include the `connections` field only if requested
      if (includeConnections) {
        formattedUser.connections = (user.connections || []).map((connection: any) => connection._id) as mongoose.Types.ObjectId[];
      }

      return formattedUser;
    });
  } catch (error) {
    console.error("Error retrieving user list:", error);
    res.status(500).json({ message: "Error retrieving user list", error });
    return null;
  }
};


/**
 * Finds mutual connections between two users.
 * @param viewerConnections - Array of connection IDs for the viewer.
 * @param targetConnections - Array of connection IDs for the target user.
 * @returns An array of mutual connection IDs.
 */
export const findMutualConnections = (
    viewerConnections: string[],
    targetConnections: string[]
  ): string[] => {
    const mutualConnections = viewerConnections.filter((connection) =>
      targetConnections.includes(connection)
    );
    return mutualConnections;
  };


/**
 * Formats connection data with additional attributes.
 * @param userIds - List of user IDs and dates to format.
 * @param viewerUser - The viewer's user document.
 * @param res - Express response object for error handling.
 * @param includeMutualConnections - Whether to include mutual connections in the response.
 * @returns A formatted list of connections or null if an error occurs.
 */
export const formatConnectionData = async (
  userIds: { _id: mongoose.Types.ObjectId; date: Date }[],
  viewerUser: any,
  res: Response,
  includeMutualConnections: boolean = false
): Promise<ConnectionUserInterface[] | null> => {
  try {
    // Extract user IDs from the input array
    const ids = userIds.map((item) => item._id);

    // Retrieve formatted user data
    const formattedUsers = await getFormattedUserList(ids, res, includeMutualConnections);
    if (!formattedUsers) return null;

    // Map over the userIds array to format the connection data
    return await Promise.all(
      userIds.map(async (item) => {
        const user = formattedUsers.find((u) => u._id?.toString() === item._id.toString());

        // Handle missing user gracefully
        if (!user) {
          return {
            user_id: "",
            name: "",
            headline: "",
            profilePicture: "",
            numberOfMutualConnections: includeMutualConnections ? 0 : undefined,
            ...(includeMutualConnections && { nameOfOneMutualConnection: null }),
            date: item.date,
          };
        }

        // Calculate mutual connections if required
        let mutualConnections: mongoose.Types.ObjectId[] = [];
        let nameOfOneMutualConnection: string | " " = "";

        if (includeMutualConnections) {
          mutualConnections = findMutualConnections(
            viewerUser.connections.map((conn: any) => conn._id.toString()),
            (user.connections || []).map((connection: mongoose.Types.ObjectId) => connection.toString())
          ).map((id) => new mongoose.Types.ObjectId(id));

          // Retrieve the name of one mutual connection if mutual connections exist
          if (mutualConnections.length > 0) {
            const mutualConnectionUser = await Users.findOne(
              { _id: mutualConnections[0] },
              { "bio.first_name": 1, "bio.last_name": 1 }
            ).lean();

            if (mutualConnectionUser && 'bio' in mutualConnectionUser) {
              nameOfOneMutualConnection = `${mutualConnectionUser.bio.first_name} ${mutualConnectionUser.bio.last_name}`;
            }
          }
        }

        return {
          user_id: user.user_id,
          name: user.name ?? "",
          headline: user.headline ?? "",
          profilePicture: user.profilePicture ?? "",
          numberOfMutualConnections: includeMutualConnections ? mutualConnections.length : undefined,
          ...(includeMutualConnections && { nameOfOneMutualConnection }),
          date: item.date,
        };
      })
    );
  } catch (error) {
    console.error("Error formatting connection data:", error);
    res.status(500).json({ message: "Error formatting connection data", error });
    return null;
  }
};

/**
 * Interface for user connection documents
 */
interface UserConnectionsDocument {
  _id: mongoose.Types.ObjectId;
  connections?: Array<{ _id: mongoose.Types.ObjectId; date: Date }>;
  sent_connections?: Array<{ _id: mongoose.Types.ObjectId; date: Date }>;
  received_connections?: Array<{ _id: mongoose.Types.ObjectId; date: Date }>;
  followers?: Array<{ _id: mongoose.Types.ObjectId; date: Date }>;
  following?: Array<{ _id: mongoose.Types.ObjectId; date: Date }>;
}

/**
 * Fetches paginated connections using cursor-based pagination.
 * @param userId - The ID of the user whose connections are being fetched.
 * @param limit - The maximum number of connections to return.
 * @param cursor - The cursor for pagination (optional).
 * @param connectionType - The type of connections to fetch (e.g., "followers", "following").
 * @returns An object containing the paginated connections and the next cursor.
 */
export const getPaginatedConnectionsFollowers = async (
  userId: mongoose.Types.ObjectId,
  limit: number,
  cursor?: string,
  connectionType: "connections" | "sent_connections" | "received_connections" | "followers" | "following" = "connections"
): Promise<{ connections: any[]; nextCursor: string | null }> => {
  try {
    // Find the user by ID and retrieve the specified connection type
    const user = await Users.findById(userId, { [connectionType]: 1 }).lean() ;
    if (!user || !user[connectionType]) {
      return { connections: [], nextCursor: null };
    }

    // Sort connections by date in descending order
    const sortedConnections = user[connectionType].sort((a: any, b: any) => b.date - a.date);

    // If a cursor is provided, find the index of the cursor in the sorted connections
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = sortedConnections.findIndex(
        (connection: any) => connection._id.toString() === cursor
      );
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0; // Start after the cursor
    }

    // Slice the connections array to get the paginated results
    const paginatedConnections = sortedConnections.slice(startIndex, startIndex + limit);

    // Determine the next cursor
    const nextCursor =
      paginatedConnections.length === limit
        ? paginatedConnections[paginatedConnections.length - 1]._id.toString()
        : null;

    return { connections: paginatedConnections, nextCursor };
  } catch (error) {
    console.error("Error fetching paginated connections:", error);
    throw new Error("Error fetching paginated connections");
  }
};


export const convertUser_idInto_id = async (
  userIds: string[] | undefined | null
): Promise<mongoose.Types.ObjectId[] | undefined> => {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return undefined;
  }
  
  try {
    // Find all users with the given user_ids
    const users = await Users.find({ user_id: { $in: userIds } }, { _id: 1, user_id: 1 }).lean();
    
    // Create a mapping of user_id to _id
    const idMap = new Map<string, mongoose.Types.ObjectId>();
    users.forEach(user => {
      if (user && user.user_id && user._id) {
        idMap.set(user.user_id, new mongoose.Types.ObjectId(user._id.toString()));
      }
    });
    
    // Convert each user_id to _id, filtering out any that weren't found
    const mongoIds = userIds
      .map(id => idMap.get(id))
      .filter((id): id is mongoose.Types.ObjectId => id !== undefined);
      
    return mongoIds.length > 0 ? mongoIds : undefined;
  } catch (error) {
    console.error("Error converting user_ids to _ids:", error);
    return undefined;
  }
};

export const convert_idIntoUser_id = async (
  mongoIds: mongoose.Types.ObjectId[] | string[] | undefined | null
): Promise<string[] | undefined> => {
  if (!mongoIds || !Array.isArray(mongoIds) || mongoIds.length === 0) {
    return undefined;
  }
  
  // Ensure all IDs are converted to strings
  const stringIds = mongoIds.map(id => id.toString());
  
  try {
    // Find all users with the given _ids
    const users = await Users.find(
      { _id: { $in: stringIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { _id: 1, user_id: 1 }
    ).lean();
    
    // Create a mapping of _id to user_id
    const idMap = new Map<string, string>();
    users.forEach(user => {
      if (user && user._id && user.user_id) {
        idMap.set(user._id.toString(), user.user_id);
      }
    });
    
    // Convert each _id to user_id, filtering out any that weren't found
    const userIds = stringIds
      .map(id => idMap.get(id))
      .filter((id): id is string => id !== undefined);
      
    return userIds.length > 0 ? userIds : undefined;
  } catch (error) {
    console.error("Error converting _ids to user_ids:", error);
    return undefined;
  }
};


/**
 * Gets formatted author information from a user document
 * @param userId - The user ID to fetch author information for
 * @returns A Promise containing the formatted author object
 */


export async function getFormattedAuthor(userId: string) {
  try {
    const userDoc = await Users.findOne(
      { _id: userId },
      {
        user_id: 1,
        "bio.first_name": 1,
        "bio.last_name": 1,
        "bio.headline": 1,
        profile_photo: 1
      }
    ).lean();
    
    if (!userDoc) {
      return null;
    }
    
    return {
      username: userDoc.user_id,
      first_name: userDoc.bio?.first_name || "",
      last_name: userDoc.bio?.last_name || "",
      headline: userDoc.bio?.headline || "",
      profile_picture: userDoc.profile_photo || ""
    };
  } catch (err) {
    console.error("Error fetching author info:", err);
    return null;
  }
}
/**
 * Deletes multiple media files from Cloudinary
 * @param mediaUrls - Array of media URLs to delete
 * @returns Promise that resolves when all deletions are complete
 */
async function deleteMediaFromCloud(mediaUrls: string[]): Promise<void> {
  if (!mediaUrls || mediaUrls.length === 0) {
    return;
  }

  const deletePromises = mediaUrls.map(async (url) => {
    try {
      if (!url) return;
      
      // Extract the public ID from the URL
      const urlParts = url.split('/');
      const fileNameWithExtension = urlParts[urlParts.length - 1];
      const fileName = fileNameWithExtension.split('.')[0];
      
      // Determine resource type based on file extension
      const extension = fileNameWithExtension.split('.').pop()?.toLowerCase();
      const resourceType = 
        ['pdf', 'doc', 'docx', 'txt', 'csv'].includes(extension || '') 
          ? 'raw' 
          : ['mp4', 'mov', 'avi', 'wmv'].includes(extension || '')
            ? 'video'
            : 'image';
      
      // Delete the file from Cloudinary
      await cloudinary.uploader.destroy(fileName, { 
        invalidate: true,
        resource_type: resourceType
      });
      
      console.log(`Successfully deleted file: ${fileName}`);
    } catch (error) {
      console.error(`Failed to delete media file ${url}:`, error);
    }
  });
  
  // Wait for all deletion operations to complete
  await Promise.all(deletePromises);
}

