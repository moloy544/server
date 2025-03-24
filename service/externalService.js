import fetch from 'node-fetch';
import * as cheerio from 'cheerio';  // Use named import in ES modules
import Movies from "../models/Movies.Model.js";

// imdbId validating  using regex pattern
const imdbIdPattern = /^tt\d{7,}$/;

//************* Get Extranal Site Hls Url Controller **************//
export async function getHlsPlaylist(req, res) {
    try {
        const { imdbId } = req.params || {};

        const fullImdbId = "tt" + imdbId;

        // Validate IMDb ID
        if (!fullImdbId || !imdbIdPattern.test(fullImdbId.trim())) {
            return res.status(400).json({ message: "Invalid Contnet ID provided" });
        }

        // Fetch download source from the database
        const downloadSource = await Movies.findOne({ imdbId: fullImdbId })
            .select('watchLink')
            .lean();

        const { watchLink } = downloadSource;

        if (!watchLink || watchLink.length === 0) {
            return res.status(404).json({ message: "No video source found for this content" });
        };

        let hlsPlaylist;

        const vidpirateSource = watchLink.filter(sourceUrl => sourceUrl.includes('vidpirate.com'));

        if (!vidpirateSource) {
                return res.status(404).json({ message: "No video source found for this content" });
        };

        // Gte hlsPlaylist form vidpirate domain
        const response = await fetch(vidpirateSource);
        const htmlContent = await response.text();

        // Load the HTML content into cheerio
        const $ = cheerio.load(htmlContent);

        // Search for the playlist URL directly in the raw HTML
        const htmlText = $.html();

        // Regex to match the URL inside the playlist object
        const regex = /file:\s*"([^"]+\.m3u8[^"]*)"/g;

        const matches = [];
        let match;
        while ((match = regex.exec(htmlText)) !== null) {
            matches.push(match[1]); // Extract the .m3u8 URL
        }

        if (matches.length === 0) {
            return res.status(404).json({ message: "No video source found for this content" });
        };
        hlsPlaylist = matches[0];

        return res.json({ hlsPlaylist });

    } catch (error) {
        console.error("Error in getDownloadOptionsUrls:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}