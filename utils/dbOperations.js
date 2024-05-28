/*** get data from mongodb between provided months or days ***/
export function getDataBetweenDate({ type = 'months', value }) {
    const currentDate = new Date();
    const fromDate = new Date();

    if (type === 'months') {
        fromDate.setMonth(currentDate.getMonth() - value);
    } else if (type === 'days') {
        fromDate.setDate(currentDate.getDate() - value);
    } else {
        throw new Error('Please specify "months" or "days".');
    }

    return {
        $gte: fromDate,
        $lte: currentDate
    };
};

/*** Creat filter conditions for db query ***/
export const createQueryConditionFilter = ({ query = {}, filter = {} }) => {

    // Check if "queryCondition" and "filterData" are provided
    if (!query || !filter) {
        throw new Error('Please specify "queryCondition" or "filterData"');

    };

    const { genre, type, industry, provider } = filter;

    // Create an empty object to store the query condition filter
    const queryConditionFilter = { ...query };

    // Filter by genre
    if (genre && genre !== "all") {

        queryConditionFilter.genre = { $in: genre }
    };

    // Filter by industry
    if (industry) {
        queryConditionFilter.category = industry;
    };

    // Filter by type
    if (type) {
        queryConditionFilter.type = type;
    };

    // Filter by provider
    if (provider) {
        queryConditionFilter.tags = { $in: provider };
    };

    return queryConditionFilter

};

/*** Creat sort conditions for db sort data oparation ***/
export const createSortConditions = ({ filterData = {}, query = {} }) => {

    // Check if "queryCondition" and "filterData" are provided
    if (!filterData || !query) {
        throw new Error('Please specify "query conditions" and "sortData" both');

    };

    // extract the sort values from filter data
    const { dateSort, ratingSort } = filterData;

    const sortCondition = {};

    // sort by imdb rating
    if (ratingSort) {
        sortCondition.imdbRating = ratingSort;
    };

    // sort by any dates fields manupulations
    if (dateSort) {

        // if date sort is recent added so show recently under 20 days data
        if (dateSort === "recent added") {
            sortCondition.createdAt = -1;
            query.createdAt = {
                $exists: true,
                ...getDataBetweenDate({ type: 'days', value: 20 })
            };
        } else if (typeof dateSort === "number") {
            sortCondition.releaseYear = dateSort;
            sortCondition.fullReleaseDate = dateSort;
        }
    };
    return sortCondition;

};
