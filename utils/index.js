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

export function getDataBetweenMonth(month) {
  const currentDate = new Date();
  const fromDate = new Date();
  fromDate.setMonth(currentDate.getMonth() - month);

  return {
      $gte: fromDate,
      $lte: currentDate
  };
}

