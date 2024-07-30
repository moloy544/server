import { Router } from "express";
import { AppUpdate } from "../../models/Admin.Model.js";

const router = Router();

//get watch later movies route
router.post('/check_update', async (req, res) => {
    try {

        const { version } = req.body;

        if (!version) {
            return res.status(400).json({ message: "For app update check version is required" });
        };

        const response = {
            isUpdated: true,
        };

        const checkNewUpdate = await AppUpdate.findOne({}).sort({ releaseDate: -1 }).select('-_id');
        if (checkNewUpdate.version !== version) {
            response.isUpdated = false;
            response.newVersionInfo = checkNewUpdate;
        };

        res.json(response);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error while app update check" });
    }
});

export default router;