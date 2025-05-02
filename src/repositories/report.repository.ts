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
                    admin_action: 'none', // Default since we're grouping multiple reports
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
}


export const reportRepo = new ReportRepository();