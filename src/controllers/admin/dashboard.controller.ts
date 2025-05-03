import { Request, Response } from 'express';
import users from '../../models/users.model.ts';
import posts from '../../models/posts.model.ts';
import { ReportRepository } from '../../repositories/report.repository.ts';
import { adminActionEnum, contentTypeEnum, reportStatusEnum } from '../../models/reports.model.ts';
import jobApplications from '../../models/job_applications.model.ts';
import jobs from '../../models/jobs.model.ts';

const reportRepository = new ReportRepository

export const getDashboardMetrics = async (req: Request, res: Response) => {
    try {
      const totalReports = await reportRepository.countReports();
      const totalJobs = await jobs.countDocuments({});
      const totalUsers = await users.countDocuments({});
  
      
      
      
      const pendingReviews = await reportRepository.countReports({ status: reportStatusEnum.pending });
      //unix date
      const todayUnix = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
      const yesterdayUnix = Math.floor(Date.now() / 1000) - (24 * 60 * 60); // 24 hours in seconds
      //date format
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      //reports yesterday and today
      const reportsToday = await reportRepository.countReports({ created_at: { $gte: todayUnix } });
      const reportsYday = await reportRepository.countReports({ created_at: { $gte: yesterdayUnix, $lt:todayUnix } });
      // jobs yesterday and today 
      const jobsToday = await jobs.countDocuments({
        posted_time: { $gte: today }
      });
      const jobsYesterday = await jobs.countDocuments({
        posted_time: { $gte: yesterday, $lt: today }
      });
      //users yesterday and today
      const usersToday = await users.countDocuments({ created_at: { $gte: todayUnix } });
      const usersYday = await users.countDocuments({ created_at: { $gte: yesterdayUnix, $lt:todayUnix } });


      const resolvedToday = await reportRepository.countReports({ 
        status: reportStatusEnum.resolved, 
        resolved_at: { $gte: todayUnix } 
      });
      const pendingJobs = await jobApplications.countDocuments(
        {application_status:"Pending"}
      )
      const rejectedJobsToday = await jobApplications.countDocuments(
        { created_at: { $gte: todayUnix } },
        {application_status:"Rejected"}
      )
      const acceptedJobsToday = await jobApplications.countDocuments(
        { created_at: { $gte: todayUnix } },
        {application_status:"Accepted"}
      )
      // Average response time
      const avgResponse = await reportRepository.averageResolutionTime();
      

  
      // Platform analytics
      const newUsersToday = await users.countDocuments({ created_at: { $gte: todayUnix } });
      const contentPostedToday = await posts.countDocuments({ date: { $gte: todayUnix } });
  
      res.json({
        summary: {
            reported_content: totalReports,
            total_jobs: totalJobs,
            total_users: totalUsers,
            delta: {
              reports: reportsToday-reportsYday,
              jobs: jobsToday-jobsYesterday,
              users: usersToday-usersYday,
            }
          },
        content_moderation: {
          pending_reviews: pendingReviews,
          resolved_today: resolvedToday,
          avg_response_time_hours: avgResponse,
        },
        job_management: {
          pending_approval: pendingJobs,
          approved_today: acceptedJobsToday,
          rejected_today: rejectedJobsToday,
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
