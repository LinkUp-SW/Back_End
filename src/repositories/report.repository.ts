import { Report, reportInterface, reportReasonEnum, contentTypeEnum, reportStatusEnum, adminActionEnum } from '../models/reports.model.ts';
import mongoose, { Types } from 'mongoose';
import { PostRepository } from './posts.repository.ts';
import { deleteAllPostReactions, deleteCommentReactions } from './reacts.repository.ts';
import { CommentRepository, deleteAllComments, getAllCommentChildrenIds } from './comment.repository.ts';
import users from '../models/users.model.ts';
import posts, { postTypeEnum } from '../models/posts.model.ts';
import comments from '../models/comments.model.ts';
import jobApplications from '../models/job_applications.model.ts';
import jobs from '../models/jobs.model.ts';

export class ReportRepository {
    
    /**
     * Create a new report
     */
    async createReport(
        reporterId: string | Types.ObjectId,
        contentRef: string | Types.ObjectId,
        contentType: contentTypeEnum,
        reason: reportReasonEnum
    ): Promise<reportInterface> {
        const report = new Report({
            reporter: reporterId,
            content_ref: new Types.ObjectId(contentRef),
            content_type:contentType,
            reason,
            status: reportStatusEnum.pending,
            admin_action: adminActionEnum.none
        });
        
        return await report.save();
    }

    /**
     * Find reports by status
     */
    async findReportsByStatus(status: reportStatusEnum): Promise<reportInterface[]> {
        return await Report.find({ status }).sort({ created_at: -1 }).populate('reporter');
    }

    /**
     * Find reports for specific content
     */
    async findReportsForContent(contentRef: string | Types.ObjectId, contentType: string): Promise<reportInterface[]> {
        return await Report.find({ 
            content_ref: new Types.ObjectId(contentRef),
            content_type: contentType
        }).populate('reporter');
    }

    /**
     * Resolve a report
     */
    async resolveReport(
        reportId: string | Types.ObjectId,
        adminId: string | Types.ObjectId,
        adminAction: adminActionEnum,
    ): Promise<reportInterface | null> {
        return await Report.findByIdAndUpdate(
            reportId,
            {
                status: reportStatusEnum.resolved,
                admin_action:adminAction,
                resolved_by: adminId,
                resolved_at: Math.floor(Date.now() / 1000),
            },
            { new: true }
        );
    }

    /**
     * Get paginated reports with optional status filter
     * @param status - Optional filter by report status
     * @param cursor - The position to start fetching from (null for beginning)
     * @param limit - Maximum number of reports to fetch
     * @returns Promise containing reports data and pagination info
     */
    async getPaginatedReports(
        status?: reportStatusEnum,
        cursor: number | null = 0,
        limit: number = 10
    ): Promise<{
        reports: any[],
        totalCount: number,
        statusCounts: Record<string, number>,
        nextCursor: number | null
    }> {
        try {
            // Build the match condition
            const matchCondition: any = {};
            
            // Add specific status filter if provided
            if (status) {
                matchCondition.status = status;
            }
            
            // Get total count and status type counts in one aggregation
            const countData = await Report.aggregate([
                { 
                    $facet: {
                        totalCount: [
                            { $match: matchCondition },
                            { $count: 'count' }
                        ],
                        statusCounts: [
                            { 
                                $group: { 
                                    _id: { 
                                        status: "$status", 
                                        content_ref: "$content_ref", 
                                        content_type: "$content_type" 
                                    }
                                }
                            },
                            {
                                $group: {
                                    _id: "$_id.status",
                                    count: { $sum: 1 }
                                }
                            }
                        ],
                        // Count unique content items with reports
                        uniqueContentCount: [
                            { $match: matchCondition },
                            { 
                                $group: { 
                                    _id: { content_ref: "$content_ref", content_type: "$content_type" } 
                                }
                            },
                            { $count: 'count' }
                        ]
                    }
                }
            ]);
            
            const totalCount = countData[0].totalCount[0]?.count || 0;
            const uniqueContentCount = countData[0].uniqueContentCount[0]?.count || 0;
            
            // Format status counts into a simple object
            const statusCounts: Record<string, number> = {};
            countData[0].statusCounts.forEach((item: any) => {
                statusCounts[item._id] = item.count;
            });
            
            // If no reports, return empty result
            if (totalCount === 0) {
                return {
                    reports: [],
                    totalCount: 0,
                    statusCounts,
                    nextCursor: null
                };
            }
    
            // Get distinct content items with their latest report time, sorted by most recent
            const distinctContentItems = await Report.aggregate([
                { $match: matchCondition },
                {
                    $sort: { created_at: -1 } // Sort by newest first
                },
                {
                    $group: {
                        _id: { content_ref: "$content_ref", content_type: "$content_type" },
                        mongo_id: { $first: "$_id" },
                        latest_created_at: { $max: "$created_at" },
                        reasons: { $addToSet: "$reason" },
                        content_ref: { $first: "$content_ref" },
                        content_type: { $first: "$content_type" },
                        status: { $first: "$status" },
                        admin_action:{ $first: "$admin_action" },
                        report_count: { $sum: 1 }
                    }
                },
                { $sort: { latest_created_at: -1 } }, // Sort groups by latest report time
                { $skip: cursor ?? 0 },
                { $limit: limit + 1 } // Get one extra to check if there are more
            ]);
    
            // Check if there are more results
            const hasMore = distinctContentItems.length > limit;
            const results = hasMore ? distinctContentItems.slice(0, limit) : distinctContentItems;
            
            // Format the grouped reports
            const formattedResults = results.map((item) => {
                // Format content ID instead of report ID
                const contentRefStr = item.content_ref.toString();
                const shortId = contentRefStr.substring(contentRefStr.length - 4);
                const formattedId = `REP${shortId}`;
                
                return {
                    content_id: formattedId,
                    content_mongo_id: item.content_ref,
                    content_ref: item.content_ref,
                    type: item.content_type,
                    reasons: item.reasons, // Array of all reasons for this content
                    created_at: item.latest_created_at, // Most recent report time
                    status: item.status,
                    admin_action: item.admin_action,
                    report_count: item.report_count
                };
            });;
    
            // Calculate next cursor
            const nextCursor = hasMore ? (cursor ?? 0) + limit : null;
    
            return {
                reports: formattedResults,
                totalCount: uniqueContentCount, // Return count of unique content items
                statusCounts,
                nextCursor
            };
        } catch (err) {
            if (err instanceof Error) {
                throw new Error(`Error fetching reports: ${err.message}`);
            } else {
                throw new Error("Error fetching reports: Unknown error");
            }
        }
    }

/**
 * Check if a user has already reported specific content
 * @param userId - ID of the user who reported
 * @param contentRef - ID of the content being reported
 * @param contentType - Type of the content (post, comment, etc.)
 * @returns The existing report if found, null otherwise
 */
async findExistingReport(
    userId: string | Types.ObjectId,
    contentRef: string | Types.ObjectId,
    contentType: contentTypeEnum
): Promise<reportInterface | null> {
    return await Report.findOne({
        reporter: new Types.ObjectId(userId),
        content_ref: new Types.ObjectId(contentRef),
        content_type:contentType
    });
}
/**
 * Get reports for a specific content item
 * @param contentRef - ID of the content being reported
 * @param contentType - Type of content (post, comment, etc.)
 * @returns Promise containing reports summary and content info
 */
async getContentReports(
    contentRef: string | Types.ObjectId,
    contentType: contentTypeEnum
): Promise<{
    totalCount: number,
    reasonsSummary: Record<string, number>
}> {
    try {
        // Build match condition for the specific content
        const matchCondition = {
            content_ref: new Types.ObjectId(contentRef),
            content_type: contentType
        };
        
        // Get reports aggregate data: count, reasons summary
        const aggregateData = await Report.aggregate([
            { $match: matchCondition },
            {
                $facet: {
                    totalCount: [
                        { $count: 'count' }
                    ],
                    reasonsSummary: [
                        { $group: { _id: "$reason", count: { $sum: 1 } } }
                    ]
                }
            }
        ]);
        
        const totalCount = aggregateData[0].totalCount[0]?.count || 0;
        
        // Format reasons summary into a simple object
        const reasonsSummary: Record<string, number> = {};
        aggregateData[0].reasonsSummary.forEach((item: any) => {
            reasonsSummary[item._id] = item.count;
        });
        
        // If no reports, return early
        if (totalCount === 0) {
            return {
                totalCount: 0,
                reasonsSummary: {}
            };
        }

        return {
            totalCount,
            reasonsSummary
        };
    } catch (err) {
        if (err instanceof Error) {
            throw new Error(`Error fetching content reports: ${err.message}`);
        } else {
            throw new Error("Error fetching content reports: Unknown error");
        }
    }
}

/**
 * Resolve all reports for specific content and take appropriate action
 * @param contentRef - ID of the content that was reported
 * @param contentType - Type of the content (post, comment, etc.)
 * @param adminId - ID of the admin resolving the reports
 * @param adminAction - Action taken by the admin (dismiss, remove content, ban user)
 * @param notes - Optional resolution notes
 * @returns Promise with update result and action taken
 */
async resolveContentReports(
    contentRef: string | Types.ObjectId,
    contentType: string,
    adminId: string | Types.ObjectId,
    adminAction: adminActionEnum
): Promise<{ modifiedCount: number, actionTaken: string }> {
    try {
        // Update all reports for this content to resolved status
        const updateResult = await Report.updateMany(
            { 
                content_ref: new Types.ObjectId(contentRef),
                content_type: contentType,
                status: reportStatusEnum.pending
            },
            {
                status: reportStatusEnum.resolved,
                admin_action: adminAction,
                resolved_by: new Types.ObjectId(adminId),
                resolved_at: Math.floor(Date.now() / 1000),
            }
        );
        
        let actionTaken = adminActionEnum.dismissed;
        
        // Take additional action based on adminAction
        if (adminAction === adminActionEnum.content_removed) {
            // Handle content removal based on content type
            switch (contentType) {
                case contentTypeEnum.Post: {
                    const postRepository = new PostRepository();
                    const post = await postRepository.findByPostId(contentRef.toString());
                    
                    if (post) {
                        // Delete all reactions
                        await deleteAllPostReactions(contentRef.toString());
                        
                        // Delete all comments
                        await deleteAllComments(contentRef.toString());
                        
                        // Handle reposts if any
                        if (post.reposts && post.reposts.length > 0) {
                            const repostIds = post.reposts.map(repost => repost.toString());
                            await postRepository.deleteAllRepostsOfPost(repostIds);
                        }
                        
                        // Remove post from user's activity
                        if (post.user_id) {
                            const user = await users.findById(post.user_id);
                            if (user) {
                                if (post.post_type === postTypeEnum.standard) {
                                    user.activity.posts = user.activity.posts.filter(
                                        userPost => userPost.toString() !== contentRef.toString()
                                    );
                                } else {
                                    user.activity.reposted_posts = user.activity.reposted_posts.filter(
                                        userPost => userPost.toString() !== contentRef.toString()
                                    );
                                    
                                    // Handle original post reference
                                    if (post.media?.link && post.media.link.length > 0) {
                                        const originalPost = await postRepository.findByPostId(post.media.link[0]);
                                        if (originalPost && originalPost.reposts) {
                                            originalPost.reposts = originalPost.reposts.filter(
                                                repost => repost.toString() !== contentRef.toString()
                                            );
                                            await originalPost.save();
                                        }
                                    }
                                }
                                await user.save();
                            }
                        }
                        
                        // Finally delete the post
                        await postRepository.deletepost(contentRef.toString());
                    }
                    actionTaken = adminActionEnum.content_removed;
                    break;
                }
                
                case contentTypeEnum.Comment: {
                    const commentRepository = new CommentRepository();
                    const comment = await commentRepository.findById(contentRef.toString());
                    
                    if (comment) {
                        const postId = comment.post_id.toString();
                        const commentId = contentRef.toString();
                        
                        // Get all direct reply IDs (one level)
                        const replyIds = await getAllCommentChildrenIds(commentId);
                        
                        // Delete reactions on comment and replies
                        await deleteCommentReactions(commentId);
                        for (const replyId of replyIds) {
                            await deleteCommentReactions(replyId);
                        }
                        
                        // Remove comment from post
                        await mongoose.model('posts').updateOne(
                            { _id: postId },
                            { $pull: { comments: commentId } }
                        );
                        
                        // Remove replies from post
                        if (replyIds.length > 0) {
                            await mongoose.model('posts').updateOne(
                                { _id: postId },
                                { $pull: { comments: { $in: replyIds } } }
                            );
                        }
                        
                        // Remove comment from user's activity
                        if (comment.user_id) {
                            await users.updateOne(
                                { _id: comment.user_id },
                                { $pull: { 'activity.comments': commentId } }
                            );
                        }
                        
                        // Remove replies from users' activity
                        if (replyIds.length > 0) {
                            const childComments = await comments.find({ _id: { $in: replyIds } });
                            
                            // Group by user ID for efficiency
                            const userReplyMap = new Map<string, string[]>();
                            childComments.forEach(reply => {
                                const userId = reply.user_id.toString();
                                if (!userReplyMap.has(userId)) {
                                    userReplyMap.set(userId, []);
                                }
                                userReplyMap.get(userId)!.push(reply._id!.toString());
                            });
                            
                            // Update each user's activity
                            for (const [userId, userReplyIds] of userReplyMap.entries()) {
                                await users.updateOne(
                                    { _id: userId },
                                    { $pull: { 'activity.comments': { $in: userReplyIds } } }
                                );
                            }
                        }
                        
                        // Delete comment and replies
                        await commentRepository.delete(commentId);
                        if (replyIds.length > 0) {
                            await comments.deleteMany({ _id: { $in: replyIds } });
                        }
                    }
                    actionTaken = adminActionEnum.content_removed;
                    break;
                }
                
                case contentTypeEnum.Job:
                    // Handle job deletion
                    await mongoose.model('jobs').deleteOne({ _id: new Types.ObjectId(contentRef) });
                    // Remove job from user's saved jobs and applied jobs
                    await users.updateMany(
                        { 'saved_jobs': contentRef },
                        { $pull: { saved_jobs:contentRef } }
                    );
                    await users.updateMany(
                        { 'applied_jobs': contentRef },
                        { $pull: { applied_jobs:contentRef  } }
                    );
                    // Remove job from applications
                    await jobApplications.deleteMany({ job_id: contentRef });

                    actionTaken = adminActionEnum.content_removed;
                    break;
            }
        } 
        else if (adminAction === adminActionEnum.user_banned) {
            // First, identify the user who created the content
            let userId: string | null = null;
            
            switch (contentType) {
                case contentTypeEnum.Post: {
                    const post = await mongoose.model('posts').findById(contentRef);
                    userId = post?.user_id?.toString() || null;
                    break;
                }
                
                case contentTypeEnum.Comment: {
                    const comment = await mongoose.model('comments').findById(contentRef);
                    userId = comment?.user_id?.toString() || null;
                    break;
                }
                
                case contentTypeEnum.Job: {
                    const job = await mongoose.model('jobs').findById(contentRef);
                    userId = job?.created_by?.toString() || job?.user_id?.toString() || null;
                    break;
                }
            }
            
            if (userId) {
                // Ban the user - set is_banned flag
                await users.updateOne(
                    { _id: userId },
                    { 
                        $set: { 
                            is_banned: true, 
                            banned_at: new Date(), 
                            banned_by: adminId,
                        } 
                    }
                );
                
                // Mark all user's reports as resolved with the same action
                await Report.updateMany(
                    { 
                        reporter: new Types.ObjectId(userId),
                        status: reportStatusEnum.pending
                    },
                    {
                        status: reportStatusEnum.resolved,
                        admin_action: adminActionEnum.user_banned,
                        resolved_by: new Types.ObjectId(adminId),
                        resolved_at: Math.floor(Date.now() / 1000),
                    }
                );
                
                actionTaken = adminActionEnum.user_banned;
            }
        }
        
        return { 
            modifiedCount: updateResult.modifiedCount,
            actionTaken 
        };
    } catch (error) {
        console.error("Error resolving content reports:", error);
        throw new Error(`Failed to resolve reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async countReports(filter: mongoose.FilterQuery<reportInterface> = {}): Promise<number> {
    return Report.countDocuments(filter);
}

// average resolution time in hours
async averageResolutionTime(): Promise<number> {
    const result = await Report.aggregate([
      { $match: { status: reportStatusEnum.resolved }}, // Fixed: changed Resolved to resolved
      { $project: {
          diff: { $subtract: ['$resolved_at', '$created_at'] }
        }
      },
      { $group: {
          _id: null,
          avgMillis: { $avg: '$diff' }
        }
      }
    ]);
    if (!result.length) return 0;
    return result[0].avgMillis/ 60 / 60; // ms → hours
}

async getUserGrowthData(startDate: Date, endDate: Date, interval: string) {
    const startUnix = Math.floor(startDate.getTime() / 1000);
    const endUnix = Math.floor(endDate.getTime() / 1000);
    
    // For daily intervals
    if (interval === 'day') {
      return await users.aggregate([
        { 
          $match: { 
            created_at: { $gte: startUnix, $lte: endUnix } 
          } 
        },
        {
          $group: {
            _id: {
              year: { $year: { $toDate: { $multiply: ['$created_at', 1000] } } },
              month: { $month: { $toDate: { $multiply: ['$created_at', 1000] } } },
              day: { $dayOfMonth: { $toDate: { $multiply: ['$created_at', 1000] } } }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        {
          $project: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: {
                  $dateFromParts: {
                    year: '$_id.year',
                    month: '$_id.month',
                    day: '$_id.day'
                  }
                }
              }
            },
            count: 1,
            _id: 0
          }
        }
      ]);
    }else if (interval === 'week') {
        return await users.aggregate([
          { 
            $match: { 
              created_at: { $gte: startUnix, $lte: endUnix } 
            } 
          },
          {
            $group: {
              _id: {
                year: { $year: { $toDate: { $multiply: ['$created_at', 1000] } } },
                week: { $week: { $toDate: { $multiply: ['$created_at', 1000] } } }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.week': 1 } },
          {
            $project: {
              date: {
                $concat: [
                  { $toString: "$_id.year" }, 
                  "-W", 
                  { $toString: "$_id.week" }
                ]
              },
              count: 1,
              _id: 0
            }
          }
        ]);
        
      } else if (interval === 'month') {
        return await users.aggregate([
          { 
            $match: { 
              created_at: { $gte: startUnix, $lte: endUnix } 
            } 
          },
          {
            $group: {
              _id: {
                year: { $year: { $toDate: { $multiply: ['$created_at', 1000] } } },
                month: { $month: { $toDate: { $multiply: ['$created_at', 1000] } } }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
          {
            $project: {
              date: {
                $dateToString: {
                  format: '%Y-%m',
                  date: {
                    $dateFromParts: {
                      year: '$_id.year',
                      month: '$_id.month',
                      day: 1
                    }
                  }
                }
              },
              count: 1,
              _id: 0
            }
          }
        ]);
        
      }
    return [];
  }
  
  /**
   * Get content creation metrics over time (posts, comments)
   */
  async getContentCreationData(startDate: Date, endDate: Date, interval: string) {
    const startUnix = Math.floor(startDate.getTime() / 1000);
    const endUnix = Math.floor(endDate.getTime() / 1000);
    
    if (interval === 'day') {
      // Get post creation data
      const postsData = await posts.aggregate([
        { 
          $match: { 
            date: { $gte: startUnix, $lte: endUnix } 
          } 
        },
        {
          $group: {
            _id: {
              year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
              month: { $month: { $toDate: { $multiply: ['$date', 1000] } } },
              day: { $dayOfMonth: { $toDate: { $multiply: ['$date', 1000] } } }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        {
          $project: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: {
                  $dateFromParts: {
                    year: '$_id.year',
                    month: '$_id.month',
                    day: '$_id.day'
                  }
                }
              }
            },
            count: 1,
            _id: 0
          }
        }
      ]);
            
      return {posts: postsData,};
    } else if (interval === 'week') {
        const postsData = await posts.aggregate([
          { 
            $match: { 
              date: { $gte: startUnix, $lte: endUnix } 
            } 
          },
          {
            $group: {
              _id: {
                year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
                week: { $week: { $toDate: { $multiply: ['$date', 1000] } } }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.week': 1 } },
          {
            $project: {
              date: {
                $concat: [
                  { $toString: "$_id.year" }, 
                  "-W", 
                  { $toString: "$_id.week" }
                ]
              },
              count: 1,
              _id: 0
            }
          }
        ]);
        
        return { posts: postsData };
      } else if (interval === 'month') {
        const postsData = await posts.aggregate([
          { 
            $match: { 
              date: { $gte: startUnix, $lte: endUnix } 
            } 
          },
          {
            $group: {
              _id: {
                year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
                month: { $month: { $toDate: { $multiply: ['$date', 1000] } } }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
          {
            $project: {
              date: {
                $dateToString: {
                  format: '%Y-%m',
                  date: {
                    $dateFromParts: {
                      year: '$_id.year',
                      month: '$_id.month',
                      day: 1
                    }
                  }
                }
              },
              count: 1,
              _id: 0
            }
          }
        ]);
        
        return { posts: postsData };
      }
    
    return { posts: [] };
  } 
  
  /**
   * Get user engagement metrics (reactions, follows, connections)
   */
async getEngagementData(startDate: Date, endDate: Date, interval: string) {
  const startUnix = Math.floor(startDate.getTime() / 1000);
  const endUnix = Math.floor(endDate.getTime() / 1000);
  
  // For daily intervals
  if (interval === 'day') {
    // Get reactions data over time
    const reactions = await mongoose.model('reacts').aggregate([
      { 
        $match: { 
          date: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$date', 1000] } } },
            day: { $dayOfMonth: { $toDate: { $multiply: ['$date', 1000] } } },
            type: '$reaction_type'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day'
                }
              }
            }
          },
          type: '$_id.type',
          count: 1,
          _id: 0
        }
      }
    ]);

    // User-to-user connections data (friend/follow requests)
    const connections = await users.aggregate([
      { 
        $match: { 
          'received_connections.date': { $gte: startDate, $lte: endDate } 
        } 
      },
      { $unwind: '$received_connections' },
      { 
        $match: { 
          'received_connections.date': { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$received_connections.date' },
            month: { $month: '$received_connections.date' },
            day: { $dayOfMonth: '$received_connections.date' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day'
                }
              }
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    // Comments data - tracking conversation engagement
    const comments = await mongoose.model('comments').aggregate([
      { 
        $match: { 
          date: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$date', 1000] } } },
            day: { $dayOfMonth: { $toDate: { $multiply: ['$date', 1000] } } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day'
                }
              }
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);
    // Private messages tracking (if applicable)

    
    return {
      reactions,
      connections,
      comments,
    };
  }
  
  // For weekly intervals
  else if (interval === 'week') {
    // Get reactions data over time
    const reactions = await mongoose.model('reacts').aggregate([
      { 
        $match: { 
          date: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
            week: { $week: { $toDate: { $multiply: ['$date', 1000] } } },
            type: '$reaction_type'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
      {
        $project: {
          date: {
            $concat: [
              { $toString: "$_id.year" }, 
              "-W", 
              { $toString: "$_id.week" }
            ]
          },
          type: '$_id.type',
          count: 1,
          _id: 0
        }
      }
    ]);

    // User-to-user connections data (friend/follow requests)
    const connections = await users.aggregate([
      { 
        $match: { 
          'received_connections.date': { $gte: startDate, $lte: endDate } 
        } 
      },
      { $unwind: '$received_connections' },
      { 
        $match: { 
          'received_connections.date': { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$received_connections.date'},
            week: { $week: '$received_connections.date'}
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
      {
        $project: {
          date: {
            $concat: [
              { $toString: "$_id.year" }, 
              "-W", 
              { $toString: "$_id.week" }
            ]
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    // Comments data - tracking conversation engagement
    const comments = await mongoose.model('comments').aggregate([
      { 
        $match: { 
          date: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
            week: { $week: { $toDate: { $multiply: ['$date', 1000] } } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
      {
        $project: {
          date: {
            $concat: [
              { $toString: "$_id.year" }, 
              "-W", 
              { $toString: "$_id.week" }
            ]
          },
          count: 1,
          _id: 0
        }
      }
    ]);

  
    return {
      reactions,
      connections,
      comments,

    };
  }
  
  // For monthly intervals
  else if (interval === 'month') {
    // Get reactions data over time
    const reactions = await mongoose.model('reacts').aggregate([
      { 
        $match: { 
          date: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$date', 1000] } } },
            type: '$reaction_type'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: 1
                }
              }
            }
          },
          type: '$_id.type',
          count: 1,
          _id: 0
        }
      }
    ]);

    // User-to-user connections data (friend/follow requests)
    const connections = await users.aggregate([
      { 
        $match: { 
          'received_connections.date': { $gte: startDate, $lte: endDate } 
        } 
      },
      { $unwind: '$received_connections' },
      { 
        $match: { 
          'received_connections.date': { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$received_connections.date' },
            month: { $month: '$received_connections.date' },
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: 1
                }
              }
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    // Comments data - tracking conversation engagement
    const comments = await mongoose.model('comments').aggregate([
      { 
        $match: { 
          date: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$date', 1000] } } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: 1
                }
              }
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);

  
    return {
      reactions,
      connections,
      comments,

    };
  }
  
  return {
    reactions: [],
    connections: [],
    comments: [],

  };
}
  
  /**
   * Get content moderation metrics
   */
async getModerationData(startDate: Date, endDate: Date, interval: string) {
  const startUnix = Math.floor(startDate.getTime() / 1000);
  const endUnix = Math.floor(endDate.getTime() / 1000);
  
  if (interval === 'day') {
    // Reports created over time
    const reportsCreated = await Report.aggregate([
      { 
        $match: { 
          created_at: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$created_at', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$created_at', 1000] } } },
            day: { $dayOfMonth: { $toDate: { $multiply: ['$created_at', 1000] } } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day'
                }
              }
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);
    
    // Reports resolved over time (using resolved_at field)
    const reportsResolved = await Report.aggregate([
      { 
        $match: { 
          status: reportStatusEnum.resolved,
          resolved_at: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$resolved_at', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$resolved_at', 1000] } } },
            day: { $dayOfMonth: { $toDate: { $multiply: ['$resolved_at', 1000] } } }
          },
          count: { $sum: 1 },
          avgResolution: { $avg: { $subtract: ['$resolved_at', '$created_at'] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day'
                }
              }
            }
          },
          count: 1,
          // Convert to hours
          avgResolutionHours: { $divide: ['$avgResolution', 3600] },
          _id: 0
        }
      }
    ]);
    
    return {
      reportsCreated,
      reportsResolved
    };
  }else if (interval === 'week') {
    const reportsCreated = await Report.aggregate([
      { 
        $match: { 
          created_at: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$created_at', 1000] } } },
            week: { $week: { $toDate: { $multiply: ['$created_at', 1000] } } },
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
      {
        $project: {
          date: {
            $concat: [
              { $toString: "$_id.year" }, 
              "-W", 
              { $toString: "$_id.week" }
            ]
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    
    // Reports resolved over time (using resolved_at field)
    const reportsResolved = await Report.aggregate([
      { 
        $match: { 
          status: reportStatusEnum.resolved,
          resolved_at: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$resolved_at', 1000] } } },
            week: { $week: { $toDate: { $multiply: ['$resolved_at', 1000] } } },
          },
          count: { $sum: 1 },
          avgResolution: { $avg: { $subtract: ['$resolved_at', '$created_at'] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
          {
            $project: {
              date: {
                $concat: [
                  { $toString: "$_id.year" }, 
                  "-W", 
                  { $toString: "$_id.week" }
                ]
              },
              count: 1,
          // Convert to hours
          avgResolutionHours: { $divide: ['$avgResolution', 3600] },
          _id: 0
        }
      }
    ]);
    
    return {
      reportsCreated,
      reportsResolved
    };
  } else if (interval === 'month') {
    const reportsCreated = await Report.aggregate([
      { 
        $match: { 
          created_at: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$created_at', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$created_at', 1000] } } },
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1} },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: 1
                }
              }
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);
    
    // Reports resolved over time (using resolved_at field)
    const reportsResolved = await Report.aggregate([
      { 
        $match: { 
          status: reportStatusEnum.resolved,
          resolved_at: { $gte: startUnix, $lte: endUnix } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$resolved_at', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$resolved_at', 1000] } } },
          },
          count: { $sum: 1 },
          avgResolution: { $avg: { $subtract: ['$resolved_at', '$created_at'] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1,} },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: 1
                }
              }
            }
          },
          count: 1,
          // Convert to hours
          avgResolutionHours: { $divide: ['$avgResolution', 3600] },
          _id: 0
        }
      }
    ]);
    
    return {
      reportsCreated,
      reportsResolved
    };
  }
  
  
  
  return {
    reportsCreated: [],
    reportsResolved: []
  };
}
  
  /**
   * Get job posting and application metrics
   */
async getJobsData(startDate: Date, endDate: Date, interval: string) {
  const startUnix = Math.floor(startDate.getTime() / 1000);
  const endUnix = Math.floor(endDate.getTime() / 1000);
  // For daily intervals
  if (interval === 'day') {
    const jobsPosted = await jobs.aggregate([
      { 
        $match: { 
          posted_time: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$posted_time' },
            month: { $month: '$posted_time' },
            day: { $dayOfMonth: '$posted_time' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day'
                }
              }
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);
    
    
    // Application outcomes by status
    const applicationOutcomes = await jobApplications.aggregate([
      { 
        $match: { 
          date: { $gte: startUnix, $lte: endUnix },
          application_status: { $ne: 'Pending' }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$date', 1000] } } },
            day: { $dayOfMonth: { $toDate: { $multiply: ['$date', 1000] } } },
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day'
                }
              }
            }
          },
          status: '$_id.status',
          count: 1,
          _id: 0
        }
      }
    ]);
    
    return {
      jobsPosted,
      applicationOutcomes
    };
  }
  // For weekly intervals
  else if (interval === 'week') {
    // Get reactions data over time
    const applicationOutcomes = await jobApplications.aggregate([
      { 
        $match: { 
          date: { $gte: startUnix, $lte: endUnix },
          application_status: { $ne: 'Pending' }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
            week: { $week: { $toDate: { $multiply: ['$date', 1000] } } },

          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
      {
        $project: {
          date: {
            $concat: [
              { $toString: "$_id.year" }, 
              "-W", 
              { $toString: "$_id.week" }
            ]
          },
          type: '$_id.type',
          count: 1,
          _id: 0
        }
      }
    ]);

    // User-to-user connections data (friend/follow requests)
    const jobsPosted = await jobs.aggregate([
      { 
        $match: { 
          posted_time: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$posted_time'},
            week: { $week: '$posted_time'}
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
      {
        $project: {
          date: {
            $concat: [
              { $toString: "$_id.year" }, 
              "-W", 
              { $toString: "$_id.week" }
            ]
          },
          count: 1,
          _id: 0
        }
      }
    ]);

  
    return {
      jobsPosted,
      applicationOutcomes,

    };
  }
  
  // For monthly intervals
  else if (interval === 'month') {
    // Get reactions data over time
    const applicationOutcomes = await jobApplications.aggregate([
      { 
        $match: { 
          date: { $gte: startUnix, $lte: endUnix },
          application_status: { $ne: 'Pending' }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: { $multiply: ['$date', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$date', 1000] } } },

          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: 1
                }
              }
            }
          },
          type: '$_id.type',
          count: 1,
          _id: 0
        }
      }
    ]);

    // User-to-user connections data (friend/follow requests)
    const jobsPosted = await jobs.aggregate([
      { 
        $match: { 
          posted_time: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$posted_time' },
            month: { $month: '$posted_time' },
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: 1
                }
              }
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);

  
    return {
      jobsPosted,
      applicationOutcomes,
    };
  }
  // Add similar implementations for weekly and monthly intervals
  // Weekly and monthly implementations would follow the same pattern
  // but with different $group and date formatting
  
  return {
    jobsPosted: [],
    applications: [],
    applicationOutcomes: []
  };
}

}


export const reportRepo = new ReportRepository();