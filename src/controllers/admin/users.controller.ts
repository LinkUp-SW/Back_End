import { Request, Response } from 'express';
import users from '../../models/users.model.ts';
import {findUserById, findUserByUserId } from '../../utils/database.helper.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { UserRepository } from '../../repositories/user.repository.ts';
const userRepository = new UserRepository();
/**
 * Get paginated list of users with basic profile information
 * @route GET /api/admin/users
 * @query {number} cursor - Pagination cursor (skip value)
 * @query {number} limit - Number of users to return (max 50)
 * @access Admin only
 */
export const getPaginatedUsers = async (req: Request, res: Response) => {
  try {
    // Authenticate the admin user
    let userId = await getUserIdFromToken(req, res);
    if (!userId) return;
    
    const user = await findUserByUserId(userId, res);
    if (!user) return;
    
    // Check if user is admin
    if (!user.is_admin) {
      return res.status(403).json({ 
        message: 'Access denied. Admin privileges required',
        success: false 
      });
    }

    // Get pagination parameters
    const { cursor, limit } = req.query;
    
    // Parse parameters
    const parsedCursor = cursor ? parseInt(cursor.toString()) : 0;
    const parsedLimit = limit ? parseInt(limit.toString()) : 10;
    
    // Validate limit
    if (parsedLimit > 50) {
      return res.status(400).json({ 
        message: 'Limit cannot exceed 50 users per request',
        success: false 
      });
    }

    // Count total users for pagination metadata
    const totalCount = await users.countDocuments({});

    // Fetch users with pagination
    const usersList = await users.find(
      {},
      {
        _id: 1,
        user_id: 1,
        'bio.first_name': 1,
        'bio.last_name': 1,
        email: 1,
        profile_photo: 1,
        is_admin: 1,
        created_at: 1
      }
    )
    .sort({ created_at: -1 }) // Sort by creation date, newest first
    .skip(parsedCursor)
    .limit(parsedLimit)
    .lean();

    // Format the results
    const formattedUsers = usersList.map(user => {
      // Create a short ID from the MongoDB ObjectID
      const mongoId = user._id.toString();
      const shortId = `USER${mongoId.slice(-4)}`;

      return {
        id: user._id,
        user_id: user.user_id,
        short_id: shortId,
        first_name: user.bio?.first_name || '',
        last_name: user.bio?.last_name || '',
        email: user.email,
        profile_picture: user.profile_photo,
        is_admin: user.is_admin,
        created_at: user.created_at
      };
    });

    // Calculate next cursor
    const nextCursor = 
      parsedCursor + parsedLimit < totalCount 
        ? parsedCursor + parsedLimit 
        : null;

    return res.status(200).json({
      message: 'Users retrieved successfully',
      success: true,
      data: {
        users: formattedUsers,
        total_count: totalCount,
        next_cursor: nextCursor
      }
    });
    
  } catch (error) {
    console.error('Error in getPaginatedUsers:', error);
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return res.status(401).json({ message: error.message, success: false });
    } else {
      return res.status(500).json({ 
        message: 'Server error fetching users', 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};

/**
 * Delete a user by their ID
 * @route DELETE /api/admin/users/:userId
 * @param req - Express request object with userId parameter
 * @param res - Express response object
 * @access Admin only
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    // Authenticate the admin user
    let adminId = await getUserIdFromToken(req, res);
    if (!adminId) return;
    
    const admin = await findUserByUserId(adminId, res);
    if (!admin) return;
    
    // Check if user is admin
    if (!admin.is_admin) {
      return res.status(403).json({ 
        message: 'Access denied. Admin privileges required',
        success: false 
      });
    }

    // Get user ID to delete from request parameters
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        message: 'User ID is required',
        success: false
      });
    }
    
    // Find the user to be deleted
    const userToDelete = await findUserById(userId, res);
    if (!userToDelete) {
      return res.status(404).json({
        message: 'User not found',
        success: false
      });
    }
    // Prevent admins from deleting other admins 
    if (userToDelete.user_id === admin.user_id) {
      return res.status(403).json({
        message: 'Cannot delete yourself',
        success: false
      });
    }
    
    // Use the repository method to properly delete the user and all associated data
    const deletedUser = await userRepository.deleteAccount(userToDelete.user_id);
    
    if (!deletedUser) {
      return res.status(404).json({
        message: 'User deletion failed',
        success: false
      });
    }
    
    return res.status(200).json({
      message: 'User deleted successfully',
      success: true,
      data: {
        user_id: deletedUser.user_id,
        email: deletedUser.email,
        first_name: deletedUser.bio?.first_name || '',
        last_name: deletedUser.bio?.last_name || ''
      }
    });
    
  } catch (error) {
    console.error('Error in deleteUser:', error);
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return res.status(401).json({ message: error.message, success: false });
    } else {
      return res.status(500).json({ 
        message: 'Server error deleting user', 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};