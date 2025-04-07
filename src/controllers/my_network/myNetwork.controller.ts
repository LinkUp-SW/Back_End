import { Request, Response } from "express";
import { validateTokenAndUser, getUserIdFromToken } from "../../utils/helperFunctions.utils.ts";
import { getFormattedUserList, formatConnectionData } from "../../repositories/user.repository.ts";
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
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            res.status(401).json({ message: error.message,success:false });
    }
        else{
          console.error("Error following user:", error);
          res.status(500).json({ message: "Error following user", error });
    }
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
          if (error instanceof Error && error.message === 'Invalid or expired token') {
            res.status(401).json({ message: error.message,success:false });
    }
        else{

      console.error("Error unfollowing user:", error);
      res.status(500).json({ message: "Error unfollowing user", error });
    }
  }
  };

  export const getFollowingList = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId
      const viewerId = await getUserIdFromToken(req, res);
      if (!viewerId) return;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Filter the following list to exclude users in the connections network
      const nonConnectionFollowing = viewerUser.following.filter((followingId: any) => {
        const followingIdStr = followingId.toString(); // Convert followingId to string
        return !viewerUser.connections.some(
          (connection: any) => connection._id.toString() === followingIdStr
        );
      });
  
      // Retrieve and format the filtered following list
      const formattedFollowingList = await getFormattedUserList(
        nonConnectionFollowing.map((id: mongoose.Types.ObjectId) => new mongoose.Types.ObjectId(id)),
        res
      );
      if (!formattedFollowingList) return;
  
      // Exclude the `_id` field from the response
      const followingWithoutId = formattedFollowingList.map((user) => ({
        user_id: user.user_id,
        name: user.name,
        headline: user.headline,
        profilePicture: user.profilePicture,
      }));
  
      res.status(200).json({ following: followingWithoutId });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{

      console.error("Error fetching following list:", error);
      res.status(500).json({ message: "Error fetching following list", error });
    }
  }
  };

  export const getFollowersList = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId
      const viewerId = await getUserIdFromToken(req, res);
      if (!viewerId) return;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Retrieve and format the followers list
      const formattedFollowersList = await getFormattedUserList(
        viewerUser.followers.map((id: mongoose.Types.ObjectId) => id),
        res
      );
      if (!formattedFollowersList) return;
  
      // Add the `following` attribute to each user
      const followersWithFollowingStatus = formattedFollowersList.map((user) => ({
        user_id: user.user_id, // Use `user_id` from the formatted list
        name: user.name,
        headline: user.headline,
        profilePicture: user.profilePicture,
        following: viewerUser.following.some(
          (followingId: mongoose.Types.ObjectId) => followingId.equals(user._id) // Use `equals` to compare ObjectId
        ), // Check if the viewer follows this user
      }));
  
      // Sort the followers list in descending order (most recent followers first)
      const sortedFollowers = followersWithFollowingStatus.reverse();
  
      res.status(200).json({ followers: sortedFollowers });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{

      console.error("Error fetching followers list:", error);
      res.status(500).json({ message: "Error fetching followers list", error });
    }
  }
  };
  export const sendConnectionRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId and target userId
      const result = await validateTokenAndUser(req, res);
      if (!result) return;
  
      const { viewerId, targetUser } = result;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;

      // Check if the user is not subscribed and already has 50 connections (including pending and received)
      const totalConnections = viewerUser.connections.length + viewerUser.received_connections.length + viewerUser.sent_connections.length;
      if (!viewerUser.subscription.subscribed && totalConnections >= 50) {
        res.status(400).json({ message: "You have reached the maximum number of connections allowed for non-subscribed users." });
        return;
      }
  
      // Check if the viewer is trying to send a connection request to themselves
      if ((viewerUser._id as mongoose.Types.ObjectId).toString() === targetUser._id.toString()) {
        res.status(400).json({ message: "You cannot send a connection request to yourself." });
        return;
      }

      // Check if the viewer is blocked by the target user
      const isBlocked = Array.isArray(targetUser.blocked) && targetUser.blocked.some(
        (blocked: any) => blocked._id.toString() === (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
    
      if (isBlocked) {
        res.status(403).json({ message: "You are blocked from sending a connection request to this user." });
        return;
      }
  
      // Check if the viewer is already connected to the target user
      const isAlreadyConnected = viewerUser.connections.some(
        (connection: any) => connection._id.toString() === targetUser._id.toString()
      );
      if (isAlreadyConnected) {
        res.status(400).json({ message: "You are already connected to this user." });
        return;
      }
  
      // Check if the target user exists in the viewer's withdrawn_connections and is within the 3-week restriction period
      const threeWeeksAgo = new Date();
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
  
      const existingWithdrawal = viewerUser.withdrawn_connections.find(
        (withdrawn: any) =>
          withdrawn._id.toString() === targetUser._id.toString() &&
          withdrawn.date > threeWeeksAgo
      );
  
      if (existingWithdrawal) {
        res.status(400).json({
          message: "You cannot send another connection request to this user for 3 weeks.",
        });
        return;
      }
  
      // Check the target user's privacy settings for "Who can send you invitations"
      const whoCanSendInvitations = targetUser.privacy_settings?.flag_who_can_send_you_invitations;
      if (whoCanSendInvitations === "email") {
        const { email } = req.body;
  
        // Ensure the email is provided
        if (!email) {
          res.status(400).json({ message: "Email is required to send a connection request." });
          return;
        }
  
        // Check if the provided email matches the target user's email
        if (email !== targetUser.email) {
          res.status(400).json({ message: "The provided email does not match the user's email." });
          return;
        }
      }
  
      // Check if the viewer is already in the target user's pending connections
      const isAlreadyPending = targetUser.received_connections.some(
        (pending: any) => pending._id.toString() === (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
      if (isAlreadyPending) {
        res.status(400).json({ message: "You have already sent a connection request to this user." });
        return;
      }
  
      // Add the viewer to the target user's pending connections with the current date
      targetUser.received_connections.push({
        _id: viewerUser._id,
        date: new Date(),
      });
      await targetUser.save();
  
      // Add the target user to the viewer's sent connections with the current date
      viewerUser.sent_connections.push({
        _id: targetUser._id,
        date: new Date(),
      });
      await viewerUser.save();
  
      // Automatically follow the target user if their "Who_can_follow_you" setting is "Everyone"
      const whoCanFollow = targetUser.privacy_settings?.Who_can_follow_you;
      if (whoCanFollow === "Everyone") {
        // Check if the viewer is already following the target user
        const isAlreadyFollowing = targetUser.followers.some(
          (follower: any) => follower.toString() === (viewerUser._id as mongoose.Types.ObjectId).toString()
        );
        if (!isAlreadyFollowing) {
          // Add the viewer to the target user's followers
          targetUser.followers.push(viewerUser._id);
          await targetUser.save();
  
          // Add the target user to the viewer's following list
          viewerUser.following.push(targetUser._id);
          await viewerUser.save();
        }
      }
  
      res.status(200).json({ message: "Connection request sent successfully." });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{

      console.error("Error sending connection request:", error);
      res.status(500).json({ message: "Error sending connection request", error });
    }
  }
  };

  export const getReceivedConnections = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId
      const viewerId = await getUserIdFromToken(req, res);
      if (!viewerId) return;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Format the received connections
      const receivedConnections = await formatConnectionData(
        viewerUser.received_connections.map((connection: any) => ({
          _id: connection._id,
          date: connection.date,
        })),
        viewerUser,
        res,
        true // Include mutual connections
      );
      if (!receivedConnections) return;
  
      res.status(200).json({ receivedConnections });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{
      console.error("Error fetching received connections:", error);
      res.status(500).json({ message: "Error fetching received connections", error });
    }
    }

  };

  export const getSentConnections = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId
      const viewerId = await getUserIdFromToken(req, res);
      if (!viewerId) return;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Format the sent connections
      const sentConnections = await formatConnectionData(
        viewerUser.sent_connections.map((connection: any) => ({
          _id: connection._id.toString(),
          date: connection.date,
        })),
        viewerUser,
        res,
        false // Do not include mutual connections
      );
      if (!sentConnections) return;
  
      res.status(200).json({ sentConnections });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{
      console.error("Error fetching sent connections:", error);
      res.status(500).json({ message: "Error fetching sent connections", error });
    }
  }
  };

  export const acceptConnectionRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId and target userId
      const result = await validateTokenAndUser(req, res);
      if (!result) return;
  
      const { viewerId, targetUser } = result;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;

      // Check if the user is not subscribed and already has 50 connections
      if (!viewerUser.subscription.subscribed && viewerUser.connections.length >= 50 
        &&!targetUser.subscription.subscribed && targetUser.connections.length >= 50
      ) {
        res.status(400).json({ message: "You have reached the maximum number of connections allowed for non-subscribed users." });
        return;
      }
  
      // Check if the target user's `_id` exists in the viewer's received_connections
      const pendingConnectionIndex = viewerUser.received_connections.findIndex(
        (connection: any) => connection._id.toString() === targetUser._id.toString()
      );
      if (pendingConnectionIndex === -1) {
        res.status(400).json({ message: "No pending connection request from this user." });
        return;
      }
  
      // Save the connection date
      const connectionDate = viewerUser.received_connections[pendingConnectionIndex].date;
  
      // Add the target user's `_id` and connection date to the viewer's connections array
      viewerUser.connections.push({ _id: targetUser._id, date: connectionDate });
  
      // Add the viewer's `_id` and connection date to the target user's connections array
      targetUser.connections.push({ _id: viewerUser._id, date: connectionDate });
  
      // Remove the target user's `_id` from the viewer's received_connections
      viewerUser.received_connections.splice(pendingConnectionIndex, 1);
  
      // Remove the viewer's `_id` from the target user's sent_connections (if it exists)
      targetUser.sent_connections = targetUser.sent_connections.filter(
        (connection: any) => connection._id.toString() !== (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
  
      // Remove the target user's `_id` from the viewer's sent_connections (if it exists)
      viewerUser.sent_connections = viewerUser.sent_connections.filter(
        (connection: any) => connection._id.toString() !== targetUser._id.toString()
      );
  
      // Remove the viewer's `_id` from the target user's received_connections (if it exists)
      targetUser.received_connections = targetUser.received_connections.filter(
        (connection: any) => connection._id.toString() !== (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
  
      // Add the target user's `_id` to the viewer's following list if not already present
      if (!viewerUser.following.some((followingId: mongoose.Types.ObjectId) => followingId === targetUser._id.toString())) {
        viewerUser.following.push(targetUser._id);
      }
  
      // Add the viewer's `_id` to the target user's followers list if not already present
      if (!targetUser.followers.some((followerId: mongoose.Types.ObjectId) => followerId.toString() === (viewerUser._id as mongoose.Types.ObjectId).toString())) {
        targetUser.followers.push(viewerUser._id);
      }
  
      // Add the viewer's `_id` to the target user's following list if not already present
      if (!targetUser.following.some((followingId: mongoose.Types.ObjectId) => followingId.toString() === (viewerUser._id as mongoose.Types.ObjectId).toString())) {
        targetUser.following.push(viewerUser._id);
      }
  
      // Add the target user's `_id` to the viewer's followers list if not already present
      if (!viewerUser.followers.some((followerId: any) => followerId.toString() === targetUser._id.toString())) {
        viewerUser.followers.push(targetUser._id);
      }
  
      // Save the updated documents
      await viewerUser.save();
      await targetUser.save();
  
      res.status(200).json({
        message: "Connection request accepted successfully.",
        connectionDate,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{
      console.error("Error accepting connection request:", error);
      res.status(500).json({ message: "Error accepting connection request", error });
    }
    }
  };

  export const getAllConnections = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId
      const viewerId = await getUserIdFromToken(req, res);
      if (!viewerId) return;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Format the connections list
      const formattedConnections = await formatConnectionData(
        viewerUser.connections.map((connection: any) => ({
          _id: connection._id,
          date: connection.date,
        })),
        viewerUser,
        res,
        false // Do not include mutual connections
      );
      if (!formattedConnections) return;
  
      // Sort the connections in descending order (most recent first)
      const sortedConnections = formattedConnections.reverse();
  
      res.status(200).json({ connections: sortedConnections });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{
      console.error("Error fetching connections:", error);
      res.status(500).json({ message: "Error fetching connections", error });
    }
  }
  };

  export const removeConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId and target userId
      const result = await validateTokenAndUser(req, res);
      if (!result) return;
  
      const { viewerId, targetUser } = result;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Check if the target user's `_id` exists in the viewer's connections
      const connectionExists = viewerUser.connections.some(
        (connection: any) => connection._id.toString() === targetUser._id.toString()
      );
      if (!connectionExists) {
        res.status(400).json({ message: "This user is not in your connections list." });
        return;
      }
  
      // Remove the target user's `_id` from the viewer's connections
      viewerUser.connections = viewerUser.connections.filter(
        (connection: any) => connection._id.toString() !== targetUser._id.toString()
      );
  
      // Remove the viewer's `_id` from the target user's connections
      targetUser.connections = targetUser.connections.filter(
        (connection: any) => connection._id.toString() !== (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
  
      // Save the updated documents
      await viewerUser.save();
      await targetUser.save();
  
      res.status(200).json({ message: "Connection removed successfully." });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{
      console.error("Error removing connection:", error);
      res.status(500).json({ message: "Error removing connection", error });
    }
  }
  };

  export const ignoreConnectionRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId and target userId
      const result = await validateTokenAndUser(req, res);
      if (!result) return;
  
      const { viewerId, targetUser } = result;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Check if the target user's `_id` exists in the viewer's received_connections
      const receivedConnectionIndex = viewerUser.received_connections.findIndex(
        (connection: any) => connection._id.toString() === targetUser._id.toString()
      );
      if (receivedConnectionIndex === -1) {
        res.status(400).json({ message: "No received connection request from this user." });
        return;
      }
  
      // Remove the target user's `_id` from the viewer's received_connections
      viewerUser.received_connections.splice(receivedConnectionIndex, 1);
  
      // Save the updated viewer document
      await viewerUser.save();
  
      res.status(200).json({ message: "Connection request ignored successfully." });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{
      console.error("Error ignoring connection request:", error);
      res.status(500).json({ message: "Error ignoring connection request", error });
    }
  }
  };

  export const withdrawConnectionRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId and target userId
      const result = await validateTokenAndUser(req, res);
      if (!result) return;
  
      const { viewerId, targetUser } = result;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Check if the target user's `_id` exists in the viewer's sent_connections
      const sentConnectionIndex = viewerUser.sent_connections.findIndex(
        (connection: any) => connection._id.toString() === targetUser._id.toString()
      );
      if (sentConnectionIndex === -1) {
        res.status(400).json({ message: "No sent connection request to this user." });
        return;
      }
  
      // Remove the target user's `_id` from the viewer's sent_connections
      viewerUser.sent_connections.splice(sentConnectionIndex, 1);
  
      // Remove the viewer's `_id` from the target user's received_connections
      targetUser.received_connections = targetUser.received_connections.filter(
        (connection: any) => connection._id.toString() !== (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
  
      // Check if the target user's `_id` already exists in the viewer's withdrawn_connections array
      const withdrawnIndex = viewerUser.withdrawn_connections.findIndex(
        (withdrawn: any) => withdrawn._id.toString() === targetUser._id.toString()
      );
  
      if (withdrawnIndex !== -1) {
        // Update the existing entry's date
        viewerUser.withdrawn_connections[withdrawnIndex].date = new Date();
      } else {
        // Add a new entry to the withdrawn_connections array
        viewerUser.withdrawn_connections.push({
          _id: targetUser._id,
          date: new Date(),
        });
      }
  
      // Save the updated documents
      await viewerUser.save();
      await targetUser.save();
  
      res.status(200).json({ message: "Connection request withdrawn successfully." });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{
      console.error("Error withdrawing connection request:", error);
      res.status(500).json({ message: "Error withdrawing connection request", error });
    }
  }
  };

  export const blockUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId and target userId
      const result = await validateTokenAndUser(req, res);
      if (!result) return;
  
      const { viewerId, targetUser } = result;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Ensure the viewer is not trying to block themselves
      if ((viewerUser._id as mongoose.Types.ObjectId).toString() === targetUser._id.toString()) {
        res.status(400).json({ message: "You cannot block yourself." });
        return;
      }
  
      // Check if the user is already blocked
      const isAlreadyBlocked = viewerUser.blocked.some(
        (blocked: any) => blocked._id.toString() === targetUser._id.toString()
      );
      if (isAlreadyBlocked) {
        res.status(400).json({ message: "This user is already blocked." });
        return;
      }
  
      // Check if the user was recently unblocked (within 48 hours)
      const recentlyUnblocked = viewerUser.unblocked_users?.find(
        (unblocked: any) =>
          unblocked._id.toString() === targetUser._id.toString() &&
          new Date(unblocked.date).getTime() > Date.now() - 48 * 60 * 60 * 1000
      );
      if (recentlyUnblocked) {
        res.status(400).json({
          message: "You cannot reblock this user within 48 hours of unblocking.",
        });
        return;
      }
  
      // Add the target user's `_id` and the current date to the viewer's blocked array
      viewerUser.blocked.push({
        _id: targetUser._id,
        date: new Date(),
      });
  
      // Remove the target user's `_id` from the viewer's connections, followers, following, sent_connections, and received_connections
      viewerUser.connections = viewerUser.connections.filter(
        (connection: any) => connection._id.toString() !== targetUser._id.toString()
      );
      viewerUser.followers = viewerUser.followers.filter(
        (follower: any) => follower.toString() !== targetUser._id.toString()
      );
      viewerUser.following = viewerUser.following.filter(
        (following: any) => following.toString() !== targetUser._id.toString()
      );
      viewerUser.sent_connections = viewerUser.sent_connections.filter(
        (connection: any) => connection._id.toString() !== targetUser._id.toString()
      );
      viewerUser.received_connections = viewerUser.received_connections.filter(
        (connection: any) => connection._id.toString() !== targetUser._id.toString()
      );
  
      // Remove the viewer's `_id` from the target user's connections, followers, following, sent_connections, and received_connections
      targetUser.connections = targetUser.connections.filter(
        (connection: any) => connection._id.toString() !== (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
      targetUser.followers = targetUser.followers.filter(
        (follower: any) => follower.toString() !== (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
      targetUser.following = targetUser.following.filter(
        (following: any) => following.toString() !== (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
      targetUser.sent_connections = targetUser.sent_connections.filter(
        (connection: any) => connection._id.toString() !== (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
      targetUser.received_connections = targetUser.received_connections.filter(
        (connection: any) => connection._id.toString() !== (viewerUser._id as mongoose.Types.ObjectId).toString()
      );
  
      // Save the updated documents
      await viewerUser.save();
      await targetUser.save();
  
      res.status(200).json({ message: "User blocked successfully." });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{
      console.error("Error blocking user:", error);
      res.status(500).json({ message: "Error blocking user", error });
    }
  }
  };



  export const unblockUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId and target userId
      const result = await validateTokenAndUser(req, res);
      if (!result) return;
  
      const { viewerId, targetUser } = result;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Ensure the viewer is not trying to unblock themselves
      if ((viewerUser._id as mongoose.Types.ObjectId).toString() === targetUser._id.toString()) {
        res.status(400).json({ message: "You cannot unblock yourself." });
        return;
      }
  
      // Check if the target user is actually blocked
      const blockedIndex = viewerUser.blocked.findIndex(
        (blocked: any) => blocked._id.toString() === targetUser._id.toString()
      );
      if (blockedIndex === -1) {
        res.status(400).json({ message: "This user is not in your blocked list." });
        return;
      }
  
      // Validate the password provided in the request body
      const { password } = req.body;
      if (!password) {
        res.status(400).json({ message: "Password is required to unblock a user." });
        return;
      }
  
      const isPasswordValid = await viewerUser.comparePassword(password);
      if (!isPasswordValid) {
        res.status(401).json({ message: "Invalid password." });
        return;
      }
  
      // Remove the target user's `_id` from the viewer's blocked array
      viewerUser.blocked.splice(blockedIndex, 1);
  
      // Add the target user's `_id` to the unblocked_users array with the current date
      if (!viewerUser.unblocked_users) viewerUser.unblocked_users = [];
      viewerUser.unblocked_users.push({
        _id: targetUser._id,
        date: new Date(),
      });
  
      // Save the updated document
      await viewerUser.save();
  
      res.status(200).json({ message: "User unblocked successfully." });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{
      console.error("Error unblocking user:", error);
      res.status(500).json({ message: "Error unblocking user", error });
    }
  }
  };

  export const getBlockedList = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate token and retrieve viewerId
      const viewerId = await getUserIdFromToken(req, res);
      if (!viewerId) return;
  
      // Retrieve the viewer's user document
      const viewerUser = await findUserByUserId(viewerId, res);
      if (!viewerUser) return;
  
      // Extract the blocked user IDs and dates
      const blockedUsers = viewerUser.blocked.map((blocked: any) => ({
        _id: blocked._id.toString(), 
        date: blocked.date,
      }));
  
      // Format the blocked list
      const formattedBlockedList = await getFormattedUserList(
        blockedUsers.map((blocked) => new mongoose.Types.ObjectId(blocked._id)),
        res
      );
      if (!formattedBlockedList) return;
  
      // Add the block date to the formatted list
      const blockedListWithDates = formattedBlockedList.map((user) => {

        const blockEntry = blockedUsers.find(
          (blocked) => blocked._id === user._id?.toString() 

        );
        return {
          user_id: user.user_id, 
          name: user.name,
          headline: user.headline,
          profilePicture: user.profilePicture,
          date: blockEntry?.date || null, 
        };
      });
  
      // Return the formatted blocked list
      res.status(200).json({ blocked_list: blockedListWithDates });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        res.status(401).json({ message: error.message,success:false });
}
    else{
      console.error("Error fetching blocked list:", error);
      res.status(500).json({ message: "Error fetching blocked list", error });
    }
  }
  };

  






