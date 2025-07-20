// series.js - TV Series page functionality

// Check authentication
api.checkAuth();

// Current filter genre
let currentGenre = 'all';

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadHeroSlider();
    await loadAllSeries();
    setupSearch();
    
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

// Load hero slider with trending series
async function loadHeroSlider() {
    const data = await api.fetchTMDB('/trending/tv/week');
    if (data && data.results && data.results.length > 0) {
        const heroSlider = document.getElementById('heroSlider');
        const randomShow = data.results[Math.floor(Math.random() * 5)];
        
        heroSlider.style.backgroundImage = `url(${api.getImageUrl(randomShow.backdrop_path, 'original')})`;
        
        // Change background every 10 seconds
        let currentIndex = 0;
        setInterval(() => {
            currentIndex = (currentIndex + 1) % 5;
            const show = data.results[currentIndex];
            heroSlider.style.backgroundImage = `url(${api.getImageUrl(show.backdrop_path, 'original')})`;
        }, 10000);
    }
}

// Load all series sections
async function loadAllSeries() {
    // Trending Series
    const trendingData = await api.fetchTMDB('/trending/tv/week');
    if (trendingData && trendingData.results) {
        populateGrid('trendingSeries', trendingData.results);
    }
    
    // Popular Series
    const popularData = await api.getTVSeries();
    if (popularData && popularData.results) {
        populateGrid('popularSeries', popularData.results);
    }
    
    // Top Rated Series
    const topRatedData = await api.fetchTMDB('/tv/top_rated');
    if (topRatedData && topRatedData.results) {
        populateGrid('topRatedSeries', topRatedData.results);
    }
    
    // Netflix Originals
    const netflixData = await api.fetchTMDB('/discover/tv', {
        with_networks: '213', // Netflix network ID
        sort_by: 'popularity.desc'
    });
    if (netflixData && netflixData.results) {
        populateGrid('netflixSeries', netflixData.results);
    }
}

// Populate series grid
function populateGrid(gridId, series) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    grid.innerHTML = '';
    
    series.forEach(show => {
        const card = createSeriesCard(show);
        grid.appendChild(card);
    });
}

// Create series card
function createSeriesCard(show) {
    const card = document.createElement('div');
    card.className = 'series-card';
    card.onclick = () => showSeriesDetails(show.id);
    
    const firstAirYear = show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A';
    
    card.innerHTML = `
        <img src="${api.getImageUrl(show.poster_path)}" alt="${show.name}">
        <div class="series-info">
            <h3 class="series-title">${show.name}</h3>
            <div class="series-meta">
                <span class="series-year">${firstAirYear}</span>
                <span class="series-rating">
                    <i class="fas fa-star"></i>
                    ${show.vote_average.toFixed(1)}
                </span>
            </div>
        </div>
    `;
    
    return card;
}

// Filter by genre
async function filterByGenre(genreId) {
    currentGenre = genreId;
    
    // Update active button
    document.querySelectorAll('.genre-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (genreId === 'all') {
        await loadAllSeries();
    } else {
        const data = await api.fetchTMDB('/discover/tv', {
            with_genres: genreId,
            sort_by: 'popularity.desc'
        });
        
        if (data && data.results) {
            // Clear all grids
            document.querySelectorAll('.series-grid').forEach(grid => {
                grid.innerHTML = '';
            });
            
            // Show filtered results in trending section
            populateGrid('trendingSeries', data.results);
            
            // Update section title
            const trendingTitle = document.querySelector('.series-section .section-title');
            if (trendingTitle) {
                const genreName = event.target.textContent;
                trendingTitle.textContent = `${genreName} Series`;
            }
        }
    }
}

// Show series details in modal
async function showSeriesDetails(seriesId) {
    const modal = document.getElementById('seriesModal');
    const modalBody = document.getElementById('modalBody');
    
    modal.classList.add('active');
    modalBody.innerHTML = '<p style="text-align: center; padding: 50px;">Loading...</p>';
    
    const series = await api.fetchTMDB(`/tv/${seriesId}`, {
        append_to_response: 'credits,videos,similar,season/1'
    });
    
    if (series) {
        const firstAirYear = series.first_air_date ? series.first_air_date.split('-')[0] : 'N/A';
        const lastAirYear = series.last_air_date ? series.last_air_date.split('-')[0] : 'Present';
        const yearsAired = firstAirYear === lastAirYear ? firstAirYear : `${firstAirYear} - ${lastAirYear}`;
        
        modalBody.innerHTML = `
            <img src="${api.getImageUrl(series.backdrop_path, 'original')}" alt="${series.name}" class="modal-backdrop">
            <div class="modal-info">
                <h2 class="modal-title">${series.name}</h2>
                <div class="modal-meta">
                    <span>${yearsAired}</span>
                    <span>${series.number_of_seasons} Season${series.number_of_seasons > 1 ? 's' : ''}</span>
                    <span>${series.number_of_episodes} Episodes</span>
                    <span class="modal-rating">
                        <i class="fas fa-star"></i> ${series.vote_average.toFixed(1)}
                    </span>
                </div>
                <p class="modal-overview">${series.overview}</p>
                <div class="modal-buttons">
                    <button class="btn btn-watch" onclick="watchFirstEpisode(${series.id})">
                        <i class="fas fa-play"></i> Watch S1 E1
                    </button>
                    <button class="btn btn-trailer" onclick="playSeriesTrailer(${series.id}, '${series.name}')">
                        <i class="fas fa-film"></i> Watch Trailer
                    </button>
                </div>
                
                <div class="seasons-container">
                    <h3>Seasons</h3>
                    <div class="season-tabs">
                        ${series.seasons.filter(s => s.season_number > 0).map((season, index) => `
                            <button class="season-tab ${index === 0 ? 'active' : ''}" 
                                    onclick="loadSeason(${series.id}, ${season.season_number}, this)">
                                Season ${season.season_number}
                            </button>
                        `).join('')}
                    </div>
                    <div class="episodes-list" id="episodesList">
                        <!-- Episodes will be loaded here -->
                    </div>
                </div>
            </div>
        `;
        
        // Load first season episodes
        if (series.seasons.length > 0) {
            const firstSeasonNumber = series.seasons.find(s => s.season_number > 0)?.season_number || 1;
            await loadSeason(series.id, firstSeasonNumber);
        }
    }
}

// Load season episodes
async function loadSeason(seriesId, seasonNumber, buttonElement) {
    // Update active tab
    if (buttonElement) {
        document.querySelectorAll('.season-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        buttonElement.classList.add('active');
    }
    
    const episodesList = document.getElementById('episodesList');
    episodesList.innerHTML = '<p>Loading episodes...</p>';
    
    const seasonData = await api.fetchTMDB(`/tv/${seriesId}/season/${seasonNumber}`);
    
    if (seasonData && seasonData.episodes) {
        episodesList.innerHTML = seasonData.episodes.map(episode => `
            <div class="episode-item">
                <img src="${api.getImageUrl(episode.still_path, 'w300')}" alt="${episode.name}" class="episode-thumb">
                <div class="episode-info">
                    <h4 class="episode-title">E${episode.episode_number}: ${episode.name}</h4>
                    <p class="episode-description">${episode.overview || 'No description available.'}</p>
                </div>
            </div>
        `).join('');
    }
}

// Watch first episode
async function watchFirstEpisode(seriesId) {
    alert('This would play the first episode. In a real app, this would connect to a streaming service.');
}

// Play series trailer
async function playSeriesTrailer(seriesId, seriesName) {
    const series = await api.fetchTMDB(`/tv/${seriesId}/videos`);
    
    if (series && series.results && series.results.length > 0) {
        const trailer = series.results.find(v => v.type === 'Trailer') || series.results[0];
        api.playTrailer(trailer.key);
    } else {
        const videoId = await api.searchYouTubeTrailer(seriesName, 'tv series');
        if (videoId) {
            api.playTrailer(videoId);
        } else {
            alert('Trailer not found');
        }
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('seriesModal');
    modal.classList.remove('active');
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
                const results = await api.fetchTMDB('/search/tv', { query });
                if (results && results.results) {
                    displaySearchResults(results.results);
                }
            } else {
                // Reload default series when search is cleared
                loadAllSeries();
            }
        }, 500);
    });
}

// Display search results
function displaySearchResults(series) {
    // Clear all grids
    document.querySelectorAll('.series-grid').forEach(grid => {
        grid.innerHTML = '';
    });
    
    // Show results in trending section
    populateGrid('trendingSeries', series);
    
    // Update section title
    const trendingTitle = document.querySelector('.series-section .section-title');
    if (trendingTitle) {
        trendingTitle.textContent = 'Search Results';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const profileMenu = document.querySelector('.profile-menu');
    const dropdown = document.getElementById('profileDropdown');
    
    if (!profileMenu.contains(e.target)) {
        dropdown.classList.remove('active');
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('seriesModal');
    if (e.target === modal) {
        closeModal();
    }
});