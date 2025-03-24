import { Reports } from "../../../models/Users.Model";

export async function getUserReportsContent(req, res) {
    try {

        const { limit = 40, page, skip } = req.body;

        

        const reportsData = await Reports.find({}).select()
            .skip(skip).limit(limit)
            .select(selectValue)
            .sort({ ...sortFilterCondition, _id: 1 }).lean();

        if (!moviesData.length) {
            return res.status(404).json({ message: "No movies found in this category" });
        };

        const endOfData = (moviesData.length < limit - 1);

        // creat initial response data add more responses data as needed
        const response = { moviesData, endOfData: endOfData };

        // initial filterOption need
        const filteOptionsNeeded = ['genre', 'type'];

        if (queryData === "new release" || queryData === "movies" && page && page === 1) {
            // check is query is movies so remove type from filter options
            if (queryData === "movies") {
                filteOptionsNeeded.pop()
            }

            filteOptionsNeeded.push('industry');
        };
        // if page is 1 then generate filter options
        if (page && page === 1) {
            response.filterOptions = await genarateFilters({
                query: queryCondition,
                filterNeed: filteOptionsNeeded
            })
        };

        return res.status(200).json(response);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
}