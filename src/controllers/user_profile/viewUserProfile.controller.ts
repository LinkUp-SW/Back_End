import { Request, Response } from "express";
import {
  validateUserIdFromRequest,
  findUserByUserId,
  checkProfileAccess,
  getUserPostsLimited,
  getUserCommentsLimited,
  getUserReactedPostsLimited,
} from "../../utils/database.helper.ts";
import tokenUtils from "../../utils/token.utils.ts";
import { findMutualConnections , handleProfileAccess} from "../../repositories/user.repository.ts";
import { validateTokenAndUser } from "../../utils/helperFunctions.utils.ts";
import Organization from "../../models/organizations.model.ts"; // Import the organization model
import User from "../../models/users.model.ts"; // Import the user model
import mongoose from "mongoose"; // Import mongoose

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and extract user ID from the token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    const decodedToken = tokenUtils.validateToken(token) as { userId: string };

    if (!decodedToken || !decodedToken.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const viewerId = decodedToken.userId;

    // Validate the user_id parameter from the request
    const userId = await validateUserIdFromRequest(req, res);
    if (!userId) return;

    // Retrieve the target user document
    const user = await findUserByUserId(userId, res);
    if (!user) return;

    // Check if the viewer is blocked by the profile owner
    if (user.blocked && user.blocked.some((blockedUser: any) => blockedUser.toString() === viewerId)) {
      res.status(403).json({ message: "You are blocked from viewing this profile." });
      return;
    }

    // Allow access if the viewer is the same as the user (is_me)
    const isMe = viewerId === userId;
    if (!isMe) {
      // Check if the viewer has access to the profile
      const hasAccess = await checkProfileAccess(viewerId.toString(), user.user_id.toString());
      if (!hasAccess) {
        res.status(403).json({ message: "This profile is private." });
        return;
      }
    }

    // Fetch the 10 most recent posts, comments, and reacted posts
    const userPosts = await getUserPostsLimited(userId);
    const userComments = await getUserCommentsLimited(userId);
    const userReactedPosts = await getUserReactedPostsLimited(userId);

    // Construct the response using the user's integrated fields
    const userProfile = {
      is_me: isMe,
      bio: user.bio || null,
      education: user.education || [],
      experience: user.work_experience || [],
      skills: user.skills || [],
      licenses: user.liscence_certificates || [],
      posts: userPosts,
      comments: userComments,
      reacted: userReactedPosts,
      profile_photo: user.profile_photo || null,
      cover_photo: user.cover_photo || null,
      resume: user.resume || null,
    };

    res.status(200).json(userProfile);
  } catch (error) {
    
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message,success:false });
}
  else{
    
    
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Error fetching user profile", error });
  }
}
};

export const getUserBio = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await validateTokenAndUser(req, res);
    if (!result) return;
     
    const { viewerId, targetUser: targetUser } = result;
     
    // Retrieve the viewer's user document
    const viewerUser = await findUserByUserId(viewerId, res);
    if (!viewerUser) return;

    // check if the target profile is public or private and if the viewer is connected to the target user
    const hasAccess = await handleProfileAccess(viewerId.toString(), targetUser.user_id.toString(), res);
    if (!hasAccess) return;

    // Check if the viewer is the same as the user (is_me)
    const isMe = viewerId === targetUser.user_id;

    if (isMe) {
      // If the viewer is the same as the user, return full bio 
      const userBio = {
        is_me: true,
        bio: targetUser.bio,
        email: targetUser.email,
        profile_photo: targetUser.profile_photo || null,
        cover_photo: targetUser.cover_photo || null,
        number_of_connections: targetUser.connections.length,
        contact_info: targetUser.bio.contact_info,
        isSubscribed: targetUser.subscription?.subscribed || false,
      };

      res.status(200).json(userBio);
      return;
    }


    // Find mutual connections
    const mutualConnections = findMutualConnections(
      viewerUser.connections.map((conn: any) => conn._id.toString()),
      targetUser.connections.map((conn: any) => conn._id.toString())
    );

    const nameOfOneMutualConnection = mutualConnections.length > 0
      ? await (async () => {
          const mutualConnectionUser = await findUserByUserId(mutualConnections[0], res);
          return mutualConnectionUser
            ? `${mutualConnectionUser.bio.first_name} ${mutualConnectionUser.bio.last_name}`
            : null;
        })()
      : null;

    // Check if the user is in the viewer's received or sent connections
    const isInReceivedConnections = viewerUser.received_connections.some(
      (conn: any) => conn._id.toString() === targetUser._id.toString()
    );
    const isInSentConnections = viewerUser.sent_connections.some(
      (conn: any) => conn._id.toString() === targetUser._id
    );

    const isInConnections = viewerUser.connections.some(
      (conn: any) => conn._id.toString() === targetUser._id.toString()
    );

    const isAlreadyFollowing = targetUser.followers.some(
      (follower: any) => follower._id.toString() === (viewerUser._id as string).toString()
    );

    // Check if follow primary is enabled and get the number of followers if true
    const followPrimary = targetUser.privacy_settings?.make_follow_primary || false;
    const numberOfFollowers = followPrimary ? targetUser.followers.length : undefined;

    // Check if the user is premium
    const isSubscribed = targetUser.subscription?.subscribed || false;

    const userBio = {
      is_me: false,
      bio: targetUser.bio,
      email: targetUser.email,
      profile_photo: targetUser.profile_photo || null,
      cover_photo: targetUser.cover_photo || null,
      number_of_connections: targetUser.connections.length,
      name_of_one_mutual_connection: nameOfOneMutualConnection,
      follow_primary: followPrimary,
      number_of_followers: numberOfFollowers,
      is_in_received_connections: isInReceivedConnections,
      is_in_sent_connections: isInSentConnections,
      isSubscribed: isSubscribed,
      isInConnections: isInConnections,
      isAlreadyFollowing: isAlreadyFollowing,
      
    };

    res.status(200).json(userBio);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message,success:false });
}
  else{

    console.error("Error fetching user bio:", error);
    res.status(500).json({ message: "Error fetching user bio", error });
  }
}
};

export const getUserExperience = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and retrieve viewerId and targetUser
    const result = await validateTokenAndUser(req, res);
    if (!result) return;

    const { viewerId, targetUser } = result;

    // Retrieve the viewer's user document
    const viewerUser = await findUserByUserId(viewerId, res);
    if (!viewerUser) return;

    // Check if the target profile is public or private and if the viewer is connected to the target user
    const hasAccess = await handleProfileAccess(viewerId.toString(), targetUser.user_id.toString(), res);
    if (!hasAccess) return;

    // Check if the viewer is the same as the user (is_me)
    const isMe = viewerId === targetUser.user_id;

    // Extract all unique organization IDs that are ObjectIds
    const organizationIds = targetUser.work_experience
      .filter((experience: any) => mongoose.isValidObjectId(experience.organization))
      .map((experience: any) => experience.organization);

    // Fetch organization details for organizations that are ObjectIds
    const organizations = await Organization.find({ _id: { $in: organizationIds } }).select("_id organization_name logo");
    const organizationMap = new Map(organizations.map((org: any) => [org._id.toString(), org]));

    // Map the work experience details
    const userExperience = {
      is_me: isMe,
      work_experience: targetUser.work_experience.map((experience: any) => {
        let organizationDetails;
        if (mongoose.isValidObjectId(experience.organization)) {
          // If the organization is an ObjectId, fetch details from the organizationMap
          const organization = organizationMap.get(experience.organization.toString());
          organizationDetails = organization
            ? {
                _id: organization._id,
                name: organization.organization_name,
                logo: organization.logo,
              }
            : null; // Handle cases where the organization is not found
        } else {
          // If the organization is a string, return it as is
          organizationDetails = {
            name: experience.organization,
          };
        }

        return {
          _id: experience._id,
          title: experience.title,
          employee_type: experience.employee_type,
          organization: organizationDetails,
          is_current: experience.is_current,
          start_date: experience.start_date,
          end_date: experience.end_date,
          location: experience.location,
          description: experience.description,
          location_type: experience.location_type,
          skills: experience.skills,
          media: experience.media,
        };
      }),
    };

    res.status(200).json(userExperience);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid or expired token") {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error fetching user experience:", error);
      res.status(500).json({ message: "Error fetching user experience", error });
    }
  }
};

export const getUserEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and retrieve viewerId and targetUser
    const result = await validateTokenAndUser(req, res);
    if (!result) return;

    const { viewerId, targetUser } = result;

    // Retrieve the viewer's user document
    const viewerUser = await findUserByUserId(viewerId, res);
    if (!viewerUser) return;

    // Check if the target profile is public or private and if the viewer is connected to the target user
    const hasAccess = await handleProfileAccess(viewerId.toString(), targetUser.user_id.toString(), res);
    if (!hasAccess) return;

    // Check if the viewer is the same as the user (is_me)
    const isMe = viewerId === targetUser.user_id;

    // Extract all unique school IDs that are ObjectIds
    const schoolIds = targetUser.education
      .filter((education: any) => mongoose.isValidObjectId(education.school))
      .map((education: any) => education.school);

    // Fetch organization details for schools that are ObjectIds
    const organizations = await Organization.find({ _id: { $in: schoolIds } }).select("_id organization_name logo");
    const organizationMap = new Map(organizations.map((org: any) => [org._id.toString(), org]));

    // Map the education details
    const userEducation = {
      is_me: isMe,
      education: targetUser.education.map((education: any) => {
        let schoolDetails;
        if (mongoose.isValidObjectId(education.school)) {
          // If the school is an ObjectId, fetch details from the organizationMap
          const organization = organizationMap.get(education.school.toString());
          schoolDetails = organization
            ? {
                _id: organization._id,
                name: organization.organization_name,
                logo: organization.logo,
              }
            : null; // Handle cases where the organization is not found
        } else {
          // If the school is a string, return it as is
          schoolDetails = {
            name: education.school,
          };
        }

        return {
          _id: education._id,
          school: schoolDetails,
          degree: education.degree,
          field_of_study: education.field_of_study,
          start_date: education.start_date,
          end_date: education.end_date,
          grade: education.grade,
          activites_and_socials: education.activites_and_socials,
          skills: education.skills,
          description: education.description,
          media: education.media,
        };
      }),
    };

    res.status(200).json(userEducation);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid or expired token") {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error fetching user education:", error);
      res.status(500).json({ message: "Error fetching user education", error });
    }
  }
};



export const getUserSkills = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and retrieve viewerId and targetUser
    const result = await validateTokenAndUser(req, res);
    if (!result) return;

    const { viewerId, targetUser } = result;

    // Retrieve the viewer's user document
    const viewerUser = await findUserByUserId(viewerId, res);
    if (!viewerUser) return;

    // Check if the target profile is public or private and if the viewer is connected to the target user
    const hasAccess = await handleProfileAccess(viewerId.toString(), targetUser.user_id.toString(), res);
    if (!hasAccess) return;

    // Check if the viewer is the same as the user (is_me)
    const isMe = viewerId === targetUser.user_id;

    // Extract all unique organization and endorser IDs
    const organizationIds = [...new Set(targetUser.skills.flatMap((skill: any) => skill.used_where))];
    const endorserIds = [...new Set(targetUser.skills.flatMap((skill: any) => skill.endorsments))];

    // Fetch organization 
    const organizations = await Organization.find({ _id: { $in: organizationIds } }).select("_id organization_name logo");
    const organizationMap = new Map(organizations.map((org: any) => [org._id.toString(), org]));

    // Fetch endorser details 
    const endorsers = await User.find({ _id: { $in: endorserIds } }).select("_id bio.first_name bio.last_name profile_photo");
    const endorserMap = new Map(endorsers.map((user: any) => [user._id.toString(), user]));

    // Map the skills to include the required fields
    const userSkills = targetUser.skills.map((skill: any) => ({
      _id: skill._id,
      name: skill.name,
      total_endorsements: skill.endorsments.length, // Total number of endorsements
      endorsements: skill.endorsments.map((endorsementId: any) => {
        const endorser = endorserMap.get(endorsementId.toString());
        return endorser
          ? {
              user_id: endorser._id,
              name: `${endorser.bio.first_name} ${endorser.bio.last_name}`,
              profilePicture: endorser.profile_photo || null,
            }
          : null; // Handle cases where the endorser is not found
      }).filter((endorser: any) => endorser !== null), // Remove null entries
      used_where: skill.used_where.map((organizationId: any) => {
        const organization = organizationMap.get(organizationId.toString());
        return organization
          ? {
              _id: organization._id,
              name: organization.organization_name,
              profilePicture: organization.logo,
            }
          : null; // Handle cases where the organization is not found
      }).filter((org: any) => org !== null), // Remove null entries
    }));

    const response = {
      is_me: isMe,
      skills: userSkills,
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid or expired token") {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error fetching user skills:", error);
      res.status(500).json({ message: "Error fetching user skills", error });
    }
  }
};