import { Report, reportInterface, reportReasonEnum, contentTypeEnum, reportStatusEnum, adminActionEnum } from '../models/reports.model.ts';
import { Types } from 'mongoose';

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
    async findReportsForContent(contentRef: string | Types.ObjectId, contentType: contentTypeEnum): Promise<reportInterface[]> {
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
        notes?: string
    ): Promise<reportInterface | null> {
        return await Report.findByIdAndUpdate(
            reportId,
            {
                status: reportStatusEnum.resolved,
                admin_action:adminAction,
                resolved_by: adminId,
                resolved_at: Math.floor(Date.now() / 1000),
                resolution_notes: notes
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
                            { $group: { _id: "$status", count: { $sum: 1 } } }
                        ],
                        // Group by content_ref and content_type to count reports per content item
                        contentCountGroups: [
                            { 
                                $group: {
                                    _id: { content_ref: "$content_ref", content_type: "$content_type" },
                                    count: { $sum: 1 }
                                }
                            }
                        ]
                    }
                }
            ]);
            
            const totalCount = countData[0].totalCount[0]?.count || 0;
            
            // Format status counts into a simple object
            const statusCounts: Record<string, number> = {};
            countData[0].statusCounts.forEach((item: any) => {
                statusCounts[item._id] = item.count;
            });
            
            // Create a map of report counts per content item
            const contentReportCountMap = new Map();
            countData[0].contentCountGroups.forEach((item: any) => {
                const key = `${item._id.content_type}_${item._id.content_ref}`;
                contentReportCountMap.set(key, item.count);
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
    
            // Execute query with sort and limit, selecting only needed fields
            const paginatedReports = await Report.find(matchCondition)
                .select('_id content_ref content_type reason created_at status admin_action')
                .sort({ created_at: -1 })
                .skip(cursor ?? 0)
                .limit(limit + 1) // Get one extra to check if there are more
                .lean()
                .exec();
    
            // Check if there are more results
            const hasMore = paginatedReports.length > limit;
            const results = hasMore ? paginatedReports.slice(0, limit) : paginatedReports;
            
            // Format the reports with simplified structure and REP#### IDs
            const formattedResults = results.map((report) => {
                // Get report count for this content
                const contentKey = `${report.content_type}_${report.content_ref}`;
                const reportCount = contentReportCountMap.get(contentKey) || 1;
                
                // Include the virtual reportId field that is automatically added
                return {
                    report_id:`REP${report._id.toString().substring(report._id.toString().length - 4)}`, // Fallback if virtual isn't available
                    mongo_id: report._id, // Keep the original ID for reference
                    type: report.content_type,
                    reason: report.reason,
                    created_at: report.created_at,
                    status: report.status,
                    admin_action: report.admin_action,
                    report_count: reportCount
                };
            });
    
            // Calculate next cursor
            const nextCursor = hasMore ? (cursor ?? 0) + limit : null;
    
            return {
                reports: formattedResults,
                totalCount,
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
}


export const reportRepo = new ReportRepository();