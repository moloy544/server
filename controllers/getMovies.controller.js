import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { genarateFilters } from "../utils/genarateFilter.js";
import Movies from "../models/Movies.Model.js";
import { createQueryConditionFilter, createSortConditions, getDataBetweenDate } from "../utils/dbOperations.js";
import DownloadSource from "../models/downloadSource.Model.js";
import { generateTokenizeSource } from '../helper/helper.js';

const selectFields = "-_id imdbId title displayTitle thumbnail releaseYear type category language videoType";

//************* Get Latest Release Movies Controller  *************//
export async function getLatestReleaseMovie(req, res) {

    try {

        const querySlug = req.params.query?.toLocaleLowerCase().replace('-', ' ')

        const { limit, page, skip, bodyData } = req.body;

        const query = {
            category: querySlug,
            fullReleaseDate: getDataBetweenDate({ type: 'months', value: 10 }),
            status: 'released'
        };

        if (querySlug === 'bollywood') {
            query.category = { $in: ['international'] };
        };

        // Creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query,
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
        const dateRange = getDataBetweenDate({ type: 'months', value: 3 });

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

// imdbId validatin using regex pattern
const imdbIdPattern = /^tt\d{7,}$/;
// V(1) For old visit or curent site users
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
                const isStreamP2pSource = link.includes('p2pplay.online');

                let label;

                if (isNoAds) {
                    label = language.replace("hindi dubbed", "Hindi") + ' (No Ads)';
                } else if (isMainSource) {
                    label = mainVideoSourceLabel;
                } else if (isRpmSource || isStreamP2pSource) {
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

        if (movieData.downloadLinks && Array.isArray(movieData.downloadLinks)) {
            movieData.downloadLinks = movieData.downloadLinks.map(dl => {
                if (dl.links && Array.isArray(dl.links)) {
                    const updatedLinks = dl.links.map(linkObj => {
                        if (linkObj.url && typeof linkObj.url === 'string' && linkObj.url.includes('pixeldrain.net')) {
                            return {
                                ...linkObj,
                                url: linkObj.url.replace('pixeldrain.net', 'anony.nl')
                            };
                        }
                        return linkObj;
                    });
                    return {
                        ...dl,
                        links: updatedLinks
                    };
                }
                return dl;
            });
        }

        // Then send the response
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

// V(2) For New Vist site users
export async function getMovieFullDetailsV2(req, res) {
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
                const isStreamP2pSource = link.includes('p2pplay.online');

                let label;

                if (isNoAds) {
                    label = language.replace("hindi dubbed", "Hindi") + ' (No Ads)';
                } else if (isMainSource) {
                    label = mainVideoSourceLabel;
                } else if (isRpmSource || isStreamP2pSource) {
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
        const randomSkip = language === "bengali" ? 0 : Math.random() < 0.2 ? 0 : Math.floor(Math.random() * skipMultiplyValue);  // 20% chance to skip 0 results

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

        if (movieData.downloadLinks && Array.isArray(movieData.downloadLinks)) {

            const secondTypeSource = movieData.downloadLinks.map(dl => {
                if (dl.links && Array.isArray(dl.links)) {
                    const replacements = [
                        { from: 'pixeldrain.net', to: 'anony.nl' },
                        { from: 'Vegamovies', to: 'vgm' },
                        { from: '?download', to: '' },
                        { from: 'filesdl.site', to: 'fdl.st' },
                        { from: 'Movies4u', to: 'm4' },
                    ];
                    
                    const updatedLinks = dl.links.map(linkObj => {
                        if (linkObj.url && typeof linkObj.url === 'string') {
                            let newUrl = linkObj.url;

                            for (const { from, to } of replacements) {
                                newUrl = newUrl.replace(from, to);
                            }

                            return {
                                ...linkObj,
                                url: newUrl
                            };
                        }

                        return linkObj;
                    });

                    return {
                        ...dl,
                        links: updatedLinks
                    };
                }
                return dl;
            });
            delete movieData.downloadLinks;
            movieData.secondTypeSource = secondTypeSource
        }

        // Then send the response
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

//************* Get Movies Download Source Controller (V2) **************//
export async function getDownloadOptionsUrlsV2(req, res) {
    try {
        const { imdbId } = req.params || {};
        const fullImdbId = "tt" + imdbId;

        const { sourceIndex = 0 } = req.query || {}; // Default sourceIndex is 0

        // Validate IMDb ID
        const imdbIdPattern = /^tt\d+$/;
        if (!fullImdbId || !imdbIdPattern.test(fullImdbId.trim())) {
            return res.status(400).json({ message: "Invalid Content ID provided" });
        }

        // Fetch download source from the database
        const downloadSource = await DownloadSource.findOne({ content_id: fullImdbId })
            .select('links')
            .lean();

        if (!downloadSource || !downloadSource.links || downloadSource.links.length === 0) {
            return res.status(404).json({ message: "No download links available for this content" });
        }

        // Ensure the sourceIndex is valid and within bounds
        const index = parseInt(sourceIndex, 10);
        if (isNaN(index) || index < 0 || index >= downloadSource.links.length) {
            return res.status(400).json({ message: "Invalid source index" });
        }

        const sourceUrl = downloadSource.links?.[index].url;
        const isPixeldrainUrl = sourceUrl?.includes('pixeldrain.net');

        if (isPixeldrainUrl) {
            return res.status(200).json({ downloadUrl: [sourceUrl] });
        }

        // Fetch the HTML content from the selected source link
        const response = await fetch(sourceUrl);
        const htmlContent = await response.text();

        // Parse the HTML and extract <a> tags using cheerio
        const $ = cheerio.load(htmlContent);
        const links = $('a').map((i, el) => $(el).attr('href')).get();

        if (links.length === 0) {
            return res.status(404).json({ message: "No download links found in the source" });
        };

        // Filter links by type
        const fdownloadLinks = links.filter(link => link.includes('fdownload.php'));
        const pubLinks = links.filter(link =>
            !link.includes('fdownload.php') && link.startsWith('https://pub')
        );
        const botddLinks = links.filter(link =>
            !link.includes('fdownload.php') && !link.startsWith('https://pub') && link.startsWith('https://botdd')
        );

        // Combine in priority order
        const reorderedLinks = [
            ...fdownloadLinks,
            ...botddLinks,
            ...pubLinks,
        ];

        // If no links found in those categories, fallback to empty or null
        if (reorderedLinks.length === 0) {
            return res.status(404).json({ message: "No suitable download links found in the source" });
        }

        // Return the reordered array or just first URL if you want
        return res.status(200).json({ downloadUrl: reorderedLinks });

    } catch (error) {
        console.error("Error in getDownloadOptionsUrls:", error);
        return res.status(500).json({ message: "An error occurred while fetching download URLs" });
    }
}
