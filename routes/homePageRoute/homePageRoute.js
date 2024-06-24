import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import Actress from "../../models/Actress.Model.js";

const router = Router();

const initialSelectValue = "-_id imdbId title thambnail releaseYear type";

const initialLimit = 30;

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
      .select(initialSelectValue);

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
      .select(initialSelectValue);

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
      
      // this all selected actress show in home landig page layout
      const selectedActress = [
        "Ranbir Kapoor", "Shah Rukh Khan", "Ayushmann Khurrana", 
        "Kriti Sanon", "Kiara Advani", "Shahid Kapoor", 
        "Katrina Kaif", "Shraddha Kapoor", "Deepika Padukone", "Kartik Aaryan", 
        "Ranveer Singh", "Anushka Sharma", "Akshay Kumar", "Varun Dhawan", "Vicky Kaushal", 
        "Aamir Khan", "Salman Khan", "Ajay Devgn", "Madhuri Dixit", "Bhumi Pednekar"]

      const [
        recentlyAddedMovies,
        latestHollywoodMovies,
        latestBollywoodMovies,
        latestSouthMovies,
        bollywoodActressData,
        comingSoonMovies
      ] = await Promise.all([

        //Recently added movies 
        Movies.find({
          status: 'released',
          createdAt: { $exists: true },
          tags: { $nin: ['Cartoons'] },
        }).sort({ createdAt: -1 }).limit(initialLimit).select(initialSelectValue),

        // Hollywood release movies
        latestInCategoryListing('hollywood'),

        // Bollywood latest release movies
        latestInCategoryListing('bollywood', 'bengali'),

        // South latest release movies
        latestInCategoryListing('south'),

        Actress.find({ industry: 'bollywood', name:{$in: selectedActress} })
        .limit(initialLimit).select('-_id imdbId name avatar industry').sort({_id: 1}),

        //Coming soon movies
        Movies.find({ status: 'coming soon' })
          .sort({ releaseYear: 1, fullReleaseDate: 1 })
          .limit(initialLimit).select(initialSelectValue)
      ]);

      const sectionOneAllData = {

        sliderMovies: [
          {
            title: 'Recently Added',
            linkUrl: recentlyAddedMovies?.length >= initialLimit ? '/browse/recently-added' : null,
            moviesData: recentlyAddedMovies
          },
          {
            title: 'Hollywood latest release',
            linkUrl: 'browse/latest/hollywood',
            moviesData: latestHollywoodMovies
          },
          {
            title: 'Bollywood latest release',
            linkUrl: 'browse/latest/bollywood',
            moviesData: latestBollywoodMovies
          },
          {
            title: 'South latest release',
            linkUrl: 'browse/latest/south',
            moviesData: latestSouthMovies
          },
          {
            title: 'Upcoming movies',
            linkUrl: comingSoonMovies?.length >= initialLimit ? 'browse/category/coming-soon' : null,
            moviesData: comingSoonMovies
          },
        ],
        bollywoodActressData
      }

      return res.status(200).json({ sectionOne: sectionOneAllData });

    } else if (offsetNumber === 2) {

      const [
        topImbdRatingMovies,
        seriesList,
        romanceMovies,
        actionMovies,

      ] = await Promise.all([

        //Top IMDB Rated Movies Listing
        Movies.find({ imdbRating: { $gt: 7 }, type: 'movie' })
          .sort({ imdbRating: -1, _id: 1 })
          .select(initialSelectValue).limit(initialLimit),

        //Series Listing
        Movies.find({ type: 'series' })
          .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
          .select(initialSelectValue).limit(initialLimit),

        //Romance movies
        genreListing({
          inGenres: ['Romance']
        }),
        //Action movies
        genreListing({
          inGenres: ['Action']
        }),
      ]);

      const sectionTwoAllData = {
        sliderMovies: [
          {
            title: 'Watch latest series',
            linkUrl: '/series',
            movies: seriesList
          },
          {
            title: 'Top IMDB rated movies',
            linkUrl: 'browse/top-rated',
            movies: topImbdRatingMovies
          },
          {
            title: 'Romance collections',
            linkUrl: 'browse/genre/romance',
            movies: romanceMovies
          },
          {
            title: 'Action collections',
            linkUrl: 'browse/genre/action',
            movies: actionMovies
          }
        ]
      };

      return res.status(200).json({ sectionTwo: sectionTwoAllData });

    } else if (offsetNumber === 3) {

      const [
        thrillerMovies,
        comedyMovies,
        horrorMovies,
        familyMovies,
        forKidsMovies,
      ] = await Promise.all([

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
        //Family movies
        genreListing({
          inGenres: ['Family']
        }),
      ]);

      const sectionThreeAllData = {
        sliderMovies: [

          {
            title: 'Thriller collections',
            linkUrl: 'browse/genre/thriller',
            movies: thrillerMovies
          },

          {
            title: 'Comedy collections',
            linkUrl: 'browse/genre/comedy',
            movies: comedyMovies
          },
          {
            title: 'Horror collections',
            linkUrl: 'browse/genre/horror',
            movies: horrorMovies
          },
          {
            title: 'Watch with family',
            linkUrl: 'browse/genre/family',
            movies: familyMovies
          }
        ]
      };

      return res.status(200).json({ sectionThree: sectionThreeAllData })

    } else if (offsetNumber === 4) {

      const [
        forKidsMovies,
        scienceFictionMovies,
        crimeMovies
      ] = await Promise.all([

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

      const sectionFourAllData = {
        sliderMovies: [
          {
            title: 'Special for kids',
            linkUrl: 'browse/genre/animation',
            movies: forKidsMovies
          },
          {
            title: 'Science Fiction collections',
            linkUrl: 'browse/genre/sci-fi',
            movies: scienceFictionMovies
          },
          {
            title: 'Crime collections',
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
