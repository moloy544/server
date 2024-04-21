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