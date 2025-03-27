import { Request, Response } from "express";
import { validateTokenAndUser, getFormattedUserList, formatConnectionData , getUserIdFromToken } from "../../utils/helper.ts";
import { findUserByUserId } from "../../utils/database.helper.ts";
import mongoose from "mongoose";

export const followUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId and target userId
      const result = await validateTokenAndUser(req, res);
      if (!result) return;
  
      const { viewerId, targetUser: targetUser } = result;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Check if the viewer is trying to follow themselves
      if ((viewerUser._id as mongoose.Types.ObjectId).toString() === targetUser._id.toString()) {
        res.status(400).json({ message: "You cannot follow yourself." });
        return;
      }
  
      // Check if the viewer is blocked by the target user
      const isBlocked = Array.isArray(targetUser.blocked) && targetUser.blocked.some(
        (blocked: any) => blocked._id.toString() === (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
    
      if (isBlocked) {
        res.status(403).json({ message: "You are blocked from following this user." });
        return;
      }
  
      // Check if the viewer is allowed to follow the target user
      const whoCanFollow = targetUser.privacy_settings?.Who_can_follow_you;
      if (whoCanFollow === "Connections only" && !targetUser.connections.some(
        (connection: any) => connection._id.toString() === (viewerUser._id as mongoose.Types.ObjectId).toString()
      )) {
        res.status(403).json({ message: "Only connections can follow this user." });
        return;
      }
  
      // Check if the viewer is already following the target user
      const isAlreadyFollowing = targetUser.followers.some(
        (follower: any) => follower.toString() === (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
      if (isAlreadyFollowing) {
        res.status(400).json({ message: "You are already following this user." });
        return;
      }
  
      // Add the viewer to the target user's followers
      targetUser.followers.push(viewerUser._id);
      await targetUser.save();
  
      // Add the target user to the viewer's following list
      viewerUser.following.push(targetUser._id);
      await viewerUser.save();
  
      res.status(200).json({ message: "You are now following this user." });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ message: "Error following user", error });
    }
  };

  export const unfollowUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId and target userId
      const result = await validateTokenAndUser(req, res);
      if (!result) return;
  
      const { viewerId, targetUser: targetUser } = result;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Check if the viewer is trying to unfollow themselves
      if ((viewerUser._id as mongoose.Types.ObjectId).toString() === targetUser._id.toString()) {
        res.status(400).json({ message: "You cannot unfollow yourself." });
        return;
      }
  
      // Check if the viewer is not following the target user
      const isFollowing = targetUser.followers.some(
        (follower: any) => follower.toString() === (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
      if (!isFollowing) {
        res.status(400).json({ message: "You are not following this user." });
        return;
      }
  
      // Remove the viewer from the target user's followers
      targetUser.followers = targetUser.followers.filter(
        (follower: any) => follower.toString() !== (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
      await targetUser.save();
  
      // Remove the target user from the viewer's following list
      viewerUser.following = viewerUser.following.filter(
        (following: any) => following.toString() !== targetUser._id.toString()
      );
      await viewerUser.save();
  
      res.status(200).json({ message: "You have unfollowed this user." });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ message: "Error unfollowing user", error });
    }
  };

  

  






