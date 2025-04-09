import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { genarateFilters } from "../utils/genarateFilter.js";
import Movies from "../models/Movies.Model.js";
import { createQueryConditionFilter, createSortConditions, getDataBetweenDate } from "../utils/dbOperations.js";
import DownloadSource from "../models/downloadSource.Model.js";
import { generateTokenizeSource } from '../helper/helper.js';

const selectFields = "-_id imdbId title displayTitle thumbnail releaseYear type category language videoType";

// Function to escape special regex characters in the query string
function escapeRegexSpecialChars(str) {
    return str?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape all special characters
};

//************* Movies Search Handler Function Controller *************//
export async function searchHandler(req, res) {
    try {
        const { q } = req.query;
        const { limit = 30, skip = 0 } = req.body;

        if (!q) {
            return res.status(400).json({ message: "Invalid search query" });
        }

        // Clean query and escape special regex characters
        const cleanedQuery = q.trim().toLowerCase();
        const escapedQuery = escapeRegexSpecialChars(cleanedQuery); // Escape special characters

        // Split query into individual words for fuzzy search
        const splitQuery = cleanedQuery.split(' ');

        // Regular expression for "starts with" the full query (case-insensitive)
        const startsWithQueryRegex = new RegExp(`^${escapedQuery}`, 'i');

        // Regular expression for full query (case-insensitive)
        const fullQueryRegex = new RegExp(escapedQuery, 'i');

        // Fuzzy search regex (match each term in the query string)
        const fuzzyQueryRegex = new RegExp(splitQuery?.map(term => `(?=.*${escapeRegexSpecialChars(term)})`).join(''), 'i');

        // Step 1: Attempt the initial search
        let searchData = await Movies.find({
            $or: [
                { title: startsWithQueryRegex },
                { title: { $regex: startsWithQueryRegex } },
                { tags: { $in: startsWithQueryRegex } },
            ],
        })
            .collation({ locale: 'en', strength: 2 })  // Ensure case-insensitive search
            .skip(skip)
            .limit(limit)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: -1 })
            .select(selectFields + ' tags')
            .lean();

        // Step 3: Retry with complex search if no result
        if (searchData.length === 0) {

            searchData = await Movies.find({
                $or: [
                    { title: { $regex: fullQueryRegex } },
                    { title: { $in: fuzzyQueryRegex } },  // Fuzzy search for title
                    { tags: { $in: fullQueryRegex } },
                    { castDetails: { $in: fullQueryRegex } },
                    { searchKeywords: { $regex: fullQueryRegex } },
                    { genre: { $in: fullQueryRegex } },
                    { imdbId: cleanedQuery },
                    { releaseYear: parseInt(q, 10) || 0 },
                ],
            })
                .skip(skip)
                .limit(limit)
                .sort({ releaseYear: -1, fullReleaseDate: -1, _id: -1 })
                .select(selectFields + ' tags')
                .lean();
        }

        // Step 4: Rank search results based on matches
        if (searchData.length > 0) {
            const rankedResults = searchData.map(data => {
                const lowerTitle = data.title?.trim().toLowerCase();
                const lowerTitleWords = lowerTitle.split(' ');

                // Get tags from the current movie data
                const tags = data.tags || []; // Ensure tags is an empty array if undefined

                // Count how many times the search terms match the title or tags
                const matchCount = splitQuery.reduce((count, term) => {
                    let termCount = 0;

                    if (lowerTitleWords.includes(term)) termCount += 1;
                    if (tags && tags.includes(term) || tags.includes(cleanedQuery)) termCount += 1;
                    if (lowerTitle.startsWith(cleanedQuery)) termCount += 1;
                    if (tags && tags.some(tag => tag.startsWith(term))) termCount += 1;
                    if (lowerTitle.length === cleanedQuery.length) termCount += 1;

                    return count + termCount;
                }, 0);

                return { data, matchCount };
            });

            // Sort the results by matchCount
            rankedResults.sort((a, b) => b.matchCount - a.matchCount);

            const bestResultIds = new Set(rankedResults.map(result => result.data.imdbId?.toString()));
            const similarMatch = searchData.filter(data => !bestResultIds.has(data.imdbId?.toString()));

            searchData = [...rankedResults.map(result => result.data), ...similarMatch];
        }

        // Step 5: Clean response data (remove tags)
        searchData = searchData.map(({ tags, ...cleanedData }) => cleanedData);

        return res.status(200).json({ moviesData: searchData, endOfData: searchData.length < limit });
    } catch (error) {
        console.error("Error in searchHandler: ", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

//************* Get Latest Release Movies Controller  *************//
export async function getLatestReleaseMovie(req, res) {

    try {

        const querySlug = req.params.query?.toLocaleLowerCase().replace('-', ' ')

        const { limit, page, skip, bodyData } = req.body;

        // Creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                category: querySlug,
                fullReleaseDate: getDataBetweenDate({ type: 'months', value: 10 }),
                status: 'released'
            },
            filter: bodyData?.filterData
        });

        // creat sort data conditions based on user provided filter
        const sortFilterCondition = createSortConditions({
            filterData: bodyData?.filterData,
            query: queryCondition
        });

        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(limit)
            .select(selectFields)
            .sort({ ...sortFilterCondition, _id: 1 }).lean();

        const endOfData = (moviesData.length < limit - 1);

        // creat initial response data add more responses data as needed
        const response = { moviesData, endOfData: endOfData };

        // initial filterOption need
        const filteOptionsNeeded = ['type', 'genre'];

        if (page && page === 1) {
            response.filterOptions = await genarateFilters({
                query: queryCondition,
                filterNeed: filteOptionsNeeded
            })
        };

        return res.status(200).json(response);

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

};

//************* Get Recently Added Movies or Series Controller  *************//
export async function getRecentlyAddedContents(req, res) {

    try {

        const { limit, page, skip, bodyData } = req.body;

        // Get the date range condition
        const dateRange = getDataBetweenDate({ type: 'months', value: 2 });

        // creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                status: 'released',
                tags: { $nin: ['Cartoons'] },
                createdAt: { $exists: true, ...dateRange }
            },
            filter: bodyData?.filterData
        });

        // creat sort data conditions based on user provided filter
        const sortFilterCondition = createSortConditions({
            filterData: bodyData?.filterData,
            query: queryCondition
        });

        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(limit)
            .select(selectFields)
            .sort({ ...sortFilterCondition, createdAt: -1, _id: 1 }).lean();

        const endOfData = (moviesData.length < limit - 1);

        // creat initial response data add more responses data as needed
        const response = { moviesData, endOfData: endOfData };

        // initial filterOption need
        const filteOptionsNeeded = ['type', 'genre', 'industry', 'provider'];

        if (page && page === 1) {
            response.filterOptions = await genarateFilters({
                query: queryCondition,
                filterNeed: filteOptionsNeeded
            });
        };

        return res.status(200).json(response);

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };
};


//************* Get Movies Embedded Source Controller **************//
export async function getEmbedVideo(req, res) {
    try {
        const { contentId } = req.body;

        const movie = await Movies.findOne({ imdbId: contentId }).select('-_id watchLink status').lean()

        if (!movie) {
            return res.status(404).json({ message: 'Content not found' });
        };

        const FALLBACK_IP_ADDRESS = '76.76.21.123';
        let ip = FALLBACK_IP_ADDRESS

        // Get user IP address from the 'x-forwarded-for' header

        if (process.env.NODE_ENV === "production") {
            ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || FALLBACK_IP_ADDRESS;
        };

        return res.status(200).json({
            userIp: ip,
            source: movie.watchLink,
            status: movie.status
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export async function updateMoviesVideoSource() {
    try {
        // Find all documents that have watchLink
        const movies = await Movies.find({});
        if (!movies || movies.length === 0) {
            console.log('No movies found.');
            return;
        }

        // Create an array of promises for updating each document
        const updatePromises = movies.map(async (doc) => {
            // Map through each watchLink, checking if it's a string or an object, and updating its structure
            const updatedWatchLink = (doc.watchLink || []).map((link, index) => {
                let updateLink;

                if (typeof link === 'string') {
                    // If the watchLink entry is a string, treat it as the source and create an object with the 'source' key
                    updateLink = {
                        source: link,  // The original string becomes the source
                        label: `Server ${index + 1}`  // Assign default label
                    };

                    // Add extra information to the label if needed
                    if (link && (link.includes('.m3u8') || link.includes('.mkv'))) {
                        updateLink.label = `Server ${index + 1} - ${doc.language ? doc.language.replace("hindi dubbed", "Hindi") : ''} (No Ads)`;
                    } else if (doc.multiAudio) {
                        updateLink.label = `Server ${index + 1} - (Multi Language)`;
                    }
                } else if (link && typeof link === 'object' && link.source) {
                    // If the watchLink entry is already an object, handle it accordingly
                    updateLink = {
                        source: link.source,  // Assuming it already has a 'source' field
                        label: `Server ${index + 1}`
                    };

                    // Add extra information to the label if needed
                    if (link.source.includes('.m3u8') || link.source.includes('.mkv')) {
                        updateLink.label = `Server ${index + 1} - ${doc.language ? doc.language.replace("hindi dubbed", "Hindi") : ''} (No Ads)`;
                    } else if (doc.multiAudio) {
                        updateLink.label = `Server ${index + 1} - (Multi Language)`;
                    }
                } else {
                    console.warn(`Invalid watchLink entry found for movie ID ${doc._id}:`, link);
                    return null; // Skip invalid entries
                }

                return updateLink;
            }).filter(Boolean); // Filter out any null values from invalid entries

            // Update the document with the modified watchLink array, adding it to the new 'video_source' field
            await Movies.updateOne(
                { _id: doc._id },
                { $set: { video_source: updatedWatchLink } }
            );
        });

        // Wait for all update operations to complete
        await Promise.all(updatePromises);

        console.log('Movies updated successfully.');
    } catch (error) {
        console.error('Error while updating video source:', error);
    }
};

//************* Get Movie Full Details Controller *************//

// imdbId validating  using regex pattern
const imdbIdPattern = /^tt\d{7,}$/;

export async function getMovieFullDetails(req, res) {
    try {
        const { imdbId } = req.params;
        const suggestion = req.query.suggestion === 'true'; // This works if the query parameter is 'suggestion'

        if (!imdbId || !imdbIdPattern.test(imdbId.trim())) {
            return res.status(400).json({ message: "IMDb ID is invalid" });
        };

        const FALLBACK_IP_ADDRESS = '76.76.21.123';
        let ip = FALLBACK_IP_ADDRESS

        // Get user IP address from the 'x-forwarded-for' header

        if (process.env.NODE_ENV === "production") {
            ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || FALLBACK_IP_ADDRESS;
        };

        let dbQueryData;

        if (suggestion) {
            // Get movies data with download links using aggregation
            dbQueryData = await Movies.aggregate([
                {
                    $match: { imdbId }
                },
                {
                    $lookup: {
                        from: 'download_sources',
                        localField: 'imdbId',
                        foreignField: 'content_id',
                        as: 'downloadLinks'
                    }
                }
            ]);
        } else {
            // Get movies data only for SEO Metadata
            dbQueryData = await Movies.findOne({
                imdbId
            }).select('-_id -videoType -displayTitle -watchLink -imdbRating -fullReleaseDate');
        };

        const movieData = suggestion ? dbQueryData[0] : dbQueryData;

        if (!movieData) {
            return res.status(404).json({ message: "Movie not found" });
        };

        // cehck if no suggestions need return only movie details
        if (!suggestion) {
            return res.status(200).json({ movieData });
        };

        const { genre, language, castDetails, category, watchLink, multiAudio, mainVideoSourceLabel = null, rpmshareSourceLable = null } = movieData;

        const reorderWatchLinks = (watchLinks) => {
            const m3u8Link = watchLinks.find(link => link.includes('.m3u8') || link.includes('.mkv') || link.includes('.txt'));
            if (m3u8Link) {
                watchLinks = watchLinks.filter(link => link !== m3u8Link);
                watchLinks.unshift(m3u8Link);
            };

            let defaultLabel;

            if (multiAudio && typeof multiAudio === "boolean" || (watchLink.length > 1 && watchLink.includes('.m3u8') || watchLink.includes('.mkv') || watchLink.includes('.txt'))) {
                defaultLabel = '(Multi language)';

            } else {
                defaultLabel = null
            };

            return watchLinks.map((link, index) => {
                const isNoAds = link.includes('.m3u8') || link.includes('.mkv') || link.includes('.txt');
                const isMainSource = link.includes(imdbId) && mainVideoSourceLabel;
                const isRpmSource = link.includes('rpmplay.online');

                let label;

                if (isNoAds) {
                    label = language.replace("hindi dubbed", "Hindi") + ' (No Ads)';
                } else if (isMainSource) {
                    label = mainVideoSourceLabel;
                } else if (isRpmSource) {
                    if (rpmshareSourceLable) {
                        label = rpmshareSourceLable;
                    } else if (typeof multiAudio === "boolean" && multiAudio === false) {
                        label = language.replace("hindi dubbed", "Hindi");
                    } else {
                        label = defaultLabel;
                    }
                } else {
                    label = defaultLabel;
                }

                return {
                    source: generateTokenizeSource(link, ip),
                    label: `Server ${index + 1}`,
                    labelTag: label
                };
            });

        };

        // Movies hls source provide domain 
        const hlsSourceDomain = process.env.HLS_VIDEO_SOURCE_DOMAIN

        if (watchLink && Array.isArray(watchLink) && watchLink.length > 0) {
            movieData.watchLink = reorderWatchLinks(watchLink);
        };

        const filterGenre = genre.length > 1 && genre.includes("Drama")
            ? genre.filter(g => g !== "Drama")
            : genre;

        // Adjust skipMultiplyValue dynamically to vary the number of results skipped
        const skipMultiplyValue = filterGenre.length * 10 + Math.floor(Math.random() * 10);
        const randomSkip = Math.random() < 0.2 ? 0 : Math.floor(Math.random() * skipMultiplyValue);  // 20% chance to skip 0 results

        const suggestionsPipeline = [
            {
                $facet: {
                    genreList: [
                        {
                            $match: {
                                genre: { $in: filterGenre },
                                category,
                                imdbId: { $ne: imdbId },
                                status: 'released'
                            }
                        },
                        { $skip: randomSkip },
                        { $limit: Math.random() < 0.5 ? 20 : 25 },  // Randomize limit between 20 and 25
                        {
                            $project: {  // Select only the required fields
                                _id: 0,  // Exclude _id
                                imdbId: 1,
                                title: 1,
                                displayTitle: 1,
                                thumbnail: 1,
                                releaseYear: 1,
                                type: 1,
                                category: 1,
                                language: 1,
                                videoType: 1
                            }
                        }
                    ],
                    castList: [
                        {
                            $match: {
                                castDetails: { $in: castDetails },
                                imdbId: { $ne: imdbId },
                                status: 'released'
                            }
                        },
                        { $limit: 25 },
                        {
                            $project: {  // Select only the required fields
                                _id: 0,  // Exclude _id
                                imdbId: 1,
                                title: 1,
                                displayTitle: 1,
                                thumbnail: 1,
                                releaseYear: 1,
                                type: 1,
                                category: 1,
                                language: 1,
                                videoType: 1
                            }
                        }
                    ]
                }
            }
        ];

        // Suggestions (You might also like and Explore more from same actor)
        const suggestions = await Movies.aggregate(suggestionsPipeline);

        return res.status(200).json({
            userIp: ip,
            movieData: {
                ...movieData,
                hlsSourceDomain
            },
            suggestions: suggestions[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

//************* Get Movies Embedded Source Controller **************//
export async function getDownloadOptionsUrls(req, res) {
    try {
        const { imdbId } = req.params || {};

        const fullImdbId = "tt" + imdbId;

        const { sourceIndex = 0 } = req.query || {};  // Default sourceIndex is 0

        // Validate IMDb ID
        if (!fullImdbId || !imdbIdPattern.test(fullImdbId.trim())) {
            return res.status(400).json({ message: "Invalid Contnet ID provided" });
        }

        // Fetch download source from the database
        const downloadSource = await DownloadSource.findOne({ content_id: fullImdbId })
            .select('links')
            .lean();

        // Handle if no download source is found
        if (!downloadSource || !downloadSource.links || downloadSource.links.length === 0) {
            return res.status(404).json({ message: "No download links available for this content" });
        }

        // Ensure the sourceIndex is valid and within bounds
        const index = parseInt(sourceIndex, 10);
        if (isNaN(index) || index < 0 || index >= downloadSource.links.length) {
            return res.status(400).json({ message: "Invalid source index" });
        }

        // Fetch the HTML content from the selected source link
        const sourceUrl = downloadSource.links?.[sourceIndex].url;
        const isPixeldrainUrl = sourceUrl?.includes('pixeldrain.net');

        if (isPixeldrainUrl) {
            return res.status(200).json({ downloadUrl: sourceUrl });
        }

        const response = await fetch(sourceUrl);
        const htmlContent = await response.text();

        // Parse the HTML and extract <a> tags using cheerio
        const $ = cheerio.load(htmlContent);
        const links = $('a').map((i, el) => $(el).attr('href')).get();

        if (links.length === 0) {
            return res.status(404).json({ message: "No download links found in the source" });
        };
        let sendUrl;
        tt0322259
        const firstNeedUrl = links.filter(link => link.includes('fdownload.php'));
        const secondNeedUrl = links.filter((link) => link.startsWith('https://pub'));
        if (firstNeedUrl.length > 0) {
            sendUrl = firstNeedUrl[0];
        } else if (secondNeedUrl.length > 0) {
            sendUrl = secondNeedUrl[0];
        } else {
            sendUrl = links[0];
        }
        
        return res.status(200).json({ downloadUrl: sendUrl });

    } catch (error) {
        console.error("Error in getDownloadOptionsUrls:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
