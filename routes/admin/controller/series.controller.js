import SeriesEpisode from "../../../models/Series.Model.js";

export async function AddSeries(req, res) {

    try {

        const { imdbId, data, title } = req.body;

        if (!imdbId || !data) {
            return res.status(400).json({ message: "imdbId and data are required." });
        }

        // Check if this series already exists
        const exists = await SeriesEpisode.findOne({ imdbId });

        if (exists) {
            return res.status(409).json({ message: "Series already exists." });
        }

        // Create new entry
        const newSeries = await SeriesEpisode.create({ imdbId, title, data });

        return res.status(201).json({ message: "Series added successfully", series: newSeries });
    } catch (error) {
        console.error("Add series error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
