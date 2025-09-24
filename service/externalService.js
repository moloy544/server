import fetch from 'node-fetch';
import * as cheerio from 'cheerio';  // Use named import in ES modules
import Movies from "../models/Movies.Model.js";

export async function getHlsFromPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Referer": "https://fl.enzru.net/",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();
    console.log(html); // contains the playlist now
    return html;

  } catch (err) {
    console.error("Error fetching page:", err);
  }
};

// imdbId validating  using regex pattern
const imdbIdPattern = /^tt\d{7,}$/;

//************* Get Extranal Site Hls Url Controller **************//
export async function ScrapHlsPlaylist(req, res) {
  try {
    const { imdbId } = req.params;
    const fullImdbId = "tt" + imdbId;

    if (!fullImdbId || !imdbIdPattern.test(fullImdbId.trim())) {
      return res.status(400).json({ message: "Invalid Content ID provided" });
    }

    const movie = await Movies.findOne({ imdbId: fullImdbId })
      .select("watchLink")
      .lean();

    if (!movie || !movie.watchLink || movie.watchLink.length === 0) {
      return res.status(404).json({ message: "No video source found" });
    }

    const vidpirateSource = movie.watchLink.find(url => url.includes("enzru.net"));

    if (!vidpirateSource) {
      return res.status(404).json({ message: "No Enzru source found" });
    }

    const response = getHlsFromPage(vidpirateSource);
    if (!response) {
      return res.status(404).json({ message: "No HLS playlist found" });
    }

    return res.json({ hlsPlaylist: response });

  } catch (error) {
    console.error("Error fetching HLS playlist:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}