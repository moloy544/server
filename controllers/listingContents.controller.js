import { TrendingContnet } from "../models/Listings.Modal.js";
import { createQueryConditionFilter, createSortConditions } from "../utils/dbOperations.js";

// Get top trending content listing controller
export async function TopTrendingContenListing(req, res) {
    try {
         const { limit, page, skip, bodyData } = req.body;
  
        const baseQuery = {};
        const queryCondition = createQueryConditionFilter({
          query: baseQuery,
          filter: bodyData?.filterData,
        });
  
        const sortFilterCondition = createSortConditions({
          filterData: bodyData?.filterData,
          query: queryCondition,
        });
  
        const trendingData = await TrendingContnet.aggregate([
          {
            $lookup: {
              from: 'movies',
              localField: 'content_id',
              foreignField: '_id',
              as: 'movieDetails',
            },
          },
          { $unwind: '$movieDetails' },
          { $match: queryCondition },
          { $sort: { ...sortFilterCondition, updatedAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              imdbId: '$movieDetails.imdbId',
              title: '$movieDetails.title',
              displayTitle: '$movieDetails.displayTitle',
              thumbnail: '$movieDetails.thumbnail',
              releaseYear: '$movieDetails.releaseYear',
              type: '$movieDetails.type',
              videoType: '$movieDetails.videoType',
            },
          },
        ]);
  
        const endOfData = trendingData.length < limit;
  
        const response = {
          moviesData: trendingData,
          endOfData,
        };
  
        return res.status(200).json(response);
    
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };