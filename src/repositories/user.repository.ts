import User from '../models/users.model.ts';
import { jobTypeEnum, experienceLevelEnum } from '../models/jobs.model.ts';
import { statusEnum, sexEnum, accountStatusEnum, invitationsEnum } from '../models/users.model.ts';
import mongoose, { Schema, Document } from "mongoose";
import { ConnectionUserInterface} from "../models/users.model.ts";
import Users from "../models/users.model.ts";
import { validateUserIdFromRequest, findUserByUserId, checkProfileAccess  } from "../utils/database.helper.ts";
import { Request , Response } from "express";
export class UserRepository {
  async create(userId: string, firstName: string, lastName: string, email: string, password: string,
    country: string,
    city: string,
    isStudent: boolean | null,
    jobTitle: string | null,
    school: string | null,
    schoolStartYear: number | null,
    schoolEndYear: number | null,
    is16OrAbove: boolean | null,
    birthDate: Date | null,
    employmentType: string | null,
    recentCompany: string | null
  ) {
    return User.create({
      user_id: userId,
      email: email,
      password: password,
      bio: {
        first_name: firstName,
        last_name: lastName,
        headline: "",  // Default empty headline
        experience: [],
        education: [],
        website: "",
        location: {
          country_region: country,
          city: city
        },
        contact_info: {
          phone_number: null,
          country_code: null,
          phone_type: null,
          address: null,
          birthday: birthDate,
          website: null
        }
      },
      education: [{
        school: school,
        degree: null,
        field_of_study: null,
        start_date: schoolStartYear ? new Date(schoolStartYear, 0) : null,
        end_date: schoolEndYear ? new Date(schoolEndYear, 0) : null,
        grade: null,
        activites_and_socials: null,
        skills: [],
        description: null,
        media: []
      }],
      work_experience: [{
        title: jobTitle,
        employee_type: employmentType,
        organization: recentCompany,
        is_current: true,
        start_date: new Date(),
        end_date: null,
        location: null,
        description: null,
        location_type: null,
        skills: [],
        media: []
      }],
      organizations: [],
      skills: [],
      liscence_certificates: [],
      industry: null,
      profile_photo: null,
      cover_photo: null,
      resume: null,
      connections: [],
      followers: [],
      following: [],
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
      blocked: [],
      conversations: [],
      notification: [],
      applied_jobs: [],
      saved_jobs: [],
      sex: null,
      subscription: {
        subscribed: false,
        subscription_started_at: null
      },
      is_student: isStudent,
      is_verified: false,
      is_16_or_above: is16OrAbove
    });
  }

  async update(userId: string, firstName: string, lastName: string, email: string, password: string,
    country: string,
    city: string,
    isStudent: boolean | null,
    jobTitle: string | null,
    school: string | null,
    schoolStartYear: number | null,
    schoolEndYear: number | null,
    is16OrAbove: boolean | null,
    birthDate: Date | null,
    employmentType: string | null,
    recentCompany: string | null
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
          // Only set these if they're provided
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

  async findByEmail(email: string) {
    return User.findOne({ email });
  }

  async findByUserId(id: string) {
    return User.findOne({ user_id: id });
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
        contact_info: {
          phone_number: null,
          country_code: null,
          phone_type: null,
          address: null,
          birthday: null,
          website: null
        }
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
    return User.updateOne({ user_id: user_id }, { $set: { email: email } });
  }

  async deleteAccount(user_id: string) {
    return User.deleteOne({ user_id: user_id });
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
    } else if (accessInfo.reason === "private") {
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
        formattedUser.connections = user.connections
          ? user.connections.map((connection: any) => new mongoose.Types.ObjectId(connection.user_id))
          : [];
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

            if (mutualConnectionUser) {
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