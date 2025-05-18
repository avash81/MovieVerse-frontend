//jsx
// src/components/Category.jsx: Placeholder for category page
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

function Category({ watchlist, addToWatchlist, removeFromWatchlist }) {
  const { type, value } = useParams();
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    // Placeholder: Fetch category movies from backend (e.g., /api/movies/tmdb/search/:query)
    setMovies([
      { id: '1', title: `Sample ${value} Movie`, poster_path: '/sample.jpg' },
    ]);
  }, [type, value]);

  return (
    <div className="category">
      <h2>{value} Movies</h2>
      <div className="movie-list">
        {movies.map((movie) => (
          <div key={movie.id} className="movie-card">
            <img src={movie.poster_path} alt={movie.title} />
            <h3>{movie.title}</h3>
            {watchlist.some((m) => m.id === movie.id) ? (
              <button onClick={() => removeFromWatchlist(movie.id)}>Remove from Watchlist</button>
            ) : (
              <button onClick={() => addToWatchlist(movie)}>Add to Watchlist</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Category;
