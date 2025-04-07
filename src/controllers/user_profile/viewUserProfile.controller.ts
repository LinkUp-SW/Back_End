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