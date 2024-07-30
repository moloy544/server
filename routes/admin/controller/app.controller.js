import { AppUpdate } from "../../../models/Admin.Model.js";

const isEmptyObject = (obj) => {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
};

export async function newAppUpdateRelease(req, res) {
    try {

        const updateData = req.body;

        if (!updateData || isEmptyObject(updateData)) {
            return res.status(400).json({ message: "Update data is required" });
        };

        const { title, description, downloadLink, version } = updateData || {};

        if (!title ||!description ||!downloadLink ||!version) {
            return res.status(400).json({ message: "Missing fields found. all fields are required." });
        };

        if (!downloadLink.startsWith('https://')) {
            return res.status(400).json({ message: "Invalid new updated app release link." });
        };

        const findDoc = await AppUpdate.findOne({ version }).select('version');
        
        if (findDoc) {
            return res.status(400).json({ message: "Version already exists", findDoc });
        };

        const updateDetails = {
            version,
            updateLink: downloadLink,
            updateInfo: description,
            updateTitle: title,
        };
        const newDocument = new AppUpdate(updateDetails);
        await newDocument.save();
        return res.json({ message: "New app update release successfull", details: newDocument });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error while add new app update release' });
    };
}