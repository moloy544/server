import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import Actress from "../../models/Actress.Model.js";

const router = Router();

const selectValue = "title thambnail releaseYear type";

const latestInCategoryListing = (category) => {

  const data = Movies.find({
    category,
    releaseYear: 2023,
    type: 'movie'
  }).sort({ fullReleaseDate: -1, _id: 1 })
    .limit(30).select(selectValue).lean().exec()

  return data;
};

const genreListing = (genres) => {
  const data = Movies.find({ genre: { $all: genres } })
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

      const [latestMovies, bollywoodMovies, southMovies, topActressData] = await Promise.all([

        // Hollywood release movies
        latestInCategoryListing('hollywood'),

        // Bollywood latest release movies
        latestInCategoryListing('bollywood'),

        // South latest release movies
        latestInCategoryListing('south'),

        Actress.find({}),

      ]);

      const firstSectionData = {

        sliderMovies: [
          {
            title: 'Hollywood latest movies',
            linkUrl: 'listing/category/hollywood',
            moviesData: latestMovies
          },
          {
            title: 'Bollywood latest movies',
            linkUrl: 'listing/category/bollywood ',
            moviesData: bollywoodMovies
          },
          {
            title: 'South latest movies',
            linkUrl: 'listing/category/south',
            moviesData: southMovies
          }
        ],
        topActressData
      }

      return res.status(200).json({ firstSectionData });

    } else if (offsetNumber === 2) {


      const [romanceMovies, actionMovies, thrillerMovies] = await Promise.all([
        //Romance movies
        genreListing(['Romance']),
        //Action movies
        genreListing(['Action']),
        //Thriller movies
        genreListing(['Thriller'])

      ]);

      const secondSectionData = {
        sliderMovies: [
          {
            title: 'Romance movies',
            linkUrl: 'listing/genre/romance',
            movies: romanceMovies
          },
          {
            title: 'Action movies',
            linkUrl: 'listing/genre/action',
            movies: actionMovies
          },
          {
            title: 'Thriller movies',
            linkUrl: 'listing/genre/thriller',
            movies: thrillerMovies
          },
        ]
      };

      return res.status(200).json({ secondSectionData });

    } else if (offsetNumber === 3) {

      const [comedyMovies, horrorMovies, familyMovies] = await Promise.all([

        //Comedy movies
        genreListing(['Comedy']),
        //Horror movies
        genreListing(['Horror']),
        //Family movies
        genreListing(['Family']),

      ]);

      const thirdSectionData = {
        sliderMovies: [
          {
            title: 'Comedy movies',
            linkUrl: 'listing/genre/comedy',
            movies: comedyMovies
          },
          {
            title: 'Horror movies',
            linkUrl: 'listing/genre/horror',
            movies: horrorMovies
          },
          {
            title: 'Family movies',
            linkUrl: 'listing/genre/family',
            movies: familyMovies
          },
        ]
      };

      return res.status(200).json({ thirdSectionData })

    } else if (offsetNumber === 4) {

      const [animationMovies] = await Promise.all([

        //Family movies
        genreListing(['Animation']),

      ]);

      const forthSectionData = {
        sliderMovies: [

          {
            title: 'Animation movies',
            linkUrl: 'listing/genre/animation',
            movies: animationMovies
          },
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