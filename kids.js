// kids.js - Kids page functionality

// Check authentication
api.checkAuth();

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadKidsMovies();
    setupSearch();
});

// Load all kids movie sections
async function loadKidsMovies() {
    // Popular Kids Movies
    const kidsData = await api.getKidsMovies();
    if (kidsData && kidsData.results) {
        populateCarousel('popularKidsMovies', kidsData.results);
    }
    
    // Animated Movies
    const animatedData = await api.getMoviesByGenre(16); // Animation genre
    if (animatedData && animatedData.results) {
        populateCarousel('animatedMovies', animatedData.results);
    }
    
    // Disney Movies (search for Disney productions)
    const disneyData = await api.fetchTMDB('/discover/movie', {
        with_companies: '2', // Disney company ID
        with_genres: '16,10751', // Animation and Family
        sort_by: 'popularity.desc'
    });
    if (disneyData && disneyData.results) {
        populateCarousel('disneyMovies', disneyData.results);
    }
    
    // Educational Movies
    const educationalData = await api.fetchTMDB('/discover/movie', {
        with_genres: '99,10751', // Documentary and Family
        sort_by: 'popularity.desc'
    });
    if (educationalData && educationalData.results) {
        populateCarousel('educationalMovies', educationalData.results);
    }
}

// Populate movie carousel
function populateCarousel(carouselId, movies) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    carousel.innerHTML = '';
    
    movies.forEach(movie => {
        const card = createKidsMovieCard(movie);
        carousel.appendChild(card);
    });
}

// Create kid-friendly movie card
function createKidsMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => viewDetails(movie.id);
    
    card.innerHTML = `
        <img src="${api.getImageUrl(movie.poster_path)}" alt="${movie.title}">
        <div class="movie-info">
            <h3 class="movie-title">${movie.title}</h3>
            <div class="movie-meta">
                <span>${movie.release_date ? api.formatDate(movie.release_date) : 'N/A'}</span>
                <span class="movie-rating">
                    <i class="fas fa-star"></i>
                    ${movie.vote_average.toFixed(1)}
                </span>
            </div>
        </div>
    `;
    
    return card;
}

// Filter movies by age category
async function filterByAge(category) {
    let params = {
        sort_by: 'popularity.desc',
        with_genres: '16,10751' // Animation and Family
    };
    
    switch(category) {
        case 'preschool':
            params['certification.lte'] = 'G';
            params['with_keywords'] = '10683'; // Preschool keyword
            break;
        case 'elementary':
            params['certification.lte'] = 'PG';
            break;
        case 'tweens':
            params['certification.lte'] = 'PG-13';
            break;
        default:
            // All ages - no additional filters
            break;
    }
    
    const data = await api.fetchTMDB('/discover/movie', params);
    if (data && data.results) {
        // Clear all carousels and show filtered results
        document.querySelectorAll('.movie-carousel').forEach(carousel => {
            carousel.innerHTML = '';
        });
        
        populateCarousel('popularKidsMovies', data.results);
        
        // Highlight selected category
        document.querySelectorAll('.category-card').forEach(card => {
            card.style.transform = 'scale(1)';
        });
        event.target.closest('.category-card').style.transform = 'scale(1.1)';
    }
}

// View movie details
function viewDetails(movieId) {
    // Check if it's appropriate for kids before redirecting
    checkMovieRating(movieId);
}

// Check movie rating before showing
async function checkMovieRating(movieId) {
    const movie = await api.getMovieDetails(movieId);
    
    if (movie) {
        // Simple check - in real app, use proper content filtering
        const isAppropriate = !movie.adult && 
            (movie.vote_average > 5 || movie.popularity > 50);
        
        if (isAppropriate) {
            window.location.href = `details.html?id=${movieId}`;
        } else {
            alert('This movie might not be suitable for kids. Please check with an adult.');
        }
    }
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
                if (results && results.results) {
                    // Filter for kid-friendly movies
                    const kidsMovies = results.results.filter(movie => !movie.adult);
                    displaySearchResults(kidsMovies);
                }
            } else {
                // Reload default movies when search is cleared
                loadKidsMovies();
            }
        }, 500);
    });
}

// Display search results
function displaySearchResults(movies) {
    // Clear all carousels
    document.querySelectorAll('.movie-carousel').forEach(carousel => {
        carousel.innerHTML = '';
    });
    
    // Show results in the first carousel
    populateCarousel('popularKidsMovies', movies);
    
    // Update section title
    const firstSection = document.querySelector('.movie-section .section-title');
    if (firstSection) {
        firstSection.textContent = 'Search Results';
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

// Make the page more interactive for kids
window.addEventListener('load', () => {
    // Add fun hover effects to category cards
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.05) rotate(2deg)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1) rotate(0)';
        });
    });
    
    // Add rainbow effect to hero title
    const heroTitle = document.querySelector('.hero-content h1');
    if (heroTitle) {
        const colors = ['#ff6b6b', '#9c88ff', '#4cd137', '#0097e6', '#ffa502'];
        let colorIndex = 0;
        
        setInterval(() => {
            heroTitle.style.color = colors[colorIndex];
            colorIndex = (colorIndex + 1) % colors.length;
        }, 2000);
    }
});