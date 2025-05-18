import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import LazyLoad from 'react-lazyload';
import { getMovieDetails, getReviews, submitReview, submitReply, submitReaction } from '../api/api';
import '../styles.css';

// Utility to format timestamp like YouTube (e.g., "2 days ago")
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

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function MovieDetails() {
  const { source, externalId } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [reviewName, setReviewName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [watchlist, setWatchlist] = useState(JSON.parse(localStorage.getItem('watchlist')) || []);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [reactionCounts, setReactionCounts] = useState({ excellent: 0, loved: 0, thanks: 0, wow: 0, sad: 0 });
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyName, setReplyName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        console.log('Fetching movie details...');
        const [movieResponse, reviewsResponse] = await Promise.all([
          getMovieDetails(source, externalId),
          getReviews(source, externalId),
        ]);

        if (!isMounted) return;

        if (!movieResponse.data?.externalId) {
          throw new Error('Invalid movie data received');
        }

        setMovie(movieResponse.data);
        setReviews(Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []);
        setReactionCounts(
          movieResponse.data.reactionCounts || { excellent: 0, loved: 0, thanks: 0, wow: 0, sad: 0 }
        );
        setError(null);
      } catch (err) {
        console.error('Data loading error:', {
          message: err.message,
          response: err.response?.data,
          stack: err.stack,
        });
        if (isMounted) {
          setError(err.response?.data?.msg || 'Failed to load movie details');
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
      return;
    }
    const newWatchlist = [...watchlist, { ...movie, source: movie.source, externalId: movie.externalId }];
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
  };

  const handleRemoveFromWatchlist = (externalId, source) => {
    const newWatchlist = watchlist.filter((m) => !(m.externalId === externalId && m.source === source));
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
  };

  const handleImageError = (e, title) => {
    console.log(`Image failed to load for ${title}: ${e.target.src}`);
    e.target.src = 'https://placehold.co/300x450?text=No+Poster';
  };

  const openTrailerModal = (trailerUrl) => {
    if (trailerUrl && trailerUrl !== 'N/A') {
      setSelectedTrailer(trailerUrl);
    }
  };

  const closeTrailerModal = () => {
    setSelectedTrailer(null);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim() || !reviewName.trim() || !reviewEmail.trim()) {
      setError('Please fill all fields (name, email, review).');
      return;
    }
    if (!emailRegex.test(reviewEmail)) {
      setError('Please enter a valid email address (e.g., user@example.com).');
      return;
    }
    try {
      await submitReview(source, externalId, { text: reviewText, name: reviewName, email: reviewEmail });
      const reviewsResponse = await getReviews(source, externalId);
      setReviews(Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []);
      setReviewText('');
      setReviewName('');
      setReviewEmail('');
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to submit review. Check console for details.');
    }
  };

  const handleReaction = async (reaction) => {
    try {
      const response = await submitReaction(source, externalId, reaction);
      setReactionCounts(response.data.reactionCounts);
      setError(null);
    } catch (err) {
      setError('Failed to submit reaction. Check console for details.');
    }
  };

  const handleReply = async (reviewId) => {
    if (!replyText.trim() || !replyName.trim() || !replyEmail.trim()) {
      setError('Please fill all fields (name, email, reply).');
      return;
    }
    if (!emailRegex.test(replyEmail)) {
      setError('Please enter a valid email address (e.g., user@example.com).');
      return;
    }
    try {
      const response = await submitReply(source, externalId, reviewId, {
        text: replyText,
        name: replyName,
        email: replyEmail,
      });
      setReviews((prev) =>
        prev.map((review) => (review._id === reviewId ? response.data : review))
      );
      setReplyText('');
      setReplyName('');
      setReplyEmail('');
      setReplyingTo(null);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to submit reply. Check console for details.');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading movie details...</p>
      </div>
    );
  }

  if (error && !movie) {
    return (
      <div className="error-screen">
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
        <Link to="/" className="home-link">
          <button className="cta-button">Return to Home</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="movie-details fade-in">
      <Helmet>
        <title>{movie?.title ? `${movie.title} - MovieVerse` : 'Movie Details - MovieVerse'}</title>
        <meta name="description" content={movie?.overview || 'View movie details on MovieVerse'} />
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

      <header className="details-header">
        <Link to="/" className="home-link">
          <h1 className="logo">MovieVerse</h1>
        </Link>
      </header>

      <div className="movie-content">
        {movie && (
          <>
            <h1>{movie.title || 'Untitled Movie'}</h1>
            <div className="movie-poster">
              <LazyLoad height={450}>
                <img
                  src={movie.poster || 'https://placehold.co/300x450?text=No+Poster'}
                  alt={movie.title || 'Movie Poster'}
                  onError={(e) => handleImageError(e, movie.title || 'Unknown')}
                />
              </LazyLoad>
            </div>

            {movie.screenshots && movie.screenshots.length > 0 && (
              <div className="category-section">
                <h2>Screenshots</h2>
                <div className="movie-grid horizontal-scroll">
                  {movie.screenshots.map((screenshot, index) => (
                    <div key={index} className="movie-card">
                      <div className="movie-poster">
                        <LazyLoad height={300}>
                          <img
                            src={screenshot || 'https://placehold.co/200x300?text=No+Screenshot'}
                            alt={`${movie.title} Screenshot ${index + 1}`}
                            onError={(e) => handleImageError(e, `${movie.title} Screenshot ${index + 1}`)}
                            style={{ width: '200px', height: '300px', objectFit: 'cover' }}
                          />
                        </LazyLoad>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="storyline">
              <h2>Storyline</h2>
              <p>{movie.overview || 'No storyline available.'}</p>
            </div>

            <div className="download-links">
              <h2>Watch Options</h2>
              {movie.directLink ? (
                <ul>
                  <li>
                    <a href={movie.directLink} target="_blank" rel="noopener noreferrer">
                      Watch Now on Internet Archive
                    </a>
                  </li>
                </ul>
              ) : movie.watchProviders?.US?.ads?.length > 0 ? (
                <ul>
                  {movie.watchProviders.US.ads.map((provider, index) => (
                    <li key={index}>{provider.provider_name}</li>
                  ))}
                </ul>
              ) : (
                <p>No watch options available.</p>
              )}
            </div>

            <div className="reactions">
              <h2>Reactions</h2>
              <div className="reaction-buttons">
                {Object.keys(reactionCounts).map((reaction) => (
                  <button
                    key={reaction}
                    className="reaction-btn"
                    onClick={() => handleReaction(reaction)}
                    aria-label={`React with ${reaction}`}
                    style={{ margin: '0 5px', padding: '5px 10px', fontSize: '14px' }}
                  >
                    {reaction.charAt(0).toUpperCase() + reaction.slice(1)} ({reactionCounts[reaction]})
                  </button>
                ))}
              </div>
            </div>

            <div className="hero-buttons">
              {movie.trailer && movie.trailer !== 'N/A' && (
                <button
                  className="cta-button hero-button play-trailer"
                  onClick={() => openTrailerModal(movie.trailer)}
                  aria-label={`Play trailer for ${movie.title}`}
                >
                  Play Trailer
                </button>
              )}
              {watchlist.some((m) => m.externalId === externalId && m.source === source) ? (
                <button
                  className="cta-button hero-button"
                  onClick={() => handleRemoveFromWatchlist(externalId, source)}
                  aria-label={`Remove ${movie.title} from watchlist`}
                >
                  Remove from Watchlist
                </button>
              ) : (
                <button
                  className="cta-button hero-button"
                  onClick={() => handleAddToWatchlist(movie)}
                  aria-label={`Add ${movie.title} to watchlist`}
                >
                  Add to Watchlist
                </button>
              )}
            </div>

            <div className="reviews-section">
              <h3>Reviews</h3>
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review._id} className="comment-item" style={{ display: 'flex', marginBottom: '15px' }}>
                    <img
                      src={review.user?.avatar || 'https://placehold.co/40x40?text=User'}
                      alt="User avatar"
                      className="comment-avatar"
                      style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                    />
                    <div className="comment-content" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                        <p className="comment-username" style={{ fontWeight: 'bold', margin: '0', marginRight: '5px' }}>
                          {review.name || 'Anonymous'}
                        </p>
                        <span style={{ color: '#666', fontSize: '12px', marginRight: '5px' }}>•</span>
                        <p className="comment-time" style={{ color: '#666', fontSize: '12px', margin: '0' }}>
                          {formatTimestamp(review.createdAt)}
                        </p>
                      </div>
                      <p className="comment-text" style={{ margin: '0 0 5px 0' }}>{review.text}</p>
                      <button
                        className="reply-btn"
                        onClick={() => setReplyingTo(review._id === replyingTo ? null : review._id)}
                        aria-label={`Reply to ${review.name || 'Anonymous'}`}
                        style={{ color: '#1a73e8', background: 'none', border: 'none', cursor: 'pointer', padding: '0', fontSize: '14px' }}
                      >
                        Reply
                      </button>
                      {replyingTo === review._id && (
                        <div className="reply-form" style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                          <img
                            src="https://placehold.co/40x40?text=User"
                            alt="User avatar"
                            style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              value={replyName}
                              onChange={(e) => setReplyName(e.target.value)}
                              placeholder="Your name..."
                              aria-label="Reply name"
                              style={{ width: '100%', marginBottom: '5px', padding: '5px' }}
                            />
                            <input
                              type="email"
                              value={replyEmail}
                              onChange={(e) => setReplyEmail(e.target.value)}
                              placeholder="Your email..."
                              aria-label="Reply email"
                              style={{ width: '100%', marginBottom: '5px', padding: '5px' }}
                            />
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              aria-label="Reply text"
                              style={{ width: '100%', marginBottom: '5px', padding: '5px' }}
                            />
                            <button
                              className="cta-button"
                              onClick={() => handleReply(review._id)}
                              aria-label="Submit reply"
                              style={{ padding: '5px 10px', fontSize: '14px' }}
                            >
                              Submit Reply
                            </button>
                          </div>
                        </div>
                      )}
                      {review.replies?.length > 0 && (
                        <div className="replies-container" style={{ marginTop: '10px', marginLeft: '50px' }}>
                          {review.replies.map((reply) => (
                            <div key={reply._id} className="reply-item" style={{ display: 'flex', marginBottom: '10px' }}>
                              <img
                                src={reply.user?.avatar || 'https://placehold.co/30x30?text=User'}
                                alt="User avatar"
                                className="comment-avatar"
                                style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '10px' }}
                              />
                              <div className="comment-content" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                  <p className="comment-username" style={{ fontWeight: 'bold', margin: '0', marginRight: '5px' }}>
                                    {reply.name || 'Anonymous'}
                                  </p>
                                  <span style={{ color: '#666', fontSize: '12px', marginRight: '5px' }}>•</span>
                                  <p className="comment-time" style={{ color: '#666', fontSize: '12px', margin: '0' }}>
                                    {formatTimestamp(reply.createdAt)}
                                  </p>
                                </div>
                                <p className="comment-text" style={{ margin: '0' }}>{reply.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p>No reviews yet. Be the first to review!</p>
              )}

              <div className="review-form" style={{ marginTop: '20px', display: 'flex', alignItems: 'center' }}>
                <img
                  src="https://placehold.co/40x40?text=User"
                  alt="User avatar"
                  style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>Write a Review</h4>
                  <input
                    type="text"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Your name..."
                    aria-label="Review name"
                    style={{ width: '100%', marginBottom: '5px', padding: '5px' }}
                  />
                  <input
                    type="email"
                    value={reviewEmail}
                    onChange={(e) => setReviewEmail(e.target.value)}
                    placeholder="Your email..."
                    aria-label="Review email"
                    style={{ width: '100%', marginBottom: '5px', padding: '5px' }}
                  />
                  <input
                    type="text"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write your review..."
                    aria-label="Review text"
                    style={{ width: '100%', marginBottom: '5px', padding: '5px' }}
                  />
                  <button
                    className="cta-button"
                    onClick={handleSubmitReview}
                    aria-label="Submit review"
                    style={{ padding: '5px 10px', fontSize: '14px' }}
                  >
                    Submit Review
                  </button>
                  {error && <p className="error-message" style={{ color: 'red', marginTop: '5px' }}>{error}</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="details-footer">
        <p>© 2025 MovieVerse. All rights reserved.</p>
        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </footer>
    </div>
  );
}

export default MovieDetails;