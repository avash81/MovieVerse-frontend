import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async'; // Updated to react-helmet-async
import LazyLoad from 'react-lazyload';
import { getMovieDetails, getReviews, submitReview, submitReply, fetchTmdbTrailer, fetchTmdbScreenshots } from '../api/api';
import '../styles.css';

const formatTimestamp = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TRAILER_FALLBACKS = {
  '83867': 'https://www.youtube.com/watch?v=5UfA_aK0RJE',
  '238': 'https://www.youtube.com/watch?v=sY1S34973zA',
};

function MovieDetails() {
  const { source, externalId } = useParams();
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [reviewName, setReviewName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewRating, setReviewRating] = useState('');
  const [watchlist, setWatchlist] = useState(JSON.parse(localStorage.getItem('watchlist')) || []);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyName, setReplyName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [showTrailer, setShowTrailer] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const userId = localStorage.getItem('tempUserId') || (() => {
    const id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('tempUserId', id);
    return id;
  })();

  const trackClick = (action, movieId, movieTitle) => {
    console.log('Tracking click:', { action, movieId, movieTitle });
    const analytics = JSON.parse(localStorage.getItem('analytics')) || [];
    analytics.push({ action, movieId, movieTitle, timestamp: new Date().toISOString() });
    localStorage.setItem('analytics', JSON.stringify(analytics));
  };

  useEffect(() => {
    let isMounted = true;
    console.log('useEffect ran for', { source, externalId });

    const fetchData = async () => {
      try {
        console.log('Fetching movie details and reviews for:', { source, externalId });
        const [movieResponse, reviewsResponse] = await Promise.all([
          getMovieDetails(source, externalId),
          getReviews(source, externalId),
        ]);

        if (!isMounted) return;

        if (!movieResponse.data?.externalId) {
          throw new Error('Invalid movie data received');
        }

        let movieData = movieResponse.data;
        console.log('Original movieData:', movieData);

        const releaseYear = movieData.releaseDate ? new Date(movieData.releaseDate).getFullYear() : null;
        console.log('Movie title:', movieData.title, 'Release year:', releaseYear);

        console.log('Fetching official trailer for externalId', externalId);
        const tmdbTrailer = await fetchTmdbTrailer(externalId, movieData.title, releaseYear);
        if (tmdbTrailer) {
          movieData = { ...movieData, trailer: tmdbTrailer };
          console.log('Fetched official trailer:', tmdbTrailer);
        } else {
          console.log('No official trailer found for externalId', externalId);
          const fallbackTrailer = TRAILER_FALLBACKS[externalId];
          movieData = { ...movieData, trailer: fallbackTrailer || null };
          if (fallbackTrailer) {
            console.log('Using fallback trailer:', fallbackTrailer);
          } else {
            console.log('No fallback trailer available for externalId', externalId);
          }
        }

        if (!movieData.screenshots || movieData.screenshots.length === 0) {
          console.log('Fetching screenshots from TMDb for externalId', externalId);
          const tmdbScreenshots = await fetchTmdbScreenshots(externalId);
          if (tmdbScreenshots) {
            movieData = { ...movieData, screenshots: tmdbScreenshots };
            console.log('Fetched screenshots:', tmdbScreenshots);
          } else {
            console.log('No screenshots found from TMDb for externalId', externalId);
            movieData = { ...movieData, screenshots: [
              'https://placehold.co/200x300?text=Screenshot1',
              'https://placehold.co/200x300?text=Screenshot2'
            ] };
          }
        }

        console.log('Processed Movie Details Response:', movieData);
        setMovie(movieData);
        setReviews(Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []);
        setError(null);
      } catch (err) {
        console.error('Data loading error:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        if (isMounted) {
          setError(err.response?.data?.message || err.message || 'Failed to load movie details. Please try again later.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [source, externalId]);

  const handleAddToWatchlist = (movie) => {
    if (!movie.source || !movie.externalId || movie.externalId === 'undefined') {
      console.warn('Cannot add movie to watchlist, invalid data:', movie);
      setError('Cannot add movie to watchlist due to invalid data.');
      return;
    }
    const watchlistMovie = {
      source: movie.source,
      externalId: movie.externalId,
      title: movie.title,
      poster: movie.poster,
      releaseYear: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A',
      imdbRating: movie.imdbRating,
      genres: movie.genres,
      overview: movie.overview,
      trailer: movie.trailer,
      watchProviders: movie.watchProviders,
      directLink: movie.directLink,
      genre_ids: movie.genre_ids || [],
    };
    const newWatchlist = [...watchlist, watchlistMovie];
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
    trackClick('add_to_watchlist', movie.externalId, movie.title);
  };

  const handleRemoveFromWatchlist = (externalId, source) => {
    const newWatchlist = watchlist.filter((m) => !(m.externalId === externalId && m.source === source));
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
    trackClick('remove_from_watchlist', externalId, 'unknown');
  };

  const handleImageError = (e, title) => {
    console.log(`Image failed to load for ${title}: ${e.target.src}`);
    e.target.src = 'https://placehold.co/300x450?text=No+Poster';
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim() || !reviewName.trim() || !reviewEmail.trim() || !reviewRating) {
      setError('Please fill all fields (name, email, review, rating).');
      return;
    }
    if (!emailRegex.test(reviewEmail)) {
      setError('Please enter a valid email address (e.g., user@example.com).');
      return;
    }
    try {
      console.log('Submitting review:', { source, externalId, data: { text: reviewText, name: reviewName, email: reviewEmail, rating: parseInt(reviewRating) } });
      const response = await submitReview(source, externalId, {
        text: reviewText,
        name: reviewName,
        email: reviewEmail,
        rating: parseInt(reviewRating),
      });
      const newReview = response.data;
      setReviews((prevReviews) => [newReview, ...prevReviews]);
      const reviewsResponse = await getReviews(source, externalId);
      setReviews(Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []);
      setReviewText('');
      setReviewName('');
      setReviewEmail('');
      setReviewRating('');
      setError(null);
      trackClick('submit_review', externalId, movie?.title || 'unknown');
    } catch (err) {
      console.error('Submit review error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.response?.data?.message || err.message || 'Failed to submit review. Please check server logs or try again later.');
    }
  };

  const handleReply = async (reviewId, e) => {
    e.preventDefault();
    if (!replyText.trim() || !replyName.trim() || !replyEmail.trim()) {
      setError('Please fill all fields (name, email, reply).');
      return;
    }
    if (!emailRegex.test(replyEmail)) {
      setError('Please enter a valid email address (e.g., user@example.com).');
      return;
    }
    setSubmittingReply(true);
    try {
      console.log('Submitting reply:', { source, externalId, reviewId, data: { text: replyText, name: replyName, email: replyEmail } });
      const response = await submitReply(source, externalId, reviewId, {
        text: replyText,
        name: replyName,
        email: replyEmail,
      });
      const updatedReviews = reviews.map((review) =>
        review._id === reviewId
          ? { ...review, replies: [...(review.replies || []), response.data] }
          : review
      );
      setReviews(updatedReviews);
      setReplyText('');
      setReplyName('');
      setReplyEmail('');
      setReplyingTo(null);
      setError(null);
      trackClick('submit_reply', reviewId, 'review_reply');
    } catch (err) {
      console.error('Submit reply error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.response?.data?.message || err.message || 'Failed to submit reply. Please check server logs or try again later.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const totalUserRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1)
    : 'N/A';

  if (loading) {
    return (
      <div className="loading-screen" style={{ textAlign: 'center', padding: '20px' }}>
        <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
        <p style={{ fontSize: '1rem', marginTop: '10px' }}>Loading movie details...</p>
        <style>{'@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  if (error && !movie) {
    return (
      <div className="error-screen" style={{ textAlign: 'center', padding: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Oops! Something went wrong</h2>
        <p style={{ fontSize: '1rem' }}>{error}</p>
        <Link to="/" className="home-link" style={{ textDecoration: 'none' }}>
          <button className="cta-button" style={{ padding: '8px 16px', fontSize: '1rem', marginTop: '10px' }}>Return to Home</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="movie-details fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      <Helmet>
        <title>{movie?.title ? `${movie.title} - MovieVerse` : 'Movie Details - MovieVerse'}</title>
        <meta name="description" content={movie?.overview || 'View movie details on MovieVerse'} />
      </Helmet>

      {showTrailer && movie.trailer && (
        <div className="trailer-modal">
          <div className="trailer-modal-content">
            <button
              className="trailer-modal-close"
              onClick={() => setShowTrailer(false)}
              aria-label="Close trailer modal"
            >
              ×
            </button>
            <iframe
              width="100%"
              height="100%"
              src={movie.trailer.replace('watch?v=', 'embed/') + '?autoplay=1&rel=0'}
              title={`${movie.title} Trailer`}
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              onLoad={() => trackClick('view_trailer', externalId, movie.title)}
            ></iframe>
          </div>
        </div>
      )}

      <header className="details-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', width: '100%', boxSizing: 'border-box' }}>
        <Link to="/" className="home-link" style={{ textDecoration: 'none' }}>
          <h1
            className="logo"
            style={{
              fontSize: '2em',
              fontWeight: 'bold',
              color: '#ff0000',
              margin: '10px 0',
              cursor: 'pointer',
              transition: 'font-size 0.3s ease',
            }}
            aria-label="Go to homepage"
          >
            MovieVerse 2.0
          </h1>
        </Link>
      </header>

      <div className="movie-content" style={{ marginTop: '20px' }}>
        {movie && (
          <>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#fff', margin: '20px 0', textAlign: 'center', transition: 'font-size 0.3s ease' }}>{movie.title || 'Untitled Movie'}</h1>
            <div className="movie-poster" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
              <LazyLoad height={450}>
                <img
                  src={movie.poster || 'https://placehold.co/300x450?text=No+Poster'}
                  alt={movie.title || 'Movie Poster'}
                  onError={(e) => handleImageError(e, movie.title || 'Unknown')}
                  style={{ width: '100%', maxWidth: '300px', height: 'auto', borderRadius: '8px' }}
                />
              </LazyLoad>
            </div>

            {movie.trailer && movie.trailer !== 'N/A' && (
              <div className="trailer-section" style={{ margin: '20px 0', textAlign: 'center' }}>
                <button
                  className="cta-button"
                  onClick={() => setShowTrailer(true)}
                  style={{ padding: '10px 20px', fontSize: '1rem' }}
                  aria-label={`Play trailer for ${movie.title}`}
                >
                  Play Trailer
                </button>
              </div>
            )}

            {movie.screenshots && movie.screenshots.length > 0 ? (
              <div className="category-section" style={{ margin: '20px 0' }}>
                {console.log('Screenshots data:', movie.screenshots)}
                <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#fff', margin: '20px 0', transition: 'font-size 0.3s ease' }}>Screenshots</h2>
                <div className="movie-grid horizontal-scroll" style={{ display: 'flex', overflowX: 'auto', gap: '10px', paddingBottom: '10px' }}>
                  {movie.screenshots.map((screenshot, index) => (
                    <div key={index} className="movie-card" style={{ flex: '0 0 auto' }}>
                      <div className="movie-poster">
                        <LazyLoad height={300}>
                          <img
                            src={screenshot || 'https://placehold.co/200x300?text=No+Screenshot'}
                            alt={`${movie.title} screenshot ${index + 1}`}
                            onError={(e) => handleImageError(e, `${movie.title} screenshot ${index + 1}`)}
                            style={{ width: '200px', height: '300px', objectFit: 'cover', borderRadius: '8px' }}
                          />
                        </LazyLoad>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '1rem', textAlign: 'center', color: '#ccc' }}>No screenshots available.</p>
            )}

            <div className="storyline" style={{ margin: '20px 0' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#e50914', marginBottom: '10px', transition: 'font-size 0.3s ease' }}>Storyline</h2>
              <p style={{ fontSize: '1rem', lineHeight: '1.5', color: '#ccc' }}>{movie.overview || 'No storyline available.'}</p>
            </div>

            <div className="download-links" style={{ margin: '20px 0' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#e50914', marginBottom: '10px', transition: 'font-size 0.3s ease' }}>Watch Options</h2>
              {movie.directLink ? (
                <ul style={{ listStyle: 'none', padding: '0' }}>
                  <li style={{ margin: '5px 0', fontSize: '1rem' }}>
                    <a href={movie.directLink} target="_blank" rel="noopener noreferrer" style={{ color: '#00f', textDecoration: 'none' }}>
                      Watch on Internet Archive
                    </a>
                  </li>
                </ul>
              ) : (
                <p style={{ fontSize: '1rem', color: '#ccc' }}>No direct watch links available.</p>
              )}
              {movie.watchProviders?.US?.ads?.length > 0 && (
                <div className="watch-free">
                  <h4 style={{ fontSize: '1.2rem', margin: '10px 0', color: '#e50914' }}>Watch for Free on:</h4>
                  <ul style={{ listStyle: 'none', padding: '0' }}>
                    {movie.watchProviders.US.ads.map((provider, index) => (
                      <li key={index} style={{ margin: '5px 0', fontSize: '1rem', color: '#ccc' }}>{provider.provider_name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="actions" style={{ margin: '20px 0', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {watchlist.some((m) => m.externalId === movie.externalId && m.source === movie.source) ? (
                <button
                  className="cta-button"
                  onClick={() => handleRemoveFromWatchlist(movie.externalId, movie.source)}
                  style={{ padding: '10px 20px', fontSize: '1rem' }}
                  aria-label={`Remove ${movie.title} from watchlist`}
                >
                  Remove from Watchlist
                </button>
              ) : (
                <button
                  className="cta-button"
                  onClick={() => handleAddToWatchlist(movie)}
                  style={{ padding: '10px 20px', fontSize: '1rem' }}
                  aria-label={`Add ${movie.title} to watchlist`}
                >
                  Add to Watchlist
                </button>
              )}
            </div>

            <div className="movie-info" style={{ margin: '20px 0', fontSize: '1rem', lineHeight: '1.5', color: '#ccc' }}>
              <p><strong>IMDb Rating:</strong> {movie.imdbRating || 'N/A'}</p>
              <p><strong>Release Date:</strong> {movie.releaseDate || 'N/A'}</p>
              <p><strong>Genres:</strong> {movie.genres || 'N/A'}</p>
              <p><strong>Director:</strong> {movie.director || 'N/A'}</p>
              <p><strong>Cast:</strong> {movie.cast?.join(', ') || 'N/A'}</p>
              <p><strong>Runtime:</strong> {movie.runtime || 'N/A'}</p>
              <p><strong>Budget:</strong> {movie.budget || 'N/A'}</p>
              <p><strong>Revenue:</strong> {movie.revenue || 'N/A'}</p>
              <p><strong>Production Companies:</strong> {movie.productionCompanies || 'N/A'}</p>
              <p><strong>Language:</strong> {movie.language || 'N/A'}</p>
              <p><strong>Country:</strong> {movie.country || 'N/A'}</p>
              <p><strong>Status:</strong> {movie.status || 'N/A'}</p>
              <p><strong>Tagline:</strong> {movie.tagline || 'N/A'}</p>
            </div>

            <div className="reviews-section" style={{ margin: '20px 0', padding: '1.5rem', background: '#000', borderRadius: '8px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#e50914', marginBottom: '10px', transition: 'font-size 0.3s ease' }}>Reviews</h2>
              {totalUserRating !== 'N/A' && (
                <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>
                  Total User Rating: {totalUserRating}/10
                </p>
              )}
              <form onSubmit={handleSubmitReview} className="review-form" style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="Your Name"
                  aria-label="Your name for review"
                />
                <input
                  type="email"
                  value={reviewEmail}
                  onChange={(e) => setReviewEmail(e.target.value)}
                  placeholder="Your Email"
                  aria-label="Your email for review"
                />
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Write your review..."
                  aria-label="Your review text"
                ></textarea>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  aria-label="Your rating (1-10)"
                >
                  <option value="">Select Rating (1-10)</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <button type="submit" className="cta-button" aria-label="Submit review">
                  Submit Review
                </button>
              </form>
              {error && <p className="error-message">{error}</p>}
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review._id} className="comment-item" style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #e9ecef' }}>
                    <img
                      src={`https://placehold.co/40x40?text=${review.name.charAt(0)}`}
                      alt={`${review.name}'s avatar`}
                      className="comment-avatar"
                    />
                    <div className="comment-content">
                      <div className="comment-header">
                        <p className="comment-username">{review.name}</p>
                        <p className="comment-time">{formatTimestamp(review.createdAt)}</p>
                      </div>
                      {review.rating && (
                        <p><strong>Rating:</strong> {review.rating}/10</p>
                      )}
                      <p className="comment-text">{review.text}</p>
                      {review.replies && review.replies.length > 0 && (
                        <div className="replies-container">
                          {review.replies.map((reply) => (
                            <div key={reply._id} className="reply-item">
                              <img
                                src={`https://placehold.co/30x30?text=${reply.name.charAt(0)}`}
                                alt={`${reply.name}'s avatar`}
                              />
                              <div>
                                <div className="reply-header">
                                  <p>{reply.name}</p>
                                  <p>{formatTimestamp(reply.createdAt)}</p>
                                </div>
                                <p>{reply.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {!replyingTo || replyingTo !== review._id ? (
                        <button
                          className="reply-btn"
                          onClick={() => setReplyingTo(review._id)}
                          aria-label={`Reply to ${review.name}'s review`}
                        >
                          Reply
                        </button>
                      ) : (
                        <form onSubmit={(e) => handleReply(review._id, e)} className="reply-form">
                          <input
                            type="text"
                            value={replyName}
                            onChange={(e) => setReplyName(e.target.value)}
                            placeholder="Your Name"
                            aria-label="Your name for reply"
                            disabled={submittingReply}
                          />
                          <input
                            type="email"
                            value={replyEmail}
                            onChange={(e) => setReplyEmail(e.target.value)}
                            placeholder="Your Email"
                            aria-label="Your email for reply"
                            disabled={submittingReply}
                          />
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your reply..."
                            aria-label="Your reply text"
                            disabled={submittingReply}
                          />
                          <button
                            type="submit"
                            className="cta-button"
                            aria-label="Submit reply"
                            disabled={submittingReply}
                          >
                            {submittingReply ? 'Submitting...' : 'Submit Reply'}
                          </button>
                          <button
                            type="button"
                            className="cta-button"
                            onClick={() => setReplyingTo(null)}
                            style={{ background: '#ccc' }}
                            aria-label="Cancel reply"
                            disabled={submittingReply}
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '1rem', color: '#ccc' }}>No reviews yet. Be the first to share your thoughts!</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MovieDetails;