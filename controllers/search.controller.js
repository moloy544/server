import Movies from "../models/Movies.Model.js";

const selectFields = "-_id imdbId title displayTitle thumbnail releaseYear type category language videoType";

// Escape special regex characters
function escapeRegex(str) {
    return str?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateScore(data, cleanedQuery, splitQuery) {
    const title = data.title?.toLowerCase() || '';
    const titleWords = title.split(/\s+/);
    const tags = data.tags || [];

    let score = 0;

    splitQuery.forEach(term => {
        if (title === cleanedQuery) score += 5;
        if (title.startsWith(cleanedQuery)) score += 3;
        if (title.startsWith(term)) score += 2;
        if (titleWords.includes(term)) score += 1;
        if (tags.includes(term)) score += 1;
        if (tags.some(tag => tag.startsWith(term))) score += 1;
    });

    // New bonus: Add score if title word count is close to query word count
    const titleWordCount = titleWords.length;
    const queryWordCount = splitQuery.length;

    const diff = Math.abs(titleWordCount - queryWordCount);
    if (diff === 0) score += 2;       // Perfect length match
    else if (diff === 1) score += 1;  // Close match

    return score;
}


// Optimized Search Handler
export async function searchHandler(req, res) {
    try {
        const { q } = req.query;
        const { limit = 30, skip = 0 } = req.body;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ message: "Invalid search query" });
        }

        const cleanedQuery = q.trim().toLowerCase();
        const escapedQuery = escapeRegex(cleanedQuery);
        const splitQuery = cleanedQuery.split(/\s+/);

        const exactRegex = new RegExp(`^${escapedQuery}$`, 'i');
        const startsWithRegex = new RegExp(`^${escapedQuery}`, 'i');
        const fuzzyRegex = new RegExp(splitQuery.map(term => `(?=.*${escapeRegex(term)})`).join(''), 'i');

        const uniqueMap = new Map();
        let results = [];

        // Phase 1: Exact title match
        const exactMatches = await Movies.find({ title: exactRegex })
            .collation({ locale: 'en', strength: 2 })
            .select(selectFields + ' tags')
            .lean();

        exactMatches.forEach(m => uniqueMap.set(m.imdbId, m));

        // Phase 1.5: Check for release year
        const releaseYear = parseInt(q, 10);

        // Phase 2: StartsWith, tags, and searchKeywords
        const phase2 = await Movies.find({
            $or: [
                { title: startsWithRegex },
                { title: { $regex: fuzzyRegex } },
                { tags: { $regex: fuzzyRegex } },
                { searchKeywords: { $in: splitQuery } },
                { imdbId: cleanedQuery },
                ...(isNaN(releaseYear) ? [] : [{ releaseYear }])
            ]
        })
            .collation({ locale: 'en', strength: 2 })
            .select(selectFields + ' tags')
            .lean();

        phase2.forEach(m => uniqueMap.set(m.imdbId, m));

        // Phase 3: Fuzzy/broad match if still insufficient
        if (uniqueMap.size === 0) {
            const baseTerm = splitQuery.slice(0, 2).join(' '); // e.g. "Squid Game"
            const baseRegex = new RegExp(baseTerm, 'i');

            const phase3 = await Movies.find({
                $or: [
                    { title: { $regex: baseRegex } },
                    { title: { $regex: startsWithRegex } },
                    { tags: { $in: splitQuery } },
                    { searchKeywords: { $regex: fuzzyRegex } },
                    { castDetails: { $regex: fuzzyRegex } },
                    ...(isNaN(releaseYear) ? [] : [{ releaseYear }])
                ]
            })
                .select(selectFields + ' tags')
                .lean()

            phase3.forEach(m => uniqueMap.set(m.imdbId, m));
        }

        // Convert to array
        results = Array.from(uniqueMap.values());

        // Phase 4: Rank the results
        const rankedResults = results.map(data => ({
            data,
            score: calculateScore(data, cleanedQuery, splitQuery)
        }))
            .sort((a, b) => b.score - a.score)
            .map(r => r.data);

        // Final cleanup (remove tags, apply pagination)
        const finalResults = rankedResults
            .slice(skip, skip + limit)
            .map(({ tags, ...rest }) => rest);

        res.status(200).json({
            moviesData: finalResults,
            endOfData: finalResults.length < limit,
        });

    } catch (error) {
        console.error("Error in searchHandler:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
