import { Request, Response } from "express";
import {
  validateUserIdFromRequest,
  findUserByUserId,
  checkProfileAccess,
  getUserPostsLimited,
  getUserCommentsLimited,
  getUserReactedPostsLimited,
  findUserById
  
} from "../../utils/database.helper.ts";
import { findMutualConnections , handleProfileAccess} from "../../repositories/user.repository.ts";
import { validateTokenAndUser,getUserIdFromToken } from "../../utils/helperFunctions.utils.ts";
import Organization from "../../models/organizations.model.ts"; // Import the organization model
import User from "../../models/users.model.ts"; // Import the user model
import mongoose from "mongoose"; // Import mongoose
const DEFAULT_IMAGE_URL = "https://res.cloudinary.com/dyhnxqs6f/image/upload/v1719229880/meme_k18ky2_c_crop_w_674_h_734_x_0_y_0_u0o1yz.png";

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and extract user ID from the token
    let userId = await getUserIdFromToken(req, res);
    if (!userId) return;

    let viewerId = userId;

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

    // Check if the target profile is public or private and if the viewer is connected to the target user
    const hasAccess = await handleProfileAccess(viewerId.toString(), targetUser.user_id.toString(), res);
    if (!hasAccess) return;

    // Check if the viewer is the same as the user (is_me)
    const isMe = viewerId === targetUser.user_id;

    // Find the education with the furthest end_date
    const furthestEducation = targetUser.education.reduce((furthest: any, current: any) => {
      if (!furthest || new Date(current.end_date) > new Date(furthest.end_date)) {
        return current;
      }
      return furthest;
    }, null);

    let educationDetails = null;
    if (furthestEducation && mongoose.isValidObjectId(furthestEducation.school)) {
      const school = await Organization.findById(furthestEducation.school).select("_id name logo");
      if (school) {
        educationDetails = {
            _id: school._id,
            name: school.name,
            logo: school.logo,
        };
      }
    }

    // Find the current work experience where is_current is true
    const currentExperience = targetUser.work_experience.find((experience: any) => experience.is_current) 
  || targetUser.work_experience.reduce((furthest: any, current: any) => {
    if (!furthest || new Date(current.end_date) > new Date(furthest.end_date)) {
      return current;
    }
    return furthest;
  }, null);

    let experienceDetails = null;
    if (currentExperience && mongoose.isValidObjectId(currentExperience.organization)) {
      const organization = await Organization.findById(currentExperience.organization).select("_id name logo");
      if (organization) {
        experienceDetails = {
            _id: organization._id,
            name: organization.name,
            logo: organization.logo,

        };
      }
    }

    if (isMe) {
      // If the viewer is the same as the user, return full bio
      const userBio = {
        is_me: true,
        bio: targetUser.bio,
        email: targetUser.email,
        profile_photo: targetUser.profile_photo || null,
        is_default_profile_photo: targetUser.profile_photo === DEFAULT_IMAGE_URL,
        is_defult_cover_photo: targetUser.cover_photo === DEFAULT_IMAGE_URL,
        cover_photo: targetUser.cover_photo || null,
        number_of_connections: targetUser.connections.length,
        contact_info: targetUser.bio.contact_info,
        isSubscribed: targetUser.subscription?.subscribed || false,
        education: educationDetails,
        work_experience: experienceDetails,
        resume: targetUser.resume || "",
        number_of_saved_posts: targetUser.savedPosts.length,
        number_of_saved_jobs: targetUser.saved_jobs.length,
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
          const mutualConnectionUser = await findUserById(mutualConnections[0], res);
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
      (conn: any) => conn._id.toString() === targetUser._id.toString()
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

    // Check if the user privacy settings allows invitations by email
    const isConnectByEmail = targetUser.privacy_settings?.flag_who_can_send_you_invitations === "email";

    // Check if the user is premium
    const isSubscribed = targetUser.subscription?.subscribed || false;

    const userBio = {
      is_me: false,
      bio: targetUser.bio,
      email: targetUser.email,
      profile_photo: targetUser.profile_photo || null,
      is_default_profile_photo: targetUser.profile_photo === DEFAULT_IMAGE_URL,
      is_defult_cover_photo: targetUser.cover_photo === DEFAULT_IMAGE_URL,
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
      isConnectByEmail: isConnectByEmail,
      education: educationDetails,
      work_experience: experienceDetails,
      profile_visibility: targetUser.privacy_settings?.flag_account_status|| "public",
      viewer_user_is_subscribed: viewerUser.subscription?.subscribed || false,
      allow_messaging: targetUser.privacy_settings?.flag_messaging_requests || false,
      resume: targetUser.resume || "",
    };

    res.status(200).json(userBio);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
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
    const organizations = await Organization.find({ _id: { $in: organizationIds } }).select("_id name logo");
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
                name: organization.name,
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
          end_date: experience.end_date ,
          location: experience.location,
          description: experience.description,
          location_type: experience.location_type,
          skills: experience.skills || [],
          media: experience.media || [],
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
    const organizations = await Organization.find({ _id: { $in: schoolIds } }).select("_id name logo");
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
                name: organization.name,
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

    // Get fully populated user data to access related organizations
    const populatedUser = await User.findById(targetUser._id)
      .populate('education.school')
      .populate('work_experience.organization')
      .populate('liscence_certificates.issuing_organization')
      .populate('skills.endorsments');
    
    if (!populatedUser) {
      res.status(404).json({ message: 'User data not found' });
      return;
    }

    // Map the skills to include the required fields
    const userSkills = populatedUser.skills.map((skill: any) => {
      // Process endorsements
      const endorsements = skill.endorsments.map((endorser: any) => ({
        user_id: endorser.user_id,
        name: `${endorser.bio?.first_name || ''} ${endorser.bio?.last_name || ''}`.trim(),
        profilePicture: endorser.profile_photo || null,
      }));

      // Process educations
      const educationItems = skill.educations.map((educationId: string) => {
        const edu = populatedUser.education.find((e: any) => e._id.toString() === educationId);
        if (edu && edu.school) {
          return {
            _id: edu._id,
            name: edu.school.name,
            logo: edu.school.logo
          };
        }
        return null;
      }).filter(Boolean);

      // Process experiences
      const experienceItems = skill.experiences.map((experienceId: string) => {
        const exp = populatedUser.work_experience.find((e: any) => e._id.toString() === experienceId);
        if (exp && exp.organization) {
          return {
            _id: exp._id,
            name: exp.title,
            logo: exp.organization.logo
          };
        }
        return null;
      }).filter(Boolean);

      // Process licenses
      const licenseItems = skill.licenses.map((licenseId: string) => {
        const lic = populatedUser.liscence_certificates.find((l: any) => l._id.toString() === licenseId);
        if (lic && lic.issuing_organization) {
          return {
            _id: lic._id,
            name: lic.name,
            logo: lic.issuing_organization.logo
          };
        }
        return null;
      }).filter(Boolean);

      return {
        _id: skill._id,
        name: skill.name,
        total_endorsements: skill.endorsments.length,
        endorsments: endorsements,
        educations: educationItems,
        experiences: experienceItems,
        licenses: licenseItems
      };
    });

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


export const getUserLicense = async (req: Request, res: Response): Promise<void> => {
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

    // Extract all unique issuing organization IDs that are ObjectIds
    const organizationIds = targetUser.liscence_certificates
      .filter((license: any) => mongoose.isValidObjectId(license.issuing_organization))
      .map((license: any) => license.issuing_organization);

    // Fetch organization details for issuing organizations
    const organizations = await Organization.find({ _id: { $in: organizationIds } }).select("_id name logo");
    const organizationMap = new Map(organizations.map((org: any) => [org._id.toString(), org]));

    // Map the license certificates to include the required fields
    const userLicenses = targetUser.liscence_certificates.map((license: any) => {
      let issuingOrganizationDetails;
      if (mongoose.isValidObjectId(license.issuing_organization)) {
        // If the issuing organization is an ObjectId, fetch details from the organizationMap
        const organization = organizationMap.get(license.issuing_organization.toString());
        issuingOrganizationDetails = organization
          ? {
              _id: organization._id,
              name: organization.name,
              logo: organization.logo,
            }
          : null; // Handle cases where the organization is not found
      } else {
        // If the issuing organization is a string, return it as is
        issuingOrganizationDetails = {
          name: license.issuing_organization,
        };
      }

      return {
        _id: license._id,
        name: license.name,
        issuing_organization: issuingOrganizationDetails,
        issue_date: license.issue_date,
        expiration_date: license.expiration_date,
        credintial_id: license.credintial_id,
        credintial_url: license.credintial_url,
        skills: license.skills || [],
        media: license.media || [],
      };
    });

    const response = {
      is_me: isMe,
      licenses: userLicenses,
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid or expired token") {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error fetching user licenses:", error);
      res.status(500).json({ message: "Error fetching user licenses", error });
    }
  }
};

