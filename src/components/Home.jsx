import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async'; // Updated to react-helmet-async
import LazyLoad from 'react-lazyload';
import { getCategory, getNotices, getReviews } from '../api/api';
import '../styles.css';

// Separate MovieCard component
const MovieCard = ({ movie, categoryId, index, reviewCounts, watchlist, handleAddToWatchlist, handleRemoveFromWatchlist, openTrailerModal, openQuickView, handleImageError, trackClick }) => {
  let genresString = 'N/A';
  if (movie.genres) {
    if (Array.isArray(movie.genres)) {
      genresString = movie.genres
        .map(genre => (typeof genre === 'object' && genre.name ? genre.name : genre))
        .join(', ');
    } else if (typeof movie.genres === 'string') {
      genresString = movie.genres;
    }
  }

  return (
    <div key={`${categoryId}-${movie.source}-${movie.externalId}-${index}`} className="movie-card">
      <div
        className="movie-poster"
        onClick={() => openTrailerModal(movie.trailer)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && openTrailerModal(movie.trailer)}
        aria-label={`Play trailer for ${movie.title}`}
      >
        <LazyLoad height={300}>
          <img
            src={movie.poster}
            alt={movie.title}
            onError={(e) => handleImageError(e, movie.title)}
          />
        </LazyLoad>
        <div className="movie-overlay">
          <p>IMDb Rating: {movie.imdbRating || 'N/A'}</p>
          <p>Total Number of Reviews: {reviewCounts[movie.externalId] || 0}</p>
          <Link
            to={`/movies/${movie.source}/${movie.externalId}`}
            onClick={() => trackClick('view_details', movie.externalId, movie.title)}
          >
            <button
              className="cta-button"
              aria-label={`View details for ${movie.title}`}
            >
              View Details
            </button>
          </Link>
          {movie.watchProviders?.US?.ads?.length > 0 && (
            <div className="watch-free">
              <h4>Watch for Free on:</h4>
              <ul>
                {movie.watchProviders.US.ads.map((provider, index) => (
                  <li key={index}>{provider.provider_name}</li>
                ))}
              </ul>
            </div>
          )}
          {movie.directLink && (
            <a href={movie.directLink} target="_blank" rel="noopener noreferrer" className="watch-now" aria-label={`Watch ${movie.title} on Internet Archive`}>
              Watch Now
            </a>
          )}
          {watchlist.some((m) => m.externalId === movie.externalId && m.source === movie.source) ? (
            <button
              className="cta-button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFromWatchlist(movie.externalId, movie.source);
              }}
              aria-label={`Remove ${movie.title} from watchlist`}
            >
              Remove from Watchlist
            </button>
          ) : (
            <button
              className="cta-button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddToWatchlist(movie);
              }}
              aria-label={`Add ${movie.title} to watchlist`}
            >
              Add to Watchlist
            </button>
          )}
        </div>
      </div>
      <div className="movie-info" style={{ marginTop: '10px' }}>
        <h3 style={{ margin: '0 0 5px 0' }}>{movie.title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
          <span style={{ color: '#666', fontSize: '14px', marginRight: '5px' }}>
            {movie.releaseYear || 'N/A'}
          </span>
          <span style={{ color: '#666', fontSize: '12px', marginRight: '5px' }}>•</span>
          <span style={{ color: '#666', fontSize: '14px' }}>
            {genresString}
          </span>
        </div>
        <button
          className="quick-view-btn"
          onClick={() => openQuickView(movie)}
          style={{ color: '#1a73e8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
          aria-label={`Quick view for ${movie.title}`}
        >
          Quick View
        </button>
      </div>
    </div>
  );
};

function Home() {
  const [categories] = useState([
    { id: 'trending', name: 'Trending' },
    { id: 'action', name: 'Action' },
    { id: 'comedy', name: 'Comedy' },
    { id: 'drama', name: 'Drama' },
    { id: 'bollywood', name: 'Bollywood' },
    { id: 'hollywood', name: 'Hollywood' },
    { id: 'tamil', name: 'Tamil' },
    { id: 'telugu', name: 'Telugu' },
    { id: 'webseries', name: 'Web Series' },
    { id: 'tvshows', name: 'TV Shows' },
    { id: 'topimdb', name: 'Top IMDb' },
    { id: 'classics', name: 'Classics' },
  ]);
  const [moviesByCategory, setMoviesByCategory] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [showBannerAd, setShowBannerAd] = useState(true);
  const [showInterstitialAd, setShowInterstitialAd] = useState(true);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState(JSON.parse(localStorage.getItem('watchlist')) || []);
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [notices, setNotices] = useState([]);
  const [featuredMovie, setFeaturedMovie] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [quickViewMovie, setQuickViewMovie] = useState(null);
  const [reviewCounts, setReviewCounts] = useState({});

  const trackClick = (action, movieId, movieTitle) => {
    console.log('Tracking click:', { action, movieId, movieTitle });
    const analytics = JSON.parse(localStorage.getItem('analytics')) || [];
    analytics.push({ action, movieId, movieTitle, timestamp: new Date().toISOString() });
    localStorage.setItem('analytics', JSON.stringify(analytics));
  };

  const scrollToCategory = (categoryId) => {
    setActiveCategory(categoryId);
    if (categoryId === 'webseries') {
      setMoviesByCategory((prev) => {
        const updated = { ...prev };
        const webSeriesData = updated['webseries'] || [];
        delete updated['webseries'];
        return { webseries: webSeriesData, ...updated };
      });
    }
    const element = document.getElementById(categoryId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      trackClick('navigate_category', categoryId, categoryId);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const newMoviesByCategory = {};
      let hasError = false;

      const fetchWithTimeout = async (fn, ...args) => {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out after 15s')), 15000)
        );
        return Promise.race([fn(...args), timeout]);
      };

      // Fetch notices
      try {
        const noticesResponse = await fetchWithTimeout(getNotices);
        console.log('Notices Response:', noticesResponse);
        setNotices(Array.isArray(noticesResponse.data) ? noticesResponse.data : []);
      } catch (err) {
        console.error('Error fetching notices:', err);
        setNotices([]);
        hasError = true;
        setError(`Error loading notices: ${err.message || 'Failed to load'}`);
      }

      // Batch fetch categories with 404 handling
      const categoryPromises = categories.map(async (category) => {
        try {
          const { data, error } = await fetchWithTimeout(getCategory, category.id);
          console.log(`Category ${category.id} Response:`, { data, error });
          if (error && error.includes('404')) {
            console.warn(`Skipping category ${category.id} due to 404 Not Found`);
            return { id: category.id, name: category.name, movies: [] };
          }
          if (error) throw new Error(error);
          const movies = Array.isArray(data) ? data : [];
          return { id: category.id, name: category.name, movies: movies.filter(
            (movie) =>
              movie.source &&
              movie.externalId &&
              movie.externalId !== 'undefined' &&
              typeof movie.source === 'string' &&
              typeof movie.externalId === 'string'
          ) };
        } catch (err) {
          console.error(`Error fetching category ${category.id}:`, err);
          hasError = true;
          setError((prev) => (prev ? `${prev} Error loading ${category.name}: ${err.message || 'Failed to load'}.` : `Error loading ${category.name}: ${err.message || 'Failed to load'}.`));
          return { id: category.id, name: category.name, movies: [] };
        }
      });

      const categoryResults = await Promise.all(categoryPromises);
      categoryResults.forEach(({ id, movies }) => {
        newMoviesByCategory[id] = movies;
      });

      setMoviesByCategory(newMoviesByCategory);

      if (!hasError) setError(null);

      if (newMoviesByCategory['trending'] && newMoviesByCategory['trending'].length > 0) {
        const trendingMovies = newMoviesByCategory['trending'];
        const randomFeatured = trendingMovies[Math.floor(Math.random() * trendingMovies.length)];
        setFeaturedMovie(randomFeatured);

        const counts = {};
        const reviewPromises = categoryResults.flatMap(({ movies }) =>
          movies.map(async (movie) => {
            try {
              const reviewsResponse = await fetchWithTimeout(getReviews, movie.source, movie.externalId);
              return { externalId: movie.externalId, count: Array.isArray(reviewsResponse.data) ? reviewsResponse.data.length : 0 };
            } catch (err) {
              console.error(`Error fetching reviews for ${movie.source}/${movie.externalId}:`, err);
              return { externalId: movie.externalId, count: 0 };
            }
          })
        );

        const reviewResults = await Promise.all(reviewPromises);
        reviewResults.forEach(({ externalId, count }) => {
          counts[externalId] = count;
        });
        setReviewCounts(counts);
      }

      setLoading(false);
    };

    fetchData();
  }, [categories]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      const results = Object.values(moviesByCategory)
        .flat()
        .filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 20);
      setSearchSuggestions(results.slice(0, 5));
      setSearchResults(results);
      const searchResultsElement = document.getElementById('search-results');
      if (searchResultsElement) {
        searchResultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      setSearchSuggestions([]);
      setSearchResults([]);
    }
  };

  const handleAddToWatchlist = (movie) => {
    if (!movie.source || !movie.externalId || movie.externalId === 'undefined') {
      console.warn('Cannot add movie to watchlist, invalid data:', movie);
      return;
    }
    const newWatchlist = [...watchlist, { ...movie, source: movie.source, externalId: movie.externalId }];
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
    trackClick('add_to_watchlist', movie.externalId, movie.title);
  };

  const handleRemoveFromWatchlist = (externalId, source) => {
    const newWatchlist = watchlist.filter(
      (m) => !(m.externalId === externalId && m.source === source)
    );
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
    trackClick('remove_from_watchlist', externalId, 'unknown');
  };

  const handleImageError = (e, title) => {
    console.log(`Image failed to load for ${title}: ${e.target.src}`);
    e.target.src = 'https://placehold.co/200x300?text=No+Poster';
  };

  const openTrailerModal = (trailerUrl) => {
    if (trailerUrl && trailerUrl !== 'N/A') {
      setSelectedTrailer(trailerUrl);
      trackClick('play_trailer', 'trailer', trailerUrl);
    }
  };

  const closeTrailerModal = () => {
    setSelectedTrailer(null);
  };

  const openQuickView = (movie) => {
    setQuickViewMovie(movie);
  };

  const closeQuickView = () => {
    setQuickViewMovie(null);
  };

  const getRecommendations = () => {
    const genres = watchlist.flatMap((movie) => movie.genre_ids || []);
    const topGenre = genres.sort(
      (a, b) => genres.filter((v) => v === a).length - genres.filter((v) => v === b).length
    )[0];
    return (
      moviesByCategory['trending']?.filter((movie) => movie.genre_ids?.includes(topGenre))?.slice(0, 5) || []
    );
  };
  const recommendations = getRecommendations();

  const memoizedCategories = useMemo(() => {
    if (activeCategory === 'webseries' || searchQuery.toLowerCase().includes('web series')) {
      return [
        categories.find((c) => c.id === 'webseries'),
        ...categories.filter((c) => c.id !== 'webseries'),
      ];
    }
    return categories;
  }, [activeCategory, searchQuery, categories]);

  return (
    <div className="home fade-in">
      <Helmet>
        <title>MovieVerse - Stream Movies & Web Series</title>
        <meta
          name="description"
          content="Watch Hollywood, Bollywood, Web Series, and more on MovieVerse!"
        />
      </Helmet>

      {selectedTrailer && (
        <div className="trailer-modal">
          <div className="trailer-modal-content">
            <button className="trailer-modal-close" onClick={closeTrailerModal} aria-label="Close trailer modal">
              ×
            </button>
            <iframe
              width="100%"
              height="100%"
              src={selectedTrailer.replace('watch?v=', 'embed/')}
              title="Movie Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {quickViewMovie && (
        <div className="quick-view-modal">
          <button onClick={closeQuickView} aria-label="Close quick view">×</button>
          <h2>{quickViewMovie.title}</h2>
          <p><strong>Overview:</strong> {quickViewMovie.overview || 'No overview available.'}</p>
          <p><strong>Cast:</strong> {quickViewMovie.cast?.join(', ') || 'N/A'}</p>
          <p><strong>Budget:</strong> {quickViewMovie.budget ? `$${quickViewMovie.budget.toLocaleString()}` : 'N/A'}</p>
          <p><strong>Release Date:</strong> {quickViewMovie.release_date || 'N/A'}</p>
          <p><strong>Genres:</strong> {quickViewMovie.genres?.join(', ') || 'N/A'}</p>
          <p><strong>IMDb Rating:</strong> {quickViewMovie.imdbRating || 'N/A'}</p>
        </div>
      )}

      <header className="header">
        <h1
          className="logo"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveCategory(null);
          }}
          aria-label="Go to top of page"
        >
          MovieVerse 2.0
        </h1>
        <div className="nav-container">
          <nav className="nav">
            {categories.map((category) => (
              <span
                key={category.id}
                className={`nav-link ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => scrollToCategory(category.id)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && scrollToCategory(category.id)}
                aria-label={`Navigate to ${category.name} category`}
              >
                {category.name}
              </span>
            ))}
            <span
              className={`nav-link ${activeCategory === 'watchlist' ? 'active' : ''}`}
              onClick={() => scrollToCategory('watchlist')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && scrollToCategory('watchlist')}
              aria-label="Navigate to My Watchlist"
            >
              My Watchlist
            </span>
          </nav>
          <div className="search-toggle">
            <button
              className="search-icon"
              onClick={() => setShowSearch(!showSearch)}
              aria-label="Toggle search bar"
            >
              🔍
            </button>
            {showSearch && (
              <div className="search-bar">
                <div className="search-container">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search movies, web series..."
                    aria-label="Search for movies or web series"
                    autoFocus
                  />
                  {searchSuggestions.length > 0 && (
                    <ul className="search-suggestions">
                      {searchSuggestions.map((movie) => (
                        <li
                          key={`${movie.source}-${movie.externalId}`}
                          onClick={() => {
                            setSearchQuery(movie.title);
                            setSearchResults([movie]);
                            setShowSearch(false);
                            const searchResultsElement = document.getElementById('search-results');
                            if (searchResultsElement) {
                              searchResultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          role="option"
                          tabIndex={0}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              setSearchQuery(movie.title);
                              setSearchResults([movie]);
                              setShowSearch(false);
                              const searchResultsElement = document.getElementById('search-results');
                              if (searchResultsElement) {
                                searchResultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }
                          }}
                          aria-label={`Select ${movie.title}`}
                          aria-selected={false}
                        >
                          {movie.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {notices.length > 0 && (
        <div className="notices-ticker">
          <div className="ticker-content">
            {notices.map((notice, index) => (
              <span key={index} className="ticker-item">
                {notice.text || notice.message}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="loading">Loading content...</p>}

      {error && <p className="error">{error}</p>}

      {featuredMovie && !loading && !error && (
        <div className="hero-section">
          <img
            src={featuredMovie.poster || 'https://placehold.co/3840x2160?text=4K+Poster'}
            alt={featuredMovie.title}
            onError={(e) => { e.target.src = 'https://placehold.co/3840x2160?text=4K+Poster'; }}
          />
          <div className="hero-overlay">
            <div className="hero-content">
              <h2>{featuredMovie.title}</h2>
              <p>
                IMDb Rating: {featuredMovie.imdbRating || 'N/A'} | Total Number of Reviews: {reviewCounts[featuredMovie.externalId] || 0}
              </p>
              <div className="hero-buttons">
                {featuredMovie.trailer && featuredMovie.trailer !== 'N/A' && (
                  <button
                    className="cta-button hero-button play-trailer"
                    onClick={() => openTrailerModal(featuredMovie.trailer)}
                    aria-label={`Play trailer for ${featuredMovie.title}`}
                  >
                    Play Trailer
                  </button>
                )}
                <Link
                  to={`/movies/${featuredMovie.source}/${featuredMovie.externalId}`}
                  onClick={() => trackClick('view_details', featuredMovie.externalId, featuredMovie.title)}
                >
                  <button
                    className="cta-button hero-button"
                    aria-label={`View details for ${featuredMovie.title}`}
                  >
                    View Details
                  </button>
                </Link>
                {watchlist.some((m) => m.externalId === featuredMovie.externalId && m.source === featuredMovie.source) ? (
                  <button
                    className="cta-button hero-button"
                    onClick={() => handleRemoveFromWatchlist(featuredMovie.externalId, featuredMovie.source)}
                    aria-label={`Remove ${featuredMovie.title} from watchlist`}
                  >
                    Remove from Watchlist
                  </button>
                ) : (
                  <button
                    className="cta-button hero-button"
                    onClick={() => handleAddToWatchlist(featuredMovie)}
                    aria-label={`Add ${featuredMovie.title} to watchlist`}
                  >
                    Add to Watchlist
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBannerAd && (
        <div className="ad-placeholder banner-ad">
          <img
            src="https://placehold.co/728x90?text=Banner+Ad"
            alt="Banner Ad"
          />
          <button onClick={() => setShowBannerAd(false)} aria-label="Close banner ad">Close Ad</button>
        </div>
      )}

      {showInterstitialAd && (
        <div className="ad-placeholder interstitial-ad">
          <img
            src="https://placehold.co/728x90?text=Interstitial+Ad"
            alt="Interstitial Ad"
          />
          <button onClick={() => setShowInterstitialAd(false)} aria-label="Close interstitial ad">Close Ad</button>
        </div>
      )}

      {watchlist.length > 0 && (
        <div className="category-section" id="watchlist">
          <h2>My Watchlist</h2>
          <div className="movie-grid horizontal-scroll">
            {watchlist.filter((movie) => movie.source && movie.externalId).map((movie, index) => (
              <MovieCard
                key={`${movie.source}-${movie.externalId}-${index}`}
                movie={movie}
                categoryId="watchlist"
                index={index}
                reviewCounts={reviewCounts}
                watchlist={watchlist}
                handleAddToWatchlist={handleAddToWatchlist}
                handleRemoveFromWatchlist={handleRemoveFromWatchlist}
                openTrailerModal={openTrailerModal}
                openQuickView={openQuickView}
                handleImageError={handleImageError}
                trackClick={trackClick}
              />
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="category-section" id="recommendations">
          <h2>Recommended for You</h2>
          <div className="movie-grid horizontal-scroll">
            {recommendations.filter((movie) => movie.source && movie.externalId).map((movie, index) => (
              <MovieCard
                key={`${movie.source}-${movie.externalId}-${index}`}
                movie={movie}
                categoryId="recommendations"
                index={index}
                reviewCounts={reviewCounts}
                watchlist={watchlist}
                handleAddToWatchlist={handleAddToWatchlist}
                handleRemoveFromWatchlist={handleRemoveFromWatchlist}
                openTrailerModal={openTrailerModal}
                openQuickView={openQuickView}
                handleImageError={handleImageError}
                trackClick={trackClick}
              />
            ))}
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="search-results" id="search-results">
          <h2>Search Results</h2>
          <div className="movie-grid horizontal-scroll">
            {searchResults.filter((movie) => movie.source && movie.externalId).map((movie, index) => (
              <MovieCard
                key={`${movie.source}-${movie.externalId}-${index}`}
                movie={movie}
                categoryId="search-results"
                index={index}
                reviewCounts={reviewCounts}
                watchlist={watchlist}
                handleAddToWatchlist={handleAddToWatchlist}
                handleRemoveFromWatchlist={handleRemoveFromWatchlist}
                openTrailerModal={openTrailerModal}
                openQuickView={openQuickView}
                handleImageError={handleImageError}
                trackClick={trackClick}
              />
            ))}
          </div>
        </div>
      )}

      {memoizedCategories.map((category) => (
        <div key={category.id} className="category-section" id={category.id}>
          <h2>{category.name}</h2>
          {moviesByCategory[category.id]?.length > 0 ? (
            <div className="movie-grid horizontal-scroll">
              {moviesByCategory[category.id]
                .filter(
                  (movie) =>
                    movie.source &&
                    movie.externalId &&
                    typeof movie.source === 'string' &&
                    typeof movie.externalId === 'string'
                )
                .map((movie, index) => {
                  console.log('Rendering movie:', { title: movie.title, source: movie.source, externalId: movie.externalId });
                  return (
                    <MovieCard
                      key={`${movie.source}-${movie.externalId}-${index}`}
                      movie={movie}
                      categoryId={category.id}
                      index={index}
                      reviewCounts={reviewCounts}
                      watchlist={watchlist}
                      handleAddToWatchlist={handleAddToWatchlist}
                      handleRemoveFromWatchlist={handleRemoveFromWatchlist}
                      openTrailerModal={openTrailerModal}
                      openQuickView={openQuickView}
                      handleImageError={handleImageError}
                      trackClick={trackClick}
                    />
                  );
                })}
            </div>
          ) : (
            <p>No movies available in {category.name}.</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default Home;