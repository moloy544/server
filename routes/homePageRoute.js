import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import Actors from "../models/Actors.Model.js";

const router = Router();

const initialSelectValue = "-_id imdbId title thambnail releaseYear type";

const initialLimit = 20;

const latestInCategoryListing = async (category, notInLanguage) => {
  try {

    const queryCondition = {
      category,
      releaseYear: [2024, 2023],
      tags: { $nin: ['Cartoons'] },
      status: 'released'
    }
    if (notInLanguage) {
      queryCondition.language = { $nin: notInLanguage };
    }

    const data = await Movies.find(queryCondition)
      .sort({ releaseYear: -1, fullReleaseDate: -1 })
      .limit(initialLimit)
      .select(initialSelectValue).lean();

    return data;

  } catch (error) {
    console.error(error);
    return null
  }
};

const genreListing = async ({ inGenres, notInGenres = ['Animation'] }) => {

  try {
    const queryCondition = { $all: inGenres };

    if (inGenres?.[0] !== 'Animation') {
      queryCondition.$nin = notInGenres
    }
    const data = await Movies.find({ genre: queryCondition, type: 'movie', imdbRating: { $gt: 6 } })
      .limit(initialLimit)
      .select(initialSelectValue).lean();

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
    let dataIsEnd = false;

    if (offsetNumber === 1) {

      const [
        recentlyAddedMovies,
        latestHollywoodMovies,
        latestBollywoodMovies,
        latestSouthMovies,
      ] = await Promise.all([

        //Recently added movies 
        Movies.find({
          status: 'released',
          createdAt: { $exists: true },
          tags: { $nin: ['Cartoons'] },
        }).sort({ createdAt: -1 }).limit(initialLimit).select(initialSelectValue).lean(),

        // Hollywood release movies
        latestInCategoryListing('hollywood'),

        // Bollywood latest release movies
        latestInCategoryListing('bollywood', 'bengali'),

        // South latest release movies
        latestInCategoryListing('south'),

      ]);

      const sliderMovies = [
        {
          title: 'Recently Added & Updated',
          linkUrl: recentlyAddedMovies?.length >= initialLimit ? '/browse/recently-added' : null,
          movies: recentlyAddedMovies
        },
        {
          title: 'Hollywood latest release',
          linkUrl: '/browse/latest/hollywood',
          movies: latestHollywoodMovies
        },
        {
          title: 'Bollywood latest release',
          linkUrl: '/browse/latest/bollywood',
          movies: latestBollywoodMovies
        },
        {
          title: 'South latest release',
          linkUrl: '/browse/latest/south',
          movies: latestSouthMovies
        },
      ];

      return res.status(200).json({ sliderMovies, dataIsEnd });

    } else if (offsetNumber === 2) {

      // this all selected actress show in home landig page layout
      const selectedActress = [
        "Ranbir Kapoor", "Shah Rukh Khan", "Ayushmann Khurrana",
        "Kriti Sanon", "Kiara Advani", "Shahid Kapoor",
        "Katrina Kaif", "Shraddha Kapoor", "Deepika Padukone", "Kartik Aaryan",
        "Ranveer Singh", "Anushka Sharma", "Akshay Kumar", "Varun Dhawan", "Vicky Kaushal",
        "Aamir Khan", "Salman Khan", "Ajay Devgn", "Madhuri Dixit", "Bhumi Pednekar"].map(name => name.toLowerCase());

      const [
        comingSoonMovies,
        bollywoodActorsData,
        southActorsData,
        topImbdRatingMovies,
        seriesList,
        romanceMovies,
      ] = await Promise.all([
         //Coming soon movies
         Movies.find({ status: 'coming soon' })
         .sort({ releaseYear: 1, fullReleaseDate: 1 })
         .limit(initialLimit).select(initialSelectValue).lean(),

        // bollywood hindi actors
        Actors.find({ industry: 'bollywood', name: { $in: selectedActress } })
          .limit(initialLimit).select('-_id imdbId name avatar industry').sort({ _id: 1 }).lean(),

        // south actors
        Actors.find({ industry: 'south' })
          .limit(initialLimit).select('-_id imdbId name avatar industry').sort({ _id: 1 }).lean(),

        //Top IMDB Rated Movies Listing
        Movies.find({ imdbRating: { $gt: 7 }, type: 'movie' })
          .sort({ imdbRating: -1, _id: 1 })
          .select(initialSelectValue).limit(initialLimit).lean(),

        //Series Listing
        Movies.find({ type: 'series' })
          .sort({ releaseYear: -1, fullReleaseDate: -1 })
          .select(initialSelectValue).limit(initialLimit).lean(),

        //Romance movies
        genreListing({
          inGenres: ['Romance']
        }),

      ]);

      const sliderActors = [{
        title: 'Movies by bollywood actors',
        linkUrl: bollywoodActorsData.length === initialLimit ? '/actors/bollywood' : null,
        actors: bollywoodActorsData
      }, {
        title: 'Movies by south actors',
        linkUrl: southActorsData.length === initialLimit ? '/actors/south' : null,
        actors: southActorsData
      }];

      const sliderMovies = [
        {
          title: 'Upcoming movies',
          linkUrl: comingSoonMovies?.length >= initialLimit ? '/browse/category/coming-soon' : null,
          movies: comingSoonMovies
        },
        {
          title: 'Watch latest series',
          linkUrl: '/series',
          movies: seriesList
        },
        {
          title: 'Top IMDB rated movies',
          linkUrl: '/browse/top-rated',
          movies: topImbdRatingMovies
        },
        {
          title: 'Romance collections',
          linkUrl: '/browse/genre/romance',
          movies: romanceMovies
        }
      ];

      return res.status(200).json({ sliderActors, sliderMovies, dataIsEnd });

    } else if (offsetNumber === 3) {

      const [
        actionMovies,
        thrillerMovies,
        comedyMovies,
        horrorMovies,
      ] = await Promise.all([

        //Action movies
        genreListing({
          inGenres: ['Action']
        }),

        //Thriller movies
        genreListing({
          inGenres: ['Thriller']
        }),

        //Comedy movies
        genreListing({
          inGenres: ['Comedy']
        }),
        //Horror movies
        genreListing({
          inGenres: ['Horror']
        }),
      ]);

      const sliderMovies = [
        {
          title: 'Action collections',
          linkUrl: '/browse/genre/action',
          movies: actionMovies
        },

        {
          title: 'Thriller collections',
          linkUrl: '/browse/genre/thriller',
          movies: thrillerMovies
        },

        {
          title: 'Comedy collections',
          linkUrl: '/browse/genre/comedy',
          movies: comedyMovies
        },
        {
          title: 'Horror collections',
          linkUrl: '/browse/genre/horror',
          movies: horrorMovies
        },
      ];

      return res.status(200).json({ sliderMovies, dataIsEnd })

    } else if (offsetNumber === 4) {

      const [
        familyMovies,
        forKidsMovies,
        scienceFictionMovies,
        crimeMovies
      ] = await Promise.all([

        //Family movies
        genreListing({
          inGenres: ['Family']
        }),

        //For kids movies in animation
        genreListing({
          inGenres: ['Animation'],
        }),

        genreListing({
          inGenres: ['Sci-Fi'],
        }),
        //Crime movies
        genreListing({
          inGenres: ['Crime'],
        })
      ]);

      const sliderMovies = [
        {
          title: 'Watch with family',
          linkUrl: '/browse/genre/family',
          movies: familyMovies
        },
        {
          title: 'Special for kids',
          linkUrl: '/browse/genre/animation',
          movies: forKidsMovies
        },
        {
          title: 'Science Fiction collections',
          linkUrl: '/browse/genre/sci-fi',
          movies: scienceFictionMovies
        },
        {
          title: 'Crime collections',
          linkUrl: '/browse/genre/crime',
          movies: crimeMovies
        }
      ];
      dataIsEnd = true;
      return res.status(200).json({ sliderMovies, dataIsEnd })

    } else {

      return res.status(400).json({ message: 'Invalid offset parameter' });
    }

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
