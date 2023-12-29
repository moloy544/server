import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import Actress from "../../models/Actress.Model.js";

const router = Router();

//Get Movies By Category Listing
router.post('/', async (req, res) => {

  try {

    const selectValue = "title  thambnail releaseYear";

    const { offset } = req.body;

    const offsetNumber = Number(offset);

    if (offsetNumber === 1) {

      const latestYear = 2023;

      const [latestMovies, bollywoodMovies, southMovies, topActressData] = await Promise.all([
        // Hollywood release movies
        Movies.find({
          category: 'hollywood',
          releaseYear: latestYear,
          type: 'movie'
        }).limit(20).select(selectValue).lean().exec(),

        // Bollywood latest release movies
        Movies.find({
          category: 'bollywood',
          releaseYear: latestYear,
          type: 'movie'
        }).limit(20).select(selectValue).lean().exec(),

        // South latest release movies
        Movies.find({
          category: 'south',
          releaseYear: latestYear,
          type: 'movie'
        }).limit(20).select(selectValue).lean().exec(),

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
        Movies.find({ genre: { $in: ['Romance'] } }).limit(20).select(selectValue).lean().exec(),
        //Action movies
        Movies.find({ genre: { $in: ['Action'] } }).limit(20).select(selectValue).lean().exec(),
        //Thriller movies
        Movies.find({ genre: { $in: ['Thriller'] } }).limit(20).select(selectValue).lean().exec(),
      ]);

      const secondSectionData = {
        sliderMovies: [
          {
            title: 'Romance movies',
            linkUrl: 'listing/category/romance',
            movies: romanceMovies
          },
          {
            title: 'Action movies',
            linkUrl: 'listing/category/action',
            movies: actionMovies
          },
          {
            title: 'Thriller movies',
            linkUrl: 'listing/category/thriller',
            movies: thrillerMovies
          },
        ]
      };

      return res.status(200).json({ secondSectionData });

    } else if (offsetNumber === 3) {

      const [comedyMovies, horrorMovies, animationMovies] = await Promise.all([
        //Comedy movies
        Movies.find({ genre: { $in: ['Comedy'] } }).limit(20).select(selectValue).lean().exec(),
        //Horror movies
        Movies.find({ genre: { $in: ['Horror'] } }).limit(20).select(selectValue).lean().exec(),
        //Horror movies
        Movies.find({ genre: { $in: ['Animation'] } }).limit(20).select(selectValue).lean().exec(),
      ]);

      const thirdSectionData = {
        sliderMovies: [
          {
            title: 'Comedy movies',
            linkUrl: 'listing/category/comedy',
            movies: comedyMovies
          },
          {
            title: 'Horror movies',
            linkUrl: 'listing/category/horror',
            movies: horrorMovies
          },
          {
            title: 'Animation movies',
            linkUrl: 'listing/category/animation',
            movies: animationMovies
          },
        ]
      };

      return res.status(200).json({ thirdSectionData })

    } else {

      return res.status(400).json({ message: 'Invalid offset parameter' });
    }

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;