import { Request, Response } from "express";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { findPeopleYouMayKnow } from "../../services/peopleYouMayKnow.service.ts";
import { usersInterface } from "../../models/users.model.ts"; // Import usersInterface

export const getPeopleYouMayKnow = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the viewer user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Ensure the viewerUser._id is a string
    const viewerUserId = typeof viewerUser._id === "string" ? viewerUser._id : viewerUser._id?.toString();

    // Create a properly typed viewerUser object
    const typedViewerUser: usersInterface & { _id: string } = {
      _id: viewerUserId as string, // Ensure _id is a string
      name: viewerUser.name, // Map required properties explicitly
      email: viewerUser.email,
      education: viewerUser.education || [], // Default to empty array if undefined
      work_experience: viewerUser.work_experience || [], // Default to empty array if undefined
      connections: viewerUser.connections || [], // Default to empty array if undefined
      blocked: viewerUser.blocked || [], // Default to empty array if undefined
      sent_connections: viewerUser.sent_connections || [], // Default to empty array if undefined
      received_connections: viewerUser.received_connections || [], // Default to empty array if undefined
      // Add other properties from usersInterface as needed
    } as usersInterface & { _id: string };

    // Extract query parameters for context and pagination
    const { context, cursor, limit } = req.query;

    if (!context || (context !== "education" && context !== "work_experience")) {
      res.status(400).json({ message: "Invalid context. Use 'education' or 'work_experience'." });
      return;
    }

    // Set default limit if not provided
    const pageSize = parseInt(limit as string, 10) || 10;

    // Fetch people you may know
    const { institutionName, people, nextCursor } = await findPeopleYouMayKnow(
      typedViewerUser, // Pass the properly typed viewerUser
      context as string,
      cursor as string,
      pageSize,
      res
    );

    res.status(200).json({
      institutionName,
      people,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching people you may know:", error);
    res.status(500).json({ message: "Error fetching people you may know", error });
  }
};