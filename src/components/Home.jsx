import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import LazyLoad from 'react-lazyload';
import { getCategory, getNotices } from '../api/api';
import '../styles.css';

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
          setTimeout(() => reject(new Error('Request timed out')), 5000)
        );
        return Promise.race([fn(...args), timeout]);
      };

      try {
        const noticesResponse = await fetchWithTimeout(getNotices);
        setNotices(Array.isArray(noticesResponse.data) ? noticesResponse.data : []);
      } catch (err) {
        console.error('Error fetching notices:', err);
        setNotices([]);
      }

      for (const category of categories) {
        try {
          const response = await fetchWithTimeout(getCategory, category.id);
          const movies = Array.isArray(response.data) ? response.data : [];
          newMoviesByCategory[category.id] = movies.filter(
            (movie) =>
              movie.source &&
              movie.externalId &&
              movie.externalId !== 'undefined' &&
              typeof movie.source === 'string' &&
              typeof movie.externalId === 'string'
          );
        } catch (err) {
          console.error(`Error fetching category ${category.id}:`, err);
          newMoviesByCategory[category.id] = [];
          hasError = true;
          setError((prev) =>
            prev
              ? `${prev} Error loading ${category.name}: Failed to load.`
              : `Error loading ${category.name}: Failed to load.`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setMoviesByCategory(newMoviesByCategory);
      if (!hasError && !error) setError(null);

      if (newMoviesByCategory['trending'] && newMoviesByCategory['trending'].length > 0) {
        const trendingMovies = newMoviesByCategory['trending'];
        setFeaturedMovie(trendingMovies[Math.floor(Math.random() * trendingMovies.length)]);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      const suggestions = Object.values(moviesByCategory)
        .flat()
        .filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
      setSearchSuggestions(suggestions);
    } else {
      setSearchSuggestions([]);
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
  }, [activeCategory, searchQuery]);

  const renderMovieCard = (movie, categoryId) => (
    <div key={`${categoryId}-${movie.source}-${movie.externalId}`} className="movie-card">
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
          <Link
            to={`/movie/${movie.source}/${movie.externalId}`}
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
            {movie.genres?.join(', ') || 'N/A'}
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
        <div className="quick-view-modal" style={{ position: 'fixed', backgroundColor: 'black', color: 'white', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'black', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', zIndex: 1000, maxWidth: '500px', width: '90%' }}>
          <button onClick={closeQuickView} style={{ float: 'right', background: 'none', color: 'red', border: 'none', fontSize: '20px', cursor: 'pointer' }} aria-label="Close quick view">×</button>
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
          MovieVerse
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
                          }}
                          role="option"
                          tabIndex={0}
                          onKeyPress={(e) => e.key === 'Enter' && setSearchQuery(movie.title) && setSearchResults([movie]) && setShowSearch(false)}
                          aria-label={`Select ${movie.title}`}
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
                {notice.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="loading">Loading content...</p>}

      {error && <p className="error">{error}</p>}

      {featuredMovie && !loading && !error && (
        <div className="hero-section" style={{ position: 'relative', height: '60vh', overflow: 'hidden' }}>
          <img
            src={featuredMovie.poster || 'https://placehold.co/3840x2160?text=4K+Poster'}
            alt={featuredMovie.title}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              minWidth: '100%',
              minHeight: '100%',
              width: 'auto',
              height: 'auto',
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
              objectFit: 'cover',
            }}
            onError={(e) => { e.target.src = 'https://placehold.co/3840x2160?text=4K+Poster'; }}
          />
          <div className="hero-overlay" style={{ position: 'relative', zIndex: 2, color: '#fff', textAlign: 'center', paddingTop: '20vh', background: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="hero-content">
              <h2 style={{ fontSize: '2.5em', marginBottom: '10px' }}>{featuredMovie.title}</h2>
              <p style={{ fontSize: '1.2em', marginBottom: '20px' }}>{featuredMovie.imdbRating || 'N/A'}</p>
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
                  to={`/movie/${featuredMovie.source}/${featuredMovie.externalId}`}
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
            {watchlist.filter((movie) => movie.source && movie.externalId).map((movie) => renderMovieCard(movie, 'watchlist'))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="category-section" id="recommendations">
          <h2>Recommended for You</h2>
          <div className="movie-grid horizontal-scroll">
            {recommendations.filter((movie) => movie.source && movie.externalId).map((movie) => renderMovieCard(movie, 'recommendations'))}
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="search-results" id="search-results">
          <h2>Search Results</h2>
          <div className="movie-grid horizontal-scroll">
            {searchResults.filter((movie) => movie.source && movie.externalId).map((movie) => renderMovieCard(movie, 'search-results'))}
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
                .map((movie) => {
                  console.log('Rendering movie:', { title: movie.title, source: movie.source, externalId: movie.externalId });
                  return renderMovieCard(movie, category.id);
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