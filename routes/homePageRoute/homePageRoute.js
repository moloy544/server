import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import Actress from "../../models/Actress.Model.js";

const router = Router();

//Get Movies By Category Listing
router.get('/', async (req, res) => {

    try {
      
        const { offset } = req.query;

        const offsetNumber = Number(offset);
    
        if (offsetNumber === 1) {

          const latestYear = 2023;
    
          const [latestMovies, bollywoodMovies, southMovies, topActressData] = await Promise.all([
            // Hollywood release movies
            Movies.find({
              category: 'hollywood',
              releaseYear: latestYear,
              type: 'movie'
            }).limit(20).lean().exec(),
    
            // Bollywood latest release movies
            Movies.find({
              category: 'bollywood',
              releaseYear: latestYear,
              type: 'movie'
            }).limit(20).lean().exec(),
    
            // South latest release movies
            Movies.find({
              category: 'south',
              releaseYear: latestYear,
              type: 'movie'
            }).limit(20).lean().exec(),

            Actress.find({}),

          ]);
    
          const allData = { latestMovies, bollywoodMovies, southMovies, topActressData };
    
          return res.status(200).json(allData);

        } else {

          return res.status(400).json({ message: 'Invalid offset parameter' });
        }

      } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
});

export default router;