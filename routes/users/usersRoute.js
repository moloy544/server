import { Router } from "express";
import Reports from "../../models/Reports.Model.js";

const router = Router();

router.post('/action/report', async (req, res) => {
    try {

        const { reportData } = req.body;

        const newReport = new Reports(reportData);

        const saveReport = await newReport.save();

        if (saveReport) {

        return res.status(200).json({ message: 'Report successfull', saveReport });

        }else{

            return res.status(500).json({ message: 'Report is not success' });   
        };

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;