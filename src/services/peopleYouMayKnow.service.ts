import User from "../models/users.model.ts";
import { usersInterface } from "../models/users.model.ts";
import { handleProfileAccess } from "../repositories/user.repository.ts";
import { findMutualConnections } from "../repositories/user.repository.ts";
import { Response } from "express";
import mongoose from "mongoose";
import organizations from "../models/organizations.model.ts"; 

export const findPeopleYouMayKnow = async (
    viewerUser: usersInterface & { _id: string },
    context: string,
    cursor: string | null,
    limit: number,
    res: Response
  ) => {
      try {
      let currentField = null;
      let institutionName = null;
      
      const threeWeeksAgo = new Date();
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
      // Build the excluded IDs array 
      const excludedIds = [
        viewerUser._id,
        ...(viewerUser.connections || []).map(conn => typeof conn === 'object' && conn._id ? conn._id : conn),
        ...(viewerUser.blocked || []).map(block => typeof block === 'object' && block._id ? block._id : block),
        ...(viewerUser.sent_connections || []).map(conn => typeof conn === 'object' && conn._id ? conn._id : conn),
        ...(viewerUser.received_connections || []).map(conn => typeof conn === 'object' && conn._id ? conn._id : conn),
        ...(viewerUser.withdrawn_connections || []).filter(conn => {
              // Check if withdrawal date is within the 3-week period
              return conn.date && new Date(conn.date) >= threeWeeksAgo;
            })
            .map(conn => typeof conn === 'object' && conn._id ? conn._id : conn)
      ];

      // Common blocked user conditions 
      const blockedUserConditions = [
        { $or: [
          { blocked: { $exists: false } },
          { blocked: { $size: 0 } }
        ]},
        { "blocked._id": { $ne: new mongoose.Types.ObjectId(viewerUser._id) } },
        { blocked: { $ne: new mongoose.Types.ObjectId(viewerUser._id) } }
      ];

      // Define a type for MongoDB query conditions
      type MongoQueryCondition = { [key: string]: any };
      
      // Base query parts for consitency 
      let queryParts = {
        conditions: {} as MongoQueryCondition,
        exclusions: [
          { _id: { $nin: excludedIds } }
        ] as MongoQueryCondition[],
        blockedConditions: blockedUserConditions as MongoQueryCondition[]
      };

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

          // Set education-specific conditions
          queryParts.conditions = {
            "education.school": currentField
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
          
          // Set work-specific conditions
          queryParts.conditions = {
            "work_experience.organization": currentField
          };
      }

      // Add cursor condition to the exclusions if a cursor is provided
      if (cursor) {
        queryParts.exclusions.push({ _id: { $gt: new mongoose.Types.ObjectId(cursor) } });
      }

      // Build the final query
      const finalQuery = {
        ...queryParts.conditions,
        $and: [
          ...queryParts.exclusions,
          ...queryParts.blockedConditions
        ]
      };
  
      // Fetch people with pagination
      const people = await User.find(finalQuery)
          .sort({ _id: 1 })
          .limit(limit + 1)
          .select("user_id bio.headline bio.first_name bio.last_name profile_photo cover_photo privacy_settings.flag_who_can_send_you_invitations");
  
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