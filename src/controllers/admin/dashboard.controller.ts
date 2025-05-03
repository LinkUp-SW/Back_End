import { Request, Response } from 'express';
import users from '../../models/users.model.ts';
import posts from '../../models/posts.model.ts';
import { ReportRepository } from '../../repositories/report.repository.ts';
import { adminActionEnum, contentTypeEnum, reportStatusEnum } from '../../models/reports.model.ts';
import jobApplications from '../../models/job_applications.model.ts';
import jobs from '../../models/jobs.model.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { findUserByUserId } from '../../utils/database.helper.ts';

const reportRepository = new ReportRepository

export const getDashboardMetrics = async (req: Request, res: Response) => {
    try {

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
          new_users_today: usersToday,
          content_posted_today: contentPostedToday
        }
      });
    } catch (error) {
      console.error('Error in getDashboardMetrics:', error);
      if (error instanceof Error && error.message === 'Invalid or expired token') {
        return res.status(401).json({ message: error.message, success: false });
      } else {res.status(500).json({ 
        message: 'Server error getting dashboard metrics', 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  };

export const getPlatformAnalyticsData = async (req: Request, res: Response) => {
  try {
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
    enum metricEnum{
      all='all',
      users='users',
      content='content',
      engagement='engagement',
      moderation='moderation',
      jobs='jobs'
    }
    enum periodEnum{
      days="7days",
      month="30days",
      quarter="90days",
      year="1year",
    }
    // Get time range parameters - default to last 30 days if not specified
    const { periodParam = '30days', metricParam = 'all' } = req.query;

    const validMetrics = Object.values(metricEnum);
    if (!validMetrics.includes(metricParam as metricEnum)) {
      return res.status(400).json({
        message: `Invalid metric parameter. Must be one of: ${validMetrics.join(', ')}`,
        success: false
      });
    }
    const validPeriod = Object.values(periodEnum);
    if (!validPeriod.includes(periodParam as periodEnum)) {
      return res.status(400).json({
        message: `Invalid period parameter. Must be one of: ${validPeriod.join(', ')}`,
        success: false
      });
    }
    
    const metric = metricParam as metricEnum;
    const period = periodParam as periodEnum
    // Calculate time boundaries
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date();
    let interval = 'day';
    
    switch(period) {
      case periodEnum.days:
        startDate.setDate(startDate.getDate() - 7);
        break;
      case periodEnum.month:
        startDate.setDate(startDate.getDate() - 30);
        break;
      case periodEnum.quarter:
        startDate.setDate(startDate.getDate() - 90);
        interval = 'week';
        break;
      case periodEnum.year:
        startDate.setDate(startDate.getDate() - 365);
        interval = 'month';
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    startDate.setHours(0, 0, 0, 0);
    
    // Generate data points for the selected time range
    let analyticsData: any = {};
    
    // User growth metrics
    if (metric === metricEnum.all || metric === metricEnum.users) {
      analyticsData.userGrowth = await reportRepository.getUserGrowthData(startDate, endDate, interval);
    }
    
    // Content metrics
    if (metric === metricEnum.all || metric === metricEnum.content) {
      analyticsData.contentCreation = await reportRepository.getContentCreationData(startDate, endDate, interval);
    }
    
    // Engagement metrics
    if (metric === metricEnum.all || metric === metricEnum.engagement) {
      analyticsData.engagementMetrics = await reportRepository.getEngagementData(startDate, endDate, interval);
    }
    
    // Reports and moderation metrics
    if (metric === metricEnum.all || metric === metricEnum.moderation) {
      analyticsData.moderationMetrics = await reportRepository.getModerationData(startDate, endDate, interval);
    }
    
    // Job metrics
    if (metric === metricEnum.all || metric === metricEnum.jobs) {
      analyticsData.jobMetrics = await reportRepository.getJobsData(startDate, endDate, interval);
    }
    
    res.status(200).json({
      message: 'Platform analytics data retrieved successfully',
      period,
      interval,
      data: analyticsData
    });
    
  } catch (error) {
    console.error('Error in getPlatformAnalyticsData:', error);
    if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message, success: false });
        } else {res.status(500).json({ 
      message: 'Server error getting platform analytics data', 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
};
