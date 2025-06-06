import { TrendingContnet } from "../models/Listings.Modal.js";
import { createQueryConditionFilter, createSortConditions } from "../utils/dbOperations.js";

function prefixSortKeys(sortObj, prefix) {
  const newSort = {};
  for (const key in sortObj) {
    newSort[`${prefix}${key}`] = sortObj[key];
  }
  return newSort;
}

export async function TopTrendingContenListing(req, res) {
  try {
    const { limit, skip, bodyData } = req.body;

    const baseQuery = {};
    const queryCondition = createQueryConditionFilter({
      query: baseQuery,
      filter: bodyData?.filterData,
    });

    const movieSortCondition = createSortConditions({
      filterData: bodyData?.filterData,
      query: queryCondition,
    });

    let sortStage;
    if (movieSortCondition && Object.keys(movieSortCondition).length > 0) {
      // If movie sort fields exist, prefix keys for aggregation
      sortStage = prefixSortKeys(movieSortCondition, "movieDetails.");
    } else {
      // Default sort by trending updatedAt desc
      sortStage = { updatedAt: -1 };
    }

    const trendingData = await TrendingContnet.aggregate([
      {
        $lookup: {
          from: "movies",
          localField: "content_id",
          foreignField: "_id",
          as: "movieDetails",
        },
      },
      { $unwind: "$movieDetails" },
      { $match: queryCondition },
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          imdbId: "$movieDetails.imdbId",
          title: "$movieDetails.title",
          displayTitle: "$movieDetails.displayTitle",
          thumbnail: "$movieDetails.thumbnail",
          releaseYear: "$movieDetails.releaseYear",
          type: "$movieDetails.type",
          videoType: "$movieDetails.videoType",
        },
      },
    ]);

  const endOfData = trendingData.length < limit;

    const responses = {
      moviesData: trendingData,
      endOfData,
    };

    return res.status(200).json(responses);
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
