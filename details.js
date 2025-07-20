// details.js - Movie details page functionality with corrected review system

// Get movie ID from URL
const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');

// Global variable for the database
let db;
let currentUser = null;

// This function will be called when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Redirect if no movie ID is present
    if (!movieId) {
        window.location.href = 'home.html';
        return;
    }

    // Initialize Firebase services
    try {
        db = firebase.firestore();
        const auth = firebase.auth();

        // Load movie details from the external API (TMDB)
        loadMovieDetails();

        // Firebase auth state listener
        auth.onAuthStateChanged(user => {
            console.log('Firebase auth state changed. User:', user ? user.uid : 'none');
            currentUser = user;
            
            // Load user reviews from Firestore
            loadUserReviews();
            
            // Configure UI elements that depend on the user's auth state
            setupReviewUI(user);
        });

    } catch (e) {
        console.error("Firebase services could not be initialized.", e);
        const userReviewsSection = document.getElementById('userReviewsSection');
        if(userReviewsSection) {
            userReviewsSection.innerHTML = `<div class="no-reviews"><h3>Could not connect to review service.</h3><p>Please check your connection and try again later.</p></div>`;
        }
    }
});

/**
 * Configures the review submission UI based on the user's authentication state.
 * @param {firebase.User|null} user The currently authenticated user, or null.
 */
function setupReviewUI(user) {
    const addReviewBtn = document.getElementById('addReviewBtn');
    const reviewFormContainer = document.getElementById('reviewFormContainer');
    const cancelReviewBtn = document.getElementById('cancelReviewBtn');
    const submitReviewBtn = document.getElementById('submitReviewBtn');

    if (!addReviewBtn || !reviewFormContainer || !cancelReviewBtn || !submitReviewBtn) {
        console.log('Review UI elements not found');
        return;
    }

    if (user) {
        // User is logged in, allow them to add a review
        addReviewBtn.style.display = 'inline-flex';
        addReviewBtn.onclick = () => {
            reviewFormContainer.style.display = 'block';
            addReviewBtn.style.display = 'none';
            reviewFormContainer.scrollIntoView({ behavior: 'smooth' });
        };
    } else {
        // User is not logged in, prompt them to log in
        addReviewBtn.style.display = 'inline-flex';
        addReviewBtn.onclick = () => {
            alert('Please log in to add a review.');
        };
    }

    // Setup form button listeners
    cancelReviewBtn.onclick = () => {
        reviewFormContainer.style.display = 'none';
        addReviewBtn.style.display = 'inline-flex';
        document.getElementById('reviewTextarea').value = '';
    };

    submitReviewBtn.onclick = submitReview;
}

// Submit a user review to Firestore
async function submitReview() {
    const reviewTextarea = document.getElementById('reviewTextarea');
    const reviewText = reviewTextarea ? reviewTextarea.value.trim() : '';
    
    // Re-check user state at the time of submission
    const user = firebase.auth().currentUser;

    if (!reviewText) {
        alert('Review cannot be empty.');
        return;
    }

    if (!user) {
        alert('You must be logged in to submit a review. Please refresh the page if you have just logged in.');
        return;
    }

    const submitBtn = document.getElementById('submitReviewBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        // Use a more robust app ID detection
        const appId = (typeof __app_id !== 'undefined' && __app_id) ? __app_id : 'cinema-stream-app';
        const collectionPath = `/artifacts/${appId}/public/data/reviews`;
        
        console.log('Submitting review to path:', collectionPath);
        
        const reviewData = {
            movieId: movieId,
            userId: user.uid,
            username: user.displayName || user.email?.split('@')[0] || 'Anonymous User',
            userPhotoURL: user.photoURL || null,
            reviewText: reviewText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection(collectionPath).add(reviewData);
        console.log('Review submitted successfully with ID:', docRef.id);

        // Hide form and show success
        document.getElementById('reviewFormContainer').style.display = 'none';
        document.getElementById('addReviewBtn').style.display = 'inline-flex';
        reviewTextarea.value = '';
        
        // Show success message
        showSuccessMessage('Review submitted successfully!');

        // Refresh reviews
        loadUserReviews();

    } catch (error) {
        console.error("Error adding review:", error);
        let errorMessage = 'Failed to submit review. ';
        
        if (error.code === 'permission-denied') {
            errorMessage += 'Permission denied. Please check your Firestore security rules.';
        } else if (error.code === 'unauthenticated') {
            errorMessage += 'Authentication required. Please log in and try again.';
        } else {
            errorMessage += error.message || 'Unknown error occurred.';
        }
        
        alert(errorMessage);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
    }
}

// Load user reviews from Firestore
function loadUserReviews() {
    const reviewsList = document.getElementById('userReviewsList');
    if (!reviewsList) {
        console.log('User reviews list element not found');
        return;
    }
    
    reviewsList.innerHTML = '<div class="loading-reviews"><i class="fas fa-spinner fa-spin"></i> Loading user reviews...</div>';
    
    const appId = (typeof __app_id !== 'undefined' && __app_id) ? __app_id : 'cinema-stream-app';
    const collectionPath = `/artifacts/${appId}/public/data/reviews`;
    
    console.log('Loading reviews from path:', collectionPath);

    db.collection(collectionPath)
      .where('movieId', '==', movieId)
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
          console.log('Reviews snapshot received, size:', snapshot.size);
          
          if (snapshot.empty) {
              reviewsList.innerHTML = '<div class="no-reviews"><p>Be the first to write a review!</p></div>';
              return;
          }

          reviewsList.innerHTML = '';
          snapshot.forEach(doc => {
              const review = doc.data();
              const reviewElement = createUserReviewItem(review, doc.id);
              reviewsList.appendChild(reviewElement);
          });
      }, error => {
          console.error("Error loading reviews:", error);
          let errorMessage = 'Could not load reviews. ';
          
          if (error.code === 'permission-denied') {
              errorMessage += 'Permission denied. Please check your Firestore security rules allow public reads on the reviews path.';
          } else if (error.code === 'failed-precondition') {
              errorMessage += 'Missing index. Please create a composite index for movieId and createdAt fields.';
          } else {
              errorMessage += error.message || 'Unknown error occurred.';
          }
          
          reviewsList.innerHTML = `<div class="no-reviews" style="color: #ffbaba;"><p>${errorMessage}</p></div>`;
      });
}

// Create an HTML element for a single user review
function createUserReviewItem(review, reviewId) {
    const item = document.createElement('div');
    item.className = 'user-review-item';

    const timestamp = review.createdAt ? review.createdAt.toDate().toLocaleString() : 'Just now';
    const username = review.username || 'Anonymous User';
    
    // Generate avatar if no photo URL provided
    let userPhoto = review.userPhotoURL;
    if (!userPhoto) {
        const firstLetter = username.charAt(0).toUpperCase();
        userPhoto = `https://placehold.co/50x50/333/fff?text=${firstLetter}`;
    }

    item.innerHTML = `
        <div class="review-author-avatar">
            <img src="${userPhoto}" alt="${username}" onerror="this.onerror=null;this.src='https://placehold.co/50x50/333/fff?text=U';">
        </div>
        <div class="review-main">
            <div class="user-review-header">
                <div class="user-review-info">
                    <div class="username">${username}</div>
                </div>
                <div class="review-actions">
                    <div class="timestamp">${timestamp}</div>
                    ${currentUser && currentUser.uid === review.userId ? 
                        `<button class="delete-review-btn" onclick="deleteReview('${reviewId}')" title="Delete Review">
                            <i class="fas fa-trash"></i>
                        </button>` : ''
                    }
                </div>
            </div>
            <div class="user-review-body">
                <p>${review.reviewText}</p>
            </div>
        </div>
    `;
    return item;
}

// Delete a review
async function deleteReview(reviewId) {
    if (!currentUser) {
        alert('You must be logged in to delete reviews.');
        return;
    }

    if (!confirm('Are you sure you want to delete this review?')) {
        return;
    }

    try {
        const appId = (typeof __app_id !== 'undefined' && __app_id) ? __app_id : 'cinema-stream-app';
        const collectionPath = `/artifacts/${appId}/public/data/reviews`;
        
        await db.collection(collectionPath).doc(reviewId).delete();
        console.log('Review deleted successfully');
        showSuccessMessage('Review deleted successfully!');
        
    } catch (error) {
        console.error("Error deleting review:", error);
        alert('Failed to delete review: ' + (error.message || 'Unknown error'));
    }
}

// Show success message
function showSuccessMessage(message) {
    // Create success notification
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Load movie details (unchanged from original)
async function loadMovieDetails() {
    const movie = await api.getMovieDetails(movieId);
    
    if (movie) {
        displayMovieDetails(movie);
        displayCast(movie.credits.cast);
        displaySimilarMovies(movie.similar.results);
        
        // Setup trailer button
        document.getElementById('playTrailer').onclick = async () => {
            const videos = movie.videos.results;
            const trailer = videos.find(v => v.type === 'Trailer') || videos[0];
            
            if (trailer) {
                api.playTrailer(trailer.key);
            } else {
                const videoId = await api.searchYouTubeTrailer(movie.title, movie.release_date.split('-')[0]);
                if (videoId) {
                    api.playTrailer(videoId);
                } else {
                    console.log('Trailer not found'); 
                    alert('Trailer not found.');
                }
            }
        };
        
        // Setup Spotify button
        document.getElementById('spotifyBtn').onclick = () => {
            loadSpotifySoundtrack(movie.title);
        };
        
        // Setup Reviews button
        document.getElementById('reviewsBtn').onclick = () => {
            loadMovieReviews(movie.title, movie.release_date.split('-')[0]);
        };

        // Setup AI Analyze button
        document.getElementById('aiAnalyzeBtn').onclick = () => {
            loadAiAnalysis(movie.title, movie.release_date.split('-')[0], movie.overview);
        };
    }
}

// Display movie details (unchanged from original)
function displayMovieDetails(movie) {
    document.title = `${movie.title} - CinemaStream`;
    document.getElementById('heroBackdrop').style.backgroundImage = `url(${api.getImageUrl(movie.backdrop_path, 'original')})`;
    document.getElementById('moviePoster').src = api.getImageUrl(movie.poster_path);
    document.getElementById('moviePoster').alt = movie.title;
    document.getElementById('movieTitle').textContent = movie.title;
    document.getElementById('movieYear').textContent = movie.release_date.split('-')[0];
    document.getElementById('movieRuntime').textContent = `${movie.runtime} min`;
    document.getElementById('movieRating').textContent = movie.vote_average.toFixed(1);
    document.getElementById('movieOverview').textContent = movie.overview;
    const genresContainer = document.getElementById('movieGenres');
    genresContainer.innerHTML = '';
    movie.genres.forEach(genre => {
        const genreTag = document.createElement('span');
        genreTag.className = 'genre-tag';
        genreTag.textContent = genre.name;
        genresContainer.appendChild(genreTag);
    });
}

// Display cast (unchanged from original)
function displayCast(cast) {
    const castCarousel = document.getElementById('castCarousel');
    castCarousel.innerHTML = '';
    cast.slice(0, 20).forEach(member => {
        const castCard = document.createElement('div');
        castCard.className = 'cast-card';
        const profileImage = member.profile_path 
            ? api.getImageUrl(member.profile_path) 
            : 'https://placehold.co/150x150/000/fff?text=No+Image';
        castCard.innerHTML = `
            <img src="${profileImage}" alt="${member.name}">
            <div class="cast-name">${member.name}</div>
            <div class="cast-character">${member.character}</div>
        `;
        castCarousel.appendChild(castCard);
    });
}

// Load Spotify soundtrack (unchanged from original)
async function loadSpotifySoundtrack(movieTitle) {
    const soundtrackSection = document.getElementById('soundtrackSection');
    const soundtrackList = document.getElementById('soundtrackList');
    
    soundtrackSection.style.display = 'block';
    soundtrackList.innerHTML = '<p>Loading soundtrack...</p>';
    
    const spotifyData = await api.searchSpotifySoundtrack(movieTitle);
    
    if (spotifyData && (spotifyData.albums?.items.length > 0 || spotifyData.tracks?.items.length > 0)) {
        soundtrackList.innerHTML = '';
        
        if (spotifyData.albums?.items.length > 0) {
            spotifyData.albums.items.slice(0, 6).forEach(album => {
                const trackItem = createSpotifyItem(album, 'album');
                soundtrackList.appendChild(trackItem);
            });
        }
        
        if (spotifyData.tracks?.items.length > 0) {
            spotifyData.tracks.items.slice(0, 6).forEach(track => {
                const trackItem = createSpotifyItem(track, 'track');
                soundtrackList.appendChild(trackItem);
            });
        }
    } else {
        soundtrackList.innerHTML = '<p>No soundtrack found for this movie.</p>';
    }
    
    soundtrackSection.scrollIntoView({ behavior: 'smooth' });
}

// Create Spotify item element (unchanged from original)
function createSpotifyItem(item, type) {
    const trackItem = document.createElement('div');
    trackItem.className = 'track-item';
    
    const imageUrl = type === 'album' 
        ? item.images[0]?.url || 'https://placehold.co/60x60/000/fff?text=Album'
        : item.album.images[0]?.url || 'https://placehold.co/60x60/000/fff?text=Track';
    
    const artistName = item.artists.map(a => a.name).join(', ');
    const spotifyUrl = item.external_urls.spotify;
    
    trackItem.innerHTML = `
        <img src="${imageUrl}" alt="${item.name}">
        <div class="track-info">
            <div class="track-name">${item.name}</div>
            <div class="track-artist">${artistName}</div>
        </div>
        <a href="${spotifyUrl}" target="_blank" class="play-spotify">
            <i class="fab fa-spotify"></i>
        </a>
    `;
    
    return trackItem;
}

// Load movie reviews from YouTube (unchanged from original)
async function loadMovieReviews(movieTitle, year) {
    const reviewsSection = document.getElementById('reviewsSection');
    const reviewsList = document.getElementById('reviewsList');
    
    reviewsSection.style.display = 'block';
    reviewsList.innerHTML = '<div class="loading-reviews"><i class="fas fa-spinner fa-spin"></i> Loading reviews...</div>';
    
    try {
        const reviews = await api.searchYouTubeReviews(movieTitle, year);
        
        if (reviews && reviews.length > 0) {
            reviewsList.innerHTML = '';
            
            reviews.forEach(review => {
                const reviewItem = createReviewItem(review);
                reviewsList.appendChild(reviewItem);
            });
        } else {
            reviewsList.innerHTML = `<div class="no-reviews"><h3>No relevant YouTube reviews found.</h3></div>`;
        }
    } catch (error) {
        console.error('Error loading YouTube reviews:', error);
        reviewsList.innerHTML = `<div class="no-reviews"><h3>Error loading YouTube reviews.</h3><p>${error.message}</p></div>`;
    }
    
    reviewsSection.scrollIntoView({ behavior: 'smooth' });
}

// Create review item element (unchanged from original)
function createReviewItem(review) {
    const reviewItem = document.createElement('div');
    reviewItem.className = 'review-item';
    
    const duration = formatDuration(review.contentDetails?.duration || 'PT0S');
    const viewCount = formatNumber(parseInt(review.statistics?.viewCount || '0'));
    const likeCount = parseInt(review.statistics?.likeCount || '0');
    const rating = likeCount > 0 ? ((likeCount / (parseInt(review.statistics?.dislikeCount || '0') + likeCount)) * 5).toFixed(1) : 'N/A';
    const thumbnail = review.snippet.thumbnails?.high?.url || 'https://placehold.co/320x180/000/fff?text=No+Thumbnail';
    const videoId = review.id;
    const channelUrl = `https://www.youtube.com/channel/${review.snippet.channelId}`;
    const channelThumbnail = review.channelThumbnail || 'https://placehold.co/30x30/000/fff?text=C';

    reviewItem.innerHTML = `
        <div class="review-thumbnail">
            <img src="${thumbnail}" alt="${review.snippet.title}">
            <div class="play-overlay"><i class="fas fa-play"></i></div>
            <div class="review-duration">${duration}</div>
        </div>
        <div class="review-content">
            <h3 class="review-title">${review.snippet.title}</h3>
            <div class="review-channel-info">
                <img src="${channelThumbnail}" alt="Channel Profile" class="channel-thumbnail">
                <a href="${channelUrl}" target="_blank" class="review-channel">${review.snippet.channelTitle}</a>
            </div>
            <div class="review-stats">
                <div class="review-views"><i class="fas fa-eye"></i> <span>${viewCount} views</span></div>
                <div class="review-rating"><i class="fas fa-star"></i> <span>${rating}/5</span></div>
            </div>
        </div>
    `;
    
    reviewItem.onclick = () => {
        if (videoId) api.playReviewVideo(videoId);
        else console.error('No video ID found for review');
    };
    
    return reviewItem;
}

// Load AI Analysis for the movie (unchanged from original)
async function loadAiAnalysis(movieTitle, movieYear, movieOverview) {
    const aiSection = document.getElementById('aiAnalysisSection');
    const aiContent = document.getElementById('aiAnalysisContent');

    aiSection.style.display = 'block';
    aiContent.innerHTML = '<div class="loading-reviews" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Analyzing movie with AI...</div>';
    
    aiSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const result = await api.getAiMovieAnalysis(movieTitle, movieYear, movieOverview);

    if (result.success) {
        aiContent.innerHTML = result.analysis;
    } else {
        aiContent.innerHTML = `<div class="no-reviews">${result.fallbackResponse}</div>`;
    }
}

// Format duration from ISO 8601 to readable format (unchanged from original)
function formatDuration(isoDuration) {
    if (!isoDuration) return '0:00';
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Format large numbers (unchanged from original)
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Display similar movies (unchanged from original)
function displaySimilarMovies(movies) {
    const similarMoviesContainer = document.getElementById('similarMovies');
    similarMoviesContainer.innerHTML = '';
    movies.slice(0, 10).forEach(movie => {
        similarMoviesContainer.appendChild(api.createMovieCard(movie));
    });
}

// Close dropdown when clicking outside (unchanged from original)
document.addEventListener('click', (e) => {
    const profileMenu = document.querySelector('.profile-menu');
    const dropdown = document.getElementById('profileDropdown');
    if (profileMenu && dropdown && !profileMenu.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// Add CSS for success notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .delete-review-btn {
        background: none;
        border: none;
        color: #ff4444;
        cursor: pointer;
        padding: 5px;
        font-size: 14px;
        margin-left: 10px;
    }
    
    .delete-review-btn:hover {
        color: #ff0000;
    }
    
    .review-actions {
        display: flex;
        align-items: center;
    }
    
    .loading-reviews {
        text-align: center;
        padding: 20px;
        color: #666;
    }
    
    .no-reviews {
        text-align: center;
        padding: 20px;
        color: #999;
    }
`;
document.head.appendChild(style);