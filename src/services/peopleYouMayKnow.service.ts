import User from "../models/users.model.ts";
import { usersInterface } from "../models/users.model.ts";
import { handleProfileAccess } from "../repositories/user.repository.ts";
import { findMutualConnections } from "../repositories/user.repository.ts";
import { Response } from "express";
import mongoose from "mongoose";
import organizations from "../models/organizations.model.ts"; // Import the organizations model

export const findPeopleYouMayKnow = async (
    viewerUser: usersInterface & { _id: string },
    context: string,
    cursor: string | null,
    limit: number,
    res: Response
  ) => {
      try {
      let query = {};
      let currentField = null;
      let institutionName = null;

      if (context === "education") {
          if (!viewerUser.education || viewerUser.education.length === 0) {
            return { people: [], nextCursor: null, institutionName: null };
          }
      
          // Find the current education with the furthest end_date
          const currentEducation = viewerUser.education
          .filter((edu) => edu.end_date === null || new Date(edu.end_date) > new Date())
          .sort((a, b) => {
              const dateA = a.end_date ? new Date(a.end_date).getTime() : Infinity;
              const dateB = b.end_date ? new Date(b.end_date).getTime() : Infinity;
              return dateB - dateA;
          })[0];
      
          if (!currentEducation) {
            return { people: [], nextCursor: null, institutionName: null };
          }
  
          currentField = currentEducation.school;
          

        // Look up the organization
        const organization = await organizations.findById(currentField);
        if (organization) {

            institutionName = organization.name;
        } else {
            institutionName = 'Unknown School';
        }

          query = {
            "education.school": currentField,
            _id: { $ne: viewerUser._id, $nin: [...viewerUser.connections, ...viewerUser.blocked] }, 
            blocked: { $nin: [new mongoose.Types.ObjectId(viewerUser._id)] },
          };
      } else if (context === "work_experience") {
          if (!viewerUser.work_experience || viewerUser.work_experience.length === 0) {
            return { people: [], nextCursor: null, institutionName: null };
          }
  
          const currentWork = viewerUser.work_experience.find((exp) => exp.is_current);
          if (!currentWork) {
            return { people: [], nextCursor: null, institutionName: null };
          }
  
          currentField = currentWork.organization;
          
            // Look up the organization
            const organization = await organizations.findById(currentField);
            if (organization) {
              institutionName = organization.name;
            } else {
              institutionName = 'Unknown Organization';
            }
          
          query = {
            "work_experience.organization": currentField,
            _id: { $ne: viewerUser._id, $nin: [...viewerUser.connections, ...viewerUser.blocked] },
            blocked: { $nin: [new mongoose.Types.ObjectId(viewerUser._id)] },
          };
      }
  
      // Add cursor-based pagination
      if (cursor) {
          query = { ...query, _id: { $gt: cursor } };
      }
  
      // Fetch people with pagination
      const people = await User.find(query)
          .sort({ _id: 1 })
          .limit(limit + 1)
          .select("user_id bio.headline profile_photo privacy_settings.flag_who_can_send_you_invitations");
  
      // Determine the next cursor
      const hasNextPage = people.length > limit;
      const nextCursor = hasNextPage ? people[limit - 1]._id : null;
  
      // Return the results with the proper institution name
      return {
          institutionName: institutionName,
          people: hasNextPage ? people.slice(0, limit) : people,
          nextCursor,
      };
  }
  catch (error) {
      console.error("Error fetching people you may know:", error);
      res.status(500).json({ message: "Error fetching people you may know", error });
      return { people: [], nextCursor: null, institutionName: null };
  };
  }