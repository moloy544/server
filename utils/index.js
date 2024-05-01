export const transformToCapitalize = (text) => {

  // Split the text into an array of words
  const words = text?.split('-');

  // Capitalize the first letter of each word and join them with a space
  const capitalizedWords = words?.map(word => {
    return word?.charAt(0).toUpperCase() + word.slice(1);
  });

  // Join the words with a space and return the result
  return capitalizedWords?.join(' ');
};

//get data from mongodb between provided months or days
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

//creat filter conditions
export const createQueryConditionFilter = ({ query, filter }) => {

  // Check if "queryCondition" and "filterData" are provided
  if (!query || !filter) {
    throw new Error('Please specify "queryCondition" or "filterData"');

  };

  const { genre, type, industry, provider } = filter || {};

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