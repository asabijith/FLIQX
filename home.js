
// home.js - Home page functionality

// Check authentication
api.checkAuth();

// Slider variables
let currentSlide = 0;
let slides = [];
let slideInterval;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadTrendingMovies();
    await loadMovieSections();
    setupSearch();
    startSlideShow();
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
});

// Load trending movies for hero slider
async function loadTrendingMovies() {
    const data = await api.getTrendingMovies();
    if (data && data.results) {
        slides = data.results.slice(0, 5);
        // Fetch cast data for each movie
        for (let movie of slides) {
            const details = await api.getMovieDetails(movie.id);
            movie.cast = details?.credits?.cast?.slice(0, 4) || []; // Limit to 4 cast members
        }
        createSlides();
    }
}

// Create hero slides
function createSlides() {
    const sliderContainer = document.querySelector('.slider-container');
    const dotsContainer = document.querySelector('.slider-dots');
    
    sliderContainer.innerHTML = ''; // Clear existing slides
    dotsContainer.innerHTML = ''; // Clear existing dots
    
    slides.forEach((movie, index) => {
        // Create slide
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.style.backgroundImage = `url(${api.getImageUrl(movie.backdrop_path, 'original')})`;
        
        // Generate cast HTML
        const castHTML = movie.cast.map(member => `
            <div class="cast-item">
                <img src="${member.profile_path ? api.getImageUrl(member.profile_path, 'w185') : 'https://via.placeholder.com/60?text=No+Image'}" alt="${member.name}">
                <span class="cast-name">${member.name}</span>
            </div>
        `).join('');
        
        slide.innerHTML = `
            <div class="slide-content">
                <h1 class="slide-title">${movie.title}</h1>
                <p class="slide-overview">${movie.overview}</p>
                <div class="slide-buttons">
                    <button class="btn btn-play" onclick="watchTrailer(${movie.id}, '${movie.title.replace(/'/g, "\\'")}', ${movie.release_date ? movie.release_date.split('-')[0] : ''})">
                        <i class="fas fa-play"></i> Watch Trailer
                    </button>
                    <button class="btn btn-info" onclick="viewDetails(${movie.id})">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                </div>
            </div>
            <div class="cast-container">
                ${castHTML}
            </div>
        `;
        
        sliderContainer.appendChild(slide);
        
        // Create dot
        const dot = document.createElement('span');
        dot.className = 'dot';
        if (index === 0) dot.classList.add('active');
        dot.onclick = () => goToSlide(index);
        dotsContainer.appendChild(dot);
    });
}

// Slider functions
function changeSlide(direction) {
    currentSlide += direction;
    if (currentSlide >= slides.length) currentSlide = 0;
    if (currentSlide < 0) currentSlide = slides.length - 1;
    updateSlider();
    resetSlideInterval();
}

function goToSlide(index) {
    currentSlide = index;
    updateSlider();
    resetSlideInterval();
}

function updateSlider() {
    const sliderContainer = document.querySelector('.slider-container');
    const dots = document.querySelectorAll('.dot');
    
    sliderContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

function startSlideShow() {
    slideInterval = setInterval(() => {
        changeSlide(1);
    }, 5000);
}

function resetSlideInterval() {
    clearInterval(slideInterval);
    startSlideShow();
}

function pauseSlideShow() {
    clearInterval(slideInterval);
}

// Load movie sections
async function loadMovieSections() {
    // Trending Movies
    const trendingData = await api.getTrendingMovies();
    if (trendingData && trendingData.results) {
        populateCarousel('trendingMovies', trendingData.results);
    }
    
    // Popular Movies
    const popularData = await api.getPopularMovies();
    if (popularData && popularData.results) {
        populateCarousel('popularMovies', popularData.results);
    }
    
    // Top Rated Movies
    const topRatedData = await api.getTopRatedMovies();
    if (topRatedData && topRatedData.results) {
        populateCarousel('topRatedMovies', topRatedData.results);
    }
    
    // Action Movies
    const actionData = await api.getMoviesByGenre(28); // 28 is Action genre ID
    if (actionData && actionData.results) {
        populateCarousel('actionMovies', actionData.results);
    }
}

// Populate movie carousel
function populateCarousel(carouselId, movies) {
    const carousel = document.getElementById(carouselId);
    carousel.innerHTML = '';
    
    movies.forEach(movie => {
        carousel.appendChild(api.createMovieCard(movie));
    });
}

// Watch trailer
async function watchTrailer(movieId, title, year) {
    console.log('Attempting to play trailer for:', title, year);
    pauseSlideShow(); // Pause slideshow when trailer starts
    const movieDetails = await api.getMovieDetails(movieId);
    let videoId = null;
    
    if (movieDetails?.videos?.results?.length > 0) {
        const trailer = movieDetails.videos.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
        if (trailer) {
            videoId = trailer.key;
            console.log('TMDB trailer found:', videoId);
        }
    }
    
    if (!videoId) {
        console.log('Falling back to YouTube search');
        videoId = await api.searchYouTubeTrailer(title, year);
    }
    
    if (videoId) {
        api.playTrailer(videoId);
    } else {
        console.warn('Trailer not found for:', title);
        alert('Trailer not found');
        startSlideShow(); // Resume slideshow if no trailer is found
    }
}

// View movie details
function viewDetails(movieId) {
    window.location.href = `details.html?id=${movieId}`;
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const query = e.target.value.trim();
            if (query.length > 2) {
                const results = await api.searchMovies(query);
                displaySearchResults(results);
            }
        }, 500);
    });
}

// Display search results
function displaySearchResults(data) {
    if (data && data.results && data.results.length > 0) {
        // Clear existing sections
        document.querySelectorAll('.movie-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Create search results section
        let searchSection = document.getElementById('searchResults');
        if (!searchSection) {
            searchSection = document.createElement('section');
            searchSection.id = 'searchResults';
            searchSection.className = 'movie-section';
            searchSection.innerHTML = `
                <h2 class="section-title">Search Results</h2>
                <div class="movie-carousel" id="searchResultsCarousel"></div>
            `;
            document.querySelector('.hero-slider').after(searchSection);
        }
        
        searchSection.style.display = 'block';
        populateCarousel('searchResultsCarousel', data.results);
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const profileMenu = document.querySelector('.profile-menu');
    const dropdown = document.getElementById('profileDropdown');
    
    if (!profileMenu.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// Resume slideshow when trailer ends or modal is closed
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-video')) {
        startSlideShow();
    }
});
