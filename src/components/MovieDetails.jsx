import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import LazyLoad from 'react-lazyload';
import { getMovieDetails, getReviews, submitReview, submitReply, submitReaction } from '../api/api';
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

function MovieDetails() {
  const { source, externalId } = useParams();
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [reviewName, setReviewName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [watchlist, setWatchlist] = useState(JSON.parse(localStorage.getItem('watchlist')) || []);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [reactionCounts, setReactionCounts] = useState({ excellent: 0, good: 0, average: 0, sad: 0 });
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyName, setReplyName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');

  useEffect(() => {
    let isMounted = true;

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

        console.log('Movie Details Response:', movieResponse.data);
        console.log('Reviews Response:', reviewsResponse.data);
        setMovie(movieResponse.data);
        setReviews(Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []);
        setReactionCounts(
          movieResponse.data.reactionCounts || { excellent: 0, good: 0, average: 0, sad: 0 }
        );
        setError(null);
      } catch (err) {
        console.error('Data loading error:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
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
      await submitReaction(source, externalId, reaction);
      const response = await getMovieDetails(source, externalId);
      setReactionCounts(response.data.reactionCounts || { excellent: 0, good: 0, average: 0, sad: 0 });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to submit reaction. Check console for details.');
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
      await submitReply(source, externalId, reviewId, { text: replyText, name: replyName, email: replyEmail });
      const reviewsResponse = await getReviews(source, externalId);
      setReviews(Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []);
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

      {selectedTrailer && (
        <div className="trailer-modal" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="trailer-modal-content" style={{ position: 'relative', width: '80%', maxWidth: '800px', aspectRatio: '16/9' }}>
            <button className="trailer-modal-close" onClick={closeTrailerModal} style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '24px', color: '#fff', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
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

      <header className="details-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', width: '100%', boxSizing: 'border-box' }}>
        <Link to="/" className="home-link" style={{ textDecoration: 'none' }}>
          <h1 className="logo" style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', margin: '10px 0', transition: 'font-size 0.3s ease' }}>MovieVerse</h1>
        </Link>
      </header>

      <div className="movie-content" style={{ marginTop: '20px' }}>
        {movie && (
          <>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#333', margin: '20px 0', textAlign: 'center', transition: 'font-size 0.3s ease' }}>{movie.title || 'Untitled Movie'}</h1>
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

            {movie.screenshots && movie.screenshots.length > 0 && (
              <div className="category-section" style={{ margin: '20px 0' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#333', margin: '20px 0', transition: 'font-size 0.3s ease' }}>Screenshots</h2>
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
            )}

            <div className="storyline" style={{ margin: '20px 0' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#333', marginBottom: '10px', transition: 'font-size 0.3s ease' }}>Storyline</h2>
              <p style={{ fontSize: '1rem', lineHeight: '1.5' }}>{movie.overview || 'No storyline available.'}</p>
            </div>

            <div className="download-links" style={{ margin: '20px 0' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#333', marginBottom: '10px', transition: 'font-size 0.3s ease' }}>Watch Options</h2>
              {movie.directLink ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ margin: '5px 0', fontSize: '1rem' }}>
                    <a href={movie.directLink} target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8', textDecoration: 'none' }}>
                      Watch on Internet Archive
                    </a>
                  </li>
                </ul>
              ) : (
                <p style={{ fontSize: '1rem' }}>No direct watch links available.</p>
              )}
              {movie.watchProviders?.US?.ads?.length > 0 && (
                <div className="watch-free">
                  <h4 style={{ fontSize: '1.2rem', margin: '10px 0' }}>Watch for Free on:</h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {movie.watchProviders.US.ads.map((provider, index) => (
                      <li key={index} style={{ margin: '5px 0', fontSize: '1rem' }}>{provider.provider_name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="reactions" style={{ margin: '20px 0' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#333', marginBottom: '10px', transition: 'font-size 0.3s ease' }}>Reactions</h2>
              <div className="reaction-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {['excellent', 'good', 'average', 'sad'].map((reaction) => (
                  <button
                    key={reaction}
                    className="cta-button"
                    onClick={() => handleReaction(reaction)}
                    disabled={reactionCounts[reaction] > 0}
                    aria-label={`React with ${reaction} to ${movie.title}`}
                    style={{
                      fontSize: '0.9rem',
                      padding: '8px 12px',
                      opacity: reactionCounts[reaction] > 0 ? 0.6 : 1,
                    }}
                  >
                    {{
                      excellent: 'Excellent 👍',
                      good: 'Good 😊',
                      average: 'Average 😐',
                      sad: 'Sad 😢'
                    }[reaction]} ({reactionCounts[reaction] || 0})
                  </button>
                ))}
              </div>
            </div>

            <div className="actions" style={{ margin: '20px 0', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {movie.trailer && movie.trailer !== 'N/A' && (
                <button
                  className="cta-button"
                  onClick={() => openTrailerModal(movie.trailer)}
                  style={{ padding: '10px 20px', fontSize: '1rem' }}
                  aria-label={`Play trailer for ${movie.title}`}
                >
                  Play Trailer
                </button>
              )}
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

            <div className="movie-info" style={{ margin: '20px 0', fontSize: '1rem', lineHeight: '1.5' }}>
              <p><strong>IMDb Rating:</strong> {movie.imdbRating || 'N/A'}</p>
              <p><strong>Release Date:</strong> {movie.releaseDate || 'N/A'}</p>
              <p><strong>Genres:</strong> {movie.genres || 'N/A'}</p>
              <p><strong>Director:</strong> {movie.director || 'N/A'}</p>
              <p><strong>Cast:</strong> {movie.cast?.join(', ') || 'N/A'}</p>
              <p><strong>Runtime:</strong> {movie.runtime || 'N/A'}</p>
              <p><strong>Budget:</strong> {movie.budget || 'N/A'}</p>
              <p><strong>Revenue:</strong> {movie.revenue || 'N/A'}</p>
              <p><strong>Production Companies:</strong> {movie.productionCompanies?.join(', ') || 'N/A'}</p>
              <p><strong>Language:</strong> {movie.language || 'N/A'}</p>
              <p><strong>Country:</strong> {movie.country || 'N/A'}</p>
              <p><strong>Status:</strong> {movie.status || 'N/A'}</p>
              <p><strong>Tagline:</strong> {movie.tagline || 'N/A'}</p>
            </div>

            <div className="reviews-section" style={{ margin: '20px 0' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#333', marginBottom: '10px', transition: 'font-size 0.3s ease' }}>Reviews</h2>
              <form onSubmit={handleSubmitReview} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="Your Name"
                  style={{ padding: '8px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  aria-label="Your name for review"
                />
                <input
                  type="email"
                  value={reviewEmail}
                  onChange={(e) => setReviewEmail(e.target.value)}
                  placeholder="Your Email"
                  style={{ padding: '8px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  aria-label="Your email for review"
                />
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Write your review..."
                  style={{ padding: '8px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc', minHeight: '100px', resize: 'vertical' }}
                  aria-label="Your review text"
                ></textarea>
                <button type="submit" className="cta-button" style={{ padding: '10px 20px', fontSize: '1rem' }} aria-label="Submit review">
                  Submit Review
                </button>
              </form>
              {error && <p style={{ color: 'red', fontSize: '1rem', marginBottom: '10px' }}>{error}</p>}
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review._id} className="review" style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '5px' }}>{review.name}</p>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>{formatTimestamp(review.createdAt)}</p>
                    <p style={{ fontSize: '1rem', marginBottom: '10px' }}>{review.text}</p>
                    {review.replies && review.replies.length > 0 && (
                      <div className="replies" style={{ marginLeft: '20px', paddingLeft: '10px', borderLeft: '2px solid #eee' }}>
                        {review.replies.map((reply) => (
                          <div key={reply._id} style={{ marginBottom: '10px' }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>{reply.name}</p>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>{formatTimestamp(reply.createdAt)}</p>
                            <p style={{ fontSize: '0.9rem' }}>{reply.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {!replyingTo || replyingTo !== review._id ? (
                      <button
                        className="cta-button"
                        onClick={() => setReplyingTo(review._id)}
                        style={{ padding: '8px 12px', fontSize: '0.9rem', marginTop: '10px' }}
                        aria-label={`Reply to ${review.name}'s review`}
                      >
                        Reply
                      </button>
                    ) : (
                      <form onSubmit={() => handleReply(review._id)} style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input
                          type="text"
                          value={replyName}
                          onChange={(e) => setReplyName(e.target.value)}
                          placeholder="Your Name"
                          style={{ padding: '8px', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid #ccc' }}
                          aria-label="Your name for reply"
                        />
                        <input
                          type="email"
                          value={replyEmail}
                          onChange={(e) => setReplyEmail(e.target.value)}
                          placeholder="Your Email"
                          style={{ padding: '8px', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid #ccc' }}
                          aria-label="Your email for reply"
                        />
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply..."
                          style={{ padding: '8px', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px', resize: 'vertical' }}
                          aria-label="Your reply text"
                        ></textarea>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="submit" className="cta-button" style={{ padding: '8px 12px', fontSize: '0.9rem' }} aria-label="Submit reply">
                            Submit Reply
                          </button>
                          <button
                            className="cta-button"
                            onClick={() => setReplyingTo(null)}
                            style={{ padding: '8px 12px', fontSize: '0.9rem', background: '#ccc' }}
                            aria-label="Cancel reply"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '1rem' }}>No reviews yet. Be the first to share your thoughts!</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MovieDetails;