import { Request, Response } from 'express';
import users from '../../models/users.model.ts';
import posts from '../../models/posts.model.ts';
import { ReportRepository } from '../../repositories/report.repository.ts';
import { adminActionEnum, contentTypeEnum, reportStatusEnum } from '../../models/reports.model.ts';

const reportRepository = new ReportRepository

export const getDashboardMetrics = async (req: Request, res: Response) => {
    try {
      // 1. Overall counts
      const totalReports = await reportRepository.countReports();
      const totalPendingJobs = await reportRepository.countReports({ 
        content_type: contentTypeEnum.Job, 
        status: reportStatusEnum.pending 
      });
      const totalUsers = await users.countDocuments({});
  
      // 2. "Since yesterday" deltas - using Unix timestamps
      const yesterdayUnix = Math.floor(Date.now() / 1000) - (24 * 60 * 60); // 24 hours in seconds
      const reportsSinceYday = await reportRepository.countReports({ created_at: { $gte: yesterdayUnix } });
      
      const jobsSinceYday = await reportRepository.countReports({ 
        content_type: contentTypeEnum.Job,
        created_at: { $gte: yesterdayUnix } 
      });
      
      // For users, MongoDB likely uses regular Date objects, not Unix timestamp
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const usersSinceYday = await users.countDocuments({ created_at: { $gte: yesterday } });
  
      // 3. Content moderation panel
      const pendingReviews = await reportRepository.countReports({ status: reportStatusEnum.pending });
      
      // For today timestamp in Unix
      const todayUnix = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
      const resolvedToday = await reportRepository.countReports({ 
        status: reportStatusEnum.resolved, 
        resolved_at: { $gte: todayUnix } 
      });
      
      // Average response time
      const avgResponse = await reportRepository.averageResolutionTime();
  
      // 4. Job-posting management - all job reports
      const approvedToday = await reportRepository.countReports({
        content_type: contentTypeEnum.Job,
        status: reportStatusEnum.resolved,
        admin_action: adminActionEnum.dismissed,
        resolved_at: { $gte: todayUnix }
      });
      
      const rejectedToday = await reportRepository.countReports({
        content_type: contentTypeEnum.Job,
        status: reportStatusEnum.resolved,
        admin_action: adminActionEnum.content_removed,
        resolved_at: { $gte: todayUnix }
      });
  
      // 5. Platform analytics
      const newUsersToday = await users.countDocuments({ created_at: { $gte: todayUnix } });
      const contentPostedToday = await posts.countDocuments({ date: { $gte: todayUnix } });
  
      res.json({
        summary: {
            reported_content: totalReports,
            pending_jobs: totalPendingJobs,
            total_users: totalUsers,
            delta: {
              reports: reportsSinceYday,
              jobs: jobsSinceYday,
              users: usersSinceYday,
            }
          },
        content_moderation: {
          pending_reviews: pendingReviews,
          resolved_today: resolvedToday,
          avg_response_time_hours: avgResponse,
        },
        job_management: {
          pending_approval: totalPendingJobs,
          approved_today: approvedToday,
          rejected_today: rejectedToday,
        },
        platform_analytics: {
          new_users_today: newUsersToday,
          content_posted_today: contentPostedToday
        }
      });
    } catch (error) {
      console.error('Error in getDashboardMetrics:', error);
      res.status(500).json({ 
        message: 'Server error getting dashboard metrics', 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
