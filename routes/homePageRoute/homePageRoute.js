import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import Actress from "../../models/Actress.Model.js";

const router = Router();

const selectValue = "imdbId title thambnail releaseYear type";

const latestInCategoryListing = async (category, notInLanguage) => {
  try {

    const queryCondition = {
      category,
      type: 'movie',
      releaseYear: [2024, 2023],
      genre: { $nin: ['Animation'] },
      status: 'released'
    }
    if (notInLanguage) {
      queryCondition.language = { $nin: notInLanguage };
    }
    const data = await Movies.find(queryCondition)
      .sort({ releaseYear: -1, fullReleaseDate: -1 })
      .limit(15)
      .select(selectValue);

    return data;

  } catch (error) {
    console.error(error);
    return null
  }
};

const genreListing = async ({ inGenres, notInGenres = ['Animation'] }) => {

  try {
    const queryCondition = { $all: inGenres };

    if (notInGenres && notInGenres?.length > 0) {
      queryCondition.$nin = notInGenres
    }
    const data = await Movies.find({ genre: queryCondition, type: 'movie', imdbRating: { $gt: 5 } })
      .limit(15)
      .select(selectValue);

    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

//Get Movies By Category Listing
router.post('/', async (req, res) => {

  try {

    const { offset } = req.body;

    const offsetNumber = Number(offset);

    if (offsetNumber === 1) {

      const [
        latestHollywoodMovies,
        latestBollywoodMovies,
        latestSouthMovies,
        bollywoodActressData,
        comingSoonMovies
      ] = await Promise.all([

        // Hollywood release movies
        latestInCategoryListing('hollywood'),

        // Bollywood latest release movies
        latestInCategoryListing('bollywood', 'bengali'),

        // South latest release movies
        latestInCategoryListing('south'),

        Actress.find({ industry: 'bollywood' }).limit(15).select('-_id imdbId name avatar industry'),

        //Coming soon movies
        Movies.find({ status: 'coming soon' }).limit(15).select(selectValue)
      ]);

      const sectionOneAllData = {

        sliderMovies: [
          {
            title: 'Hollywood latest movies',
            linkUrl: 'browse/latest/hollywood',
            moviesData: latestHollywoodMovies
          },
          {
            title: 'Bollywood latest movies',
            linkUrl: 'browse/latest/bollywood',
            moviesData: latestBollywoodMovies
          },
          {
            title: 'South latest movies',
            linkUrl: 'browse/latest/south',
            moviesData: latestSouthMovies
          },
          {
            title: 'Upcoming movies',
            linkUrl: 'browse/category/coming-soon',
            moviesData: comingSoonMovies
          },
        ],
        bollywoodActressData
      }

      return res.status(200).json({ sectionOne: sectionOneAllData });

    } else if (offsetNumber === 2) {

      const [
        topImbdRatingMovies,
        romanceMovies,
        actionMovies,
        thrillerMovies
      ] = await Promise.all([

        //Top IMDB Rated Movies Listing
        Movies.find({ imdbRating: { $gt: 7 }, type: 'movie' })
          .sort({ imdbRating: -1, _id: 1 })
          .select(selectValue).limit(15),

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

      const sectionTwoAllData = {
        sliderMovies: [
          {
            title: 'Top IMDB rated movies',
            linkUrl: 'browse/top-rated',
            movies: topImbdRatingMovies
          },
          {
            title: 'Romance movies',
            linkUrl: 'browse//genre/romance',
            movies: romanceMovies
          },
          {
            title: 'Action movies',
            linkUrl: 'browse/genre/action',
            movies: actionMovies
          },
          {
            title: 'Thriller movies',
            linkUrl: 'browse/genre/thriller',
            movies: thrillerMovies
          }
        ]
      };

      return res.status(200).json({ sectionTwo: sectionTwoAllData });

    } else if (offsetNumber === 3) {

      const [
        comedyMovies,
        horrorMovies,
        familyMovies,
        forKidsMovies,
      ] = await Promise.all([

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
        }),

        //For kids movies and 
        genreListing({
          inGenres: ['Animation'],
          notInGenres: []
        })

      ]);

      const sectionThreeAllData = {
        sliderMovies: [
          {
            title: 'Comedy movies',
            linkUrl: 'browse/genre/comedy',
            movies: comedyMovies
          },
          {
            title: 'Horror movies',
            linkUrl: 'browse/genre/horror',
            movies: horrorMovies
          },
          {
            title: 'Watch with family',
            linkUrl: 'browse/genre/family',
            movies: familyMovies
          },
          {
            title: 'Special for kids',
            linkUrl: 'browse/genre/animation',
            movies: forKidsMovies
          },
        ]
      };

      return res.status(200).json({ sectionThree: sectionThreeAllData })

    } else if (offsetNumber === 4) {

      const [
        scienceFictionMovies,
        crimeMovies
      ] = await Promise.all([

        genreListing({
          inGenres: ['Sci-Fi'],
          notInGenres: []
        }),
        //Crime movies
        genreListing({
          inGenres: ['Crime'],
          notInGenres: []
        })
      ]);

      const sectionFourAllData = {
        sliderMovies: [
          {
            title: 'Science Fiction movies',
            linkUrl: 'browse/genre/sci-fi',
            movies: scienceFictionMovies
          },
          {
            title: 'Crime movies',
            linkUrl: 'browse/genre/crime',
            movies: crimeMovies
          }
        ]
      };

      return res.status(200).json({ sectionFour: sectionFourAllData })

    } else {

      return res.status(400).json({ message: 'Invalid offset parameter' });
    }

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
