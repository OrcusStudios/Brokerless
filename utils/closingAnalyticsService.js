const Offer = require('../models/Offer');
const Listing = require('../models/Listing');
const User = require('../models/User');
const mongoose = require('mongoose');

class ClosingAnalyticsService {
    /**
     * Calculate overall market closing metrics
     * @param {Object} options - Filtering options
     * @returns {Promise<Object>} Market closing metrics
     */
    static async getMarketClosingMetrics(options = {}) {
        const { 
            startDate = new Date(0), 
            endDate = new Date(), 
            state 
        } = options;

        const matchStage = {
            closingStatus: 'closed',
            createdAt: { 
                $gte: startDate, 
                $lte: endDate 
            }
        };

        if (state) {
            matchStage['listing.state'] = state;
        }

        const metrics = await Offer.aggregate([
            {
                $lookup: {
                    from: 'listings',
                    localField: 'listing',
                    foreignField: '_id',
                    as: 'listing'
                }
            },
            { $unwind: '$listing' },
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalClosedTransactions: { $sum: 1 },
                    totalClosedValue: { $sum: '$offerPrice' },
                    averageClosingPrice: { $avg: '$offerPrice' },
                    averageTimeToClosure: { 
                        $avg: { 
                            $divide: [
                                { $subtract: ['$closingDate', '$createdAt'] }, 
                                1000 * 60 * 60 * 24 // Convert to days
                            ] 
                        } 
                    },
                    stateBreakdown: {
                        $push: {
                            state: '$listing.state',
                            count: 1,
                            value: '$offerPrice'
                        }
                    }
                }
            }
        ]);

        return metrics[0] || {
            totalClosedTransactions: 0,
            totalClosedValue: 0,
            averageClosingPrice: 0,
            averageTimeToClosure: 0,
            stateBreakdown: []
        };
    }

    /**
     * Analyze closing trends by month
     * @param {number} yearAgo - Number of months to look back
     * @returns {Promise<Array>} Monthly closing trends
     */
    static async getMonthlyClosingTrends(yearAgo = 12) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - yearAgo);

        return Offer.aggregate([
            { 
                $match: { 
                    closingStatus: 'closed',
                    closingDate: { $gte: startDate } 
                } 
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$closingDate' },
                        month: { $month: '$closingDate' }
                    },
                    totalTransactions: { $sum: 1 },
                    totalValue: { $sum: '$offerPrice' },
                    averagePrice: { $avg: '$offerPrice' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
    }

    /**
     * Generate buyer and seller performance insights
     * @param {Object} options - Filtering options
     * @returns {Promise<Object>} Buyer and seller insights
     */
    static async getBuyerSellerInsights(options = {}) {
        const { startDate = new Date(0), endDate = new Date() } = options;

        const buyerInsights = await Offer.aggregate([
            { 
                $match: { 
                    closingStatus: 'closed',
                    createdAt: { $gte: startDate, $lte: endDate } 
                } 
            },
            {
                $group: {
                    _id: '$buyer',
                    totalPurchases: { $sum: 1 },
                    totalPurchaseValue: { $sum: '$offerPrice' },
                    averagePurchasePrice: { $avg: '$offerPrice' }
                }
            },
            { $sort: { totalPurchaseValue: -1 } },
            { $limit: 10 }
        ]);

        const sellerInsights = await Offer.aggregate([
            { 
                $match: { 
                    closingStatus: 'closed',
                    createdAt: { $gte: startDate, $lte: endDate } 
                } 
            },
            {
                $group: {
                    _id: '$seller',
                    totalSales: { $sum: 1 },
                    totalSalesValue: { $sum: '$offerPrice' },
                    averageSalesPrice: { $avg: '$offerPrice' }
                }
            },
            { $sort: { totalSalesValue: -1 } },
            { $limit: 10 }
        ]);

        // Populate user details
        const populateBuyerDetails = async (insights) => {
            return Promise.all(
                insights.map(async (insight) => {
                    const buyer = await User.findById(insight._id).select('name email');
                    return { ...insight, buyerDetails: buyer };
                })
            );
        };

        const populateSellerDetails = async (insights) => {
            return Promise.all(
                insights.map(async (insight) => {
                    const seller = await User.findById(insight._id).select('name email');
                    return { ...insight, sellerDetails: seller };
                })
            );
        };

        return {
            topBuyers: await populateBuyerDetails(buyerInsights),
            topSellers: await populateSellerDetails(sellerInsights)
        };
    }

    /**
     * Analyze closing failure reasons
     * @returns {Promise<Object>} Closing failure analysis
     */
    static async getClosingFailureAnalysis() {
        const failedOffers = await Offer.aggregate([
            { 
                $match: { 
                    $or: [
                        { closingStatus: 'canceled' },
                        { closingStatus: 'rejected' }
                    ] 
                } 
            },
            {
                $group: {
                    _id: '$reason', // Assuming reason is tracked
                    count: { $sum: 1 },
                    totalFailedValue: { $sum: '$offerPrice' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        return {
            totalFailedTransactions: failedOffers.reduce((sum, reason) => sum + reason.count, 0),
            failureReasons: failedOffers
        };
    }
}

module.exports = ClosingAnalyticsService;