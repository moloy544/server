import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import Actress from "../../models/Actress.Model.js";

const router = Router();

const selectValue = "title thambnail releaseYear type";

const latestInCategoryListing = (category) => {

  const data = Movies.find({
    category,
    type: 'movie',
    genre: { $nin: ['Animation'] },
  }).sort({ releaseYear: -1, fullReleaseDate: -1 })
    .limit(30).select(selectValue).lean().exec()

  return data;
};

const genreListing = ({ inGenres, notInGenres = ['Animation'] }) => {

  const queryCondition = { $all: inGenres };

  if (notInGenres && notInGenres?.length > 0) {
    queryCondition.$nin = notInGenres
  }
  const data = Movies.find({ genre: queryCondition })
    .limit(30).select(selectValue)
    .lean().exec();

  return data;
};

//Get Movies By Category Listing
router.post('/', async (req, res) => {

  try {

    const { offset } = req.body;

    const offsetNumber = Number(offset);

    if (offsetNumber === 1) {

      const [latestHollywoodMovies, latestBollywoodMovies, latestSouthMovies, bollywoodActressData] = await Promise.all([

        // Hollywood release movies
        latestInCategoryListing('hollywood'),

        // Bollywood latest release movies
        latestInCategoryListing('bollywood'),

        // South latest release movies
        latestInCategoryListing('south'),

        Actress.find({ industry: 'bollywood' }).limit(15),

      ]);

      const firstSectionData = {

        sliderMovies: [
          {
            title: 'Hollywood latest movies',
            linkUrl: 'movies/category/hollywood',
            moviesData: latestHollywoodMovies
          },
          {
            title: 'Bollywood latest movies',
            linkUrl: 'movies/category/bollywood',
            moviesData: latestBollywoodMovies
          },
          {
            title: 'South latest movies',
            linkUrl: 'movies/category/south',
            moviesData: latestSouthMovies
          }
        ],
        bollywoodActressData
      }

      return res.status(200).json({ firstSectionData });

    } else if (offsetNumber === 2) {


      const [romanceMovies, actionMovies, thrillerMovies] = await Promise.all([

        //Romance movies
        genreListing({
          inGenres: ['Romance']
        }),
        //Action movies
        genreListing({
          inGenres: ['Action']
        }),
        //Thriller movies
        genreListing({
          inGenres: ['Thriller']
        })

      ]);

      const secondSectionData = {
        sliderMovies: [
          {
            title: 'Romance movies',
            linkUrl: 'movies/genre/romance',
            movies: romanceMovies
          },
          {
            title: 'Action movies',
            linkUrl: 'movies/genre/action',
            movies: actionMovies
          },
          {
            title: 'Thriller movies',
            linkUrl: 'movies/genre/thriller',
            movies: thrillerMovies
          },
        ]
      };

      return res.status(200).json({ secondSectionData });

    } else if (offsetNumber === 3) {

      const [comedyMovies, horrorMovies, familyMovies, forKidsMovies] = await Promise.all([

        //Comedy movies
        genreListing({
          inGenres: ['Comedy']
        }),
        //Horror movies
        genreListing({
          inGenres: ['Horror']
        }),
        //Family movies
        genreListing({
          inGenres: ['Family']
        })

      ]);

      const thirdSectionData = {
        sliderMovies: [
          {
            title: 'Comedy movies',
            linkUrl: 'movies/genre/comedy',
            movies: comedyMovies
          },
          {
            title: 'Horror movies',
            linkUrl: 'movies/genre/horror',
            movies: horrorMovies
          },
          {
            title: 'Watch with family',
            linkUrl: 'movies/genre/family',
            movies: familyMovies
          }
        ]
      };

      return res.status(200).json({ thirdSectionData })

    } else if (offsetNumber === 4) {

      const [forKidsMovies, scienceFictionMovies] = await Promise.all([

        //For kids movies and 
        genreListing({
          inGenres: ['Animation'],
          notInGenres: []
        }),
        genreListing({
          inGenres: ['Sci-Fi'],
          notInGenres: []
        }),

      ]);

      const forthSectionData = {
        sliderMovies: [
          {
            title: 'Special for kids',
            linkUrl: 'movies/genre/animation',
            movies: forKidsMovies
          },
          {
            title: 'Science Fiction movies',
            linkUrl: 'movies/genre/sci-fi',
            movies: scienceFictionMovies
          }
        ]
      };

      return res.status(200).json({ forthSectionData })

    } else {

      return res.status(400).json({ message: 'Invalid offset parameter' });
    }

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;