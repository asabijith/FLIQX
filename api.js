// api.js - Enhanced API with Better Gemini Integration

// API Keys (Replace with your actual keys)
const TMDB_API_KEY = '4f87c7ab385a4bab29e9195d359732e5';
const YOUTUBE_API_KEY = 'AIzaSyBUQYVhnSZLN_7j9d3dkJi9rT0Dh03lpGI'; // Ensure this is a valid key with YouTube Data API v3 enabled
const SPOTIFY_CLIENT_ID = '6d5cbc6a56b547c7b960bad581ecbe29';
const SPOTIFY_CLIENT_SECRET = '0989e2e553c74877b4896dc0b1f2ef78';
const GEMINI_API_KEY = 'AIzaSyCmNful5YL4jLcCcYKf_I2ux1Qt0TUhVAw';

// Base URLs
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE_URL = 'https://image.tmdb.org/t/p';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAA9k_wUy8W4DUGGC59XKLf1SSA0kJpflk",
    authDomain: "form-e9a10.firebaseapp.com",
    databaseURL: "https://form-e9a10-default-rtdb.firebaseio.com",
    projectId: "form-e9a10",
    storageBucket: "form-e9a10.firebasestorage.app",
    messagingSenderId: "522860381687",
    appId: "1:522860381687:web:10def6869ab957940adaf2",
    measurementId: "G-ZHT6HE42RM"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// TMDB API Functions
async function fetchTMDB(endpoint, params = {}) {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    
    Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
    });
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`TMDB API HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('TMDB API Error:', error);
        return null;
    }
}

async function getTrendingMovies() {
    return await fetchTMDB('/trending/movie/week');
}

async function getPopularMovies() {
    return await fetchTMDB('/movie/popular');
}

async function getTopRatedMovies() {
    return await fetchTMDB('/movie/top_rated');
}

async function getUpcomingMovies() {
    return await fetchTMDB('/movie/upcoming');
}

async function getMoviesByGenre(genreId) {
    return await fetchTMDB('/discover/movie', { with_genres: genreId });
}

async function getMovieDetails(movieId) {
    return await fetchTMDB(`/movie/${movieId}`, { append_to_response: 'credits,videos,similar' });
}

async function searchMovies(query) {
    if (!query || query.trim() === '') return null;
    return await fetchTMDB('/search/movie', { query: query.trim() });
}

async function getTVSeries() {
    return await fetchTMDB('/tv/popular');
}

async function getKidsMovies() {
    return await fetchTMDB('/discover/movie', { 
        with_genres: '16', // Animation
        'certification.lte': 'PG',
        sort_by: 'popularity.desc'
    });
}

// NEW: Gemini API function for specific movie analysis
async function getAiMovieAnalysis(movieTitle, movieYear, movieOverview) {
    console.log(`Getting AI analysis for: ${movieTitle} (${movieYear})`);

    if (!GEMINI_API_KEY) {
        console.error('No Gemini API key found');
        return { success: false, error: 'No API key' };
    }

    // FIXED: Changed model from 'gemini-pro' to 'gemini-1.5-flash' to resolve the 404 error.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Prompt designed for detailed analysis of a single movie
    const prompt = `You are a sophisticated movie analyst AI. Analyze the movie "${movieTitle}" (${movieYear}).
    Here is the official overview: "${movieOverview}"

    Based on this information, provide a detailed analysis covering the following points in a conversational and insightful manner:

    1.  **Who is this movie for?**: Describe the target audience (e.g., fans of sci-fi, drama lovers, families, etc.).
    2.  **Key Themes**: What are the central themes and ideas explored in the movie? (e.g., love, loss, courage, technology's impact).
    3.  **Overall Tone & Mood**: Describe the feeling of the movie (e.g., dark and gritty, uplifting and heartwarming, suspenseful and thrilling).
    4.  **What to Expect**: Give a spoiler-free idea of what the viewing experience is like. Mention the pacing, visual style, and emotional journey.

    Structure your response as clean, readable HTML using <h3> for titles and <p> for paragraphs. Do not include <html>, <body>, or <head> tags. Start directly with the content.

    Example Output:
    <h3>Who It's For</h3>
    <p>This movie is perfect for...</p>
    <h3>Key Themes</h3>
    <p>The film delves into themes of...</p>
    <h3>Tone and Mood</h3>
    <p>Expect a ... tone, with moments of ...</p>
    <h3>What to Expect</h3>
    <p>This is a ... paced film with stunning visuals...</p>
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                    topP: 0.8,
                    topK: 40,
                    responseMimeType: "text/plain",
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('Empty response from Gemini');
        }

        console.log('Gemini analysis raw response:', text);

        return {
            success: true,
            analysis: text // The response is the HTML content itself
        };

    } catch (error) {
        console.error('Gemini Analysis Error:', error.message);
        return {
            success: false,
            error: error.message,
            fallbackResponse: `<p>Sorry, the AI analysis failed. This could be due to an API key issue or a network problem. Please try again later.</p><p><small>Error: ${error.message}</small></p>`
        };
    }
}


// Enhanced Gemini API Integration
async function getSmartMovieRecommendations(userQuery, maxRetries = 3) {
    console.log('Getting smart movie recommendations for:', userQuery);
    
    if (!GEMINI_API_KEY) {
        console.error('No Gemini API key found');
        return { success: false, error: 'No API key' };
    }

    // FIXED: Changed model from 'gemini-pro' to 'gemini-1.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // Enhanced prompt for better movie understanding
    const prompt = `You are an expert movie consultant AI. A user asked: "${userQuery}"

Please provide a helpful response and movie recommendations based on their query.

The user might be asking about:
1. Movie recommendations by genre, mood, or theme
2. Explaining movie plots, scenes, or endings
3. Finding movies similar to others
4. Answering movie-related questions
5. Describing specific movie scenes they remember

Respond in this EXACT format:

RESPONSE:
[Write a natural, conversational response addressing their query. Be helpful, informative, and engaging. If they're asking about a specific movie or scene, explain it. If they want recommendations, explain why these movies are perfect for them.]

MOVIES:
[
  {
    "title": "Exact Movie Title",
    "year": 2020,
    "reason": "Why this movie matches their request perfectly"
  },
  {
    "title": "Another Movie Title", 
    "year": 2019,
    "reason": "Another reason why this fits their criteria"
  }
]

IMPORTANT RULES:
- Only suggest real, existing movies
- Use exact official movie titles (check spelling carefully)
- Provide accurate release years
- Give 4-6 movie recommendations when appropriate
- If they're asking a question about movies without wanting recommendations, still provide a few related movies
- Make your response personal and engaging
- If they describe a scene, try to identify the movie and recommend similar ones

User query: "${userQuery}"`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Gemini attempt ${attempt}/${maxRetries}`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                        topP: 0.8,
                        topK: 40
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!text) {
                throw new Error('Empty response from Gemini');
            }

            console.log('Gemini raw response:', text);
            
            // Parse the structured response
            const parsed = parseGeminiResponse(text);
            
            if (parsed.success) {
                console.log('Successfully parsed Gemini response');
                return parsed;
            } else {
                throw new Error('Failed to parse response structure');
            }
            
        } catch (error) {
            console.error(`Gemini attempt ${attempt} failed:`, error.message);
            
            if (attempt === maxRetries) {
                return { 
                    success: false, 
                    error: error.message,
                    fallbackResponse: `I understand you're looking for movies related to "${userQuery}". Let me search for some recommendations using our movie database.`
                };
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

// Parse Gemini response into structured format
function parseGeminiResponse(text) {
    try {
        // Extract response section
        const responseMatch = text.match(/RESPONSE:\s*([\s\S]*?)(?=MOVIES:|$)/i);
        const moviesMatch = text.match(/MOVIES:\s*(\[[\s\S]*?\])/i);
        
        let conversationalResponse = '';
        let movieRecommendations = [];
        
        if (responseMatch) {
            conversationalResponse = responseMatch[1].trim();
        }
        
        if (moviesMatch) {
            try {
                const jsonStr = moviesMatch[1].trim();
                movieRecommendations = JSON.parse(jsonStr);
                
                // Validate movie recommendations
                movieRecommendations = movieRecommendations.filter(movie => 
                    movie && 
                    typeof movie.title === 'string' && movie.title.length > 0 &&
                    typeof movie.year === 'number' && movie.year > 1900 && movie.year <= new Date().getFullYear() + 2 &&
                    typeof movie.reason === 'string' && movie.reason.length > 0
                );
                
            } catch (jsonError) {
                console.error('Failed to parse movies JSON:', jsonError);
                movieRecommendations = [];
            }
        }
        
        // Fallback parsing if structured format fails
        if (!conversationalResponse && !movieRecommendations.length) {
            console.log('Structured parsing failed, trying fallback...');
            return parseGeminiFallback(text);
        }
        
        return {
            success: true,
            response: conversationalResponse || 'Here are some movie recommendations for you!',
            movies: movieRecommendations
        };
        
    } catch (error) {
        console.error('Error parsing Gemini response:', error);
        return parseGeminiFallback(text);
    }
}

// Fallback parser for unstructured responses
function parseGeminiFallback(text) {
    try {
        // Try to extract movie titles from various patterns
        const moviePatterns = [
            /\*\*([^*]+?)\s*\((\d{4})\)\*\*/g,  // **Movie Title (Year)**
            /"([^"]+?)"\s*\((\d{4})\)/g,        // "Movie Title" (Year)
            /(\w[^(\n]*?)\s*\((\d{4})\)/g       // Movie Title (Year)
        ];
        
        const movies = [];
        let usedTitles = new Set();
        
        for (const pattern of moviePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null && movies.length < 6) {
                const title = match[1].trim();
                const year = parseInt(match[2]);
                
                if (!usedTitles.has(title.toLowerCase()) && 
                    title.length > 2 && title.length < 100 &&
                    year > 1900 && year <= new Date().getFullYear() + 2) {
                    
                    movies.push({
                        title: title,
                        year: year,
                        reason: `Recommended based on your interest in: "${text.substring(0, 50)}..."`
                    });
                    
                    usedTitles.add(title.toLowerCase());
                }
            }
            
            if (movies.length >= 3) break; // Found enough movies
        }
        
        return {
            success: true,
            response: text.length > 500 ? text.substring(0, 500) + '...' : text,
            movies: movies
        };
        
    } catch (error) {
        console.error('Fallback parsing failed:', error);
        return {
            success: false,
            error: 'Could not parse response',
            response: 'I understand your request. Let me search for movies in our database.',
            movies: []
        };
    }
}

// YouTube API Functions
let player;
let reviewsPlayer;

function onYouTubeIframeAPIReady() {
    console.log('YouTube API Ready');
}

async function searchYouTubeTrailer(movieTitle, year) {
    const query = `${movieTitle} ${year ? year : ''} official trailer`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}&maxResults=1`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('YouTube API Error:', response.status);
            return null;
        }
        
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            return data.items[0].id.videoId;
        }
        return null;
    } catch (error) {
        console.error('YouTube API Error:', error);
        return null;
    }
}

// NEW: Search YouTube Reviews Function - Fetches more details including channel thumbnails
async function searchYouTubeReviews(movieTitle, year) {
    console.log('Searching YouTube reviews for:', movieTitle, year);
    
    // Check if API key is available
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'AIzaSyAVeSrg9RpHmfO-mdMey9TuoEla-zlcTU0') {
        console.warn('YouTube API key is missing or is the placeholder. Review search may fail.');
    }
    
    // Prioritize specific search queries
    const searchQueries = [
        `${movieTitle} review`,
        `${movieTitle} movie review`,
        `${movieTitle} ${year} review`,
        `${movieTitle} film review`
    ];
    
    const allReviews = [];
    const uniqueVideoIds = new Set();
    const uniqueChannelIds = new Set();

    for (let i = 0; i < searchQueries.length && allReviews.length < 10; i++) { // Limit initial search to get a diverse set
        const query = searchQueries[i];
        try {
            console.log(`Searching for: "${query}"`);
            // Request snippet, contentDetails, and statistics for full info
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}&maxResults=10&order=relevance`;
            
            const searchResponse = await fetch(searchUrl);
            
            if (!searchResponse.ok) {
                console.error(`YouTube Search API Error (${searchResponse.status}) for "${query}"`);
                if (searchResponse.status === 403) {
                    throw new Error('YouTube API quota exceeded or access denied. Check your API key and quota.');
                }
                continue;
            }
            
            const searchData = await searchResponse.json();
            console.log(`Search "${query}" returned ${searchData.items?.length || 0} results`);
            
            if (searchData.items && searchData.items.length > 0) {
                const videoIds = [];
                searchData.items.forEach(item => {
                    if (item.id && item.id.videoId && !uniqueVideoIds.has(item.id.videoId)) {
                        videoIds.push(item.id.videoId);
                        uniqueVideoIds.add(item.id.videoId);
                        // Also collect channel IDs for later fetching of channel thumbnails
                        if (item.snippet && item.snippet.channelId) {
                            uniqueChannelIds.add(item.snippet.channelId);
                        }
                    }
                });

                if (videoIds.length > 0) {
                    // Fetch contentDetails and statistics for these videos
                    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;
                    const detailsResponse = await fetch(detailsUrl);

                    if (!detailsResponse.ok) {
                        console.error(`YouTube Details API Error (${detailsResponse.status}) for video IDs: ${videoIds.join(',')}`);
                        continue;
                    }
                    const detailsData = await detailsResponse.json();
                    
                    if (detailsData.items) {
                        detailsData.items.forEach(item => {
                            const title = item.snippet.title.toLowerCase();
                            const hasReviewKeyword = title.includes('review') || 
                                                     title.includes('analysis') || 
                                                     title.includes('explained') ||
                                                     title.includes('breakdown') ||
                                                     title.includes('reaction');
                            
                            const notTrailer = !title.includes('trailer') && 
                                               !title.includes('clip') && 
                                               !title.includes('teaser');
                            
                            // Basic quality filter: require at least 1000 views and a review keyword
                            const minViewsForQuality = 1000; 
                            const viewCount = parseInt(item.statistics?.viewCount || '0');

                            if (hasReviewKeyword && notTrailer && viewCount >= minViewsForQuality) {
                                allReviews.push(item);
                            }
                        });
                    }
                }
            }
            
        } catch (error) {
            console.error(`Error during YouTube API call for "${query}":`, error.message);
            // Re-throw if it's an API key/quota issue to be handled by the caller (details.js)
            if (error.message.includes('API quota exceeded') || error.message.includes('access denied')) {
                throw error; 
            }
        }
    }

    // Now, fetch channel thumbnails for all unique channel IDs found
    const channelThumbnails = {};
    if (uniqueChannelIds.size > 0) {
        try {
            const channelIdsString = Array.from(uniqueChannelIds).join(',');
            const channelDetailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIdsString}&key=${YOUTUBE_API_KEY}`;
            const channelDetailsResponse = await fetch(channelDetailsUrl);
            if (channelDetailsResponse.ok) {
                const channelDetailsData = await channelDetailsResponse.json();
                if (channelDetailsData.items) {
                    channelDetailsData.items.forEach(channel => {
                        // Store the default channel thumbnail
                        channelThumbnails[channel.id] = channel.snippet.thumbnails.default.url; 
                    });
                }
            } else {
                console.warn(`Failed to fetch channel details: ${channelDetailsResponse.status} - ${await channelDetailsResponse.text()}`);
            }
        } catch (error) {
            console.error('Error fetching channel thumbnails:', error);
        }
    }

    // Attach channel thumbnails to the reviews
    const reviewsWithChannelThumbnails = allReviews.map(review => {
        const channelId = review.snippet.channelId;
        const thumbnail = channelThumbnails[channelId] || 'https://placehold.co/30x30/000/fff?text=C'; // Fallback
        return { ...review, channelThumbnail: thumbnail };
    });

    // Sort by view count (descending) to get "top quality" implicitly
    reviewsWithChannelThumbnails.sort((a, b) => {
        const viewsA = parseInt(a.statistics?.viewCount || '0');
        const viewsB = parseInt(b.statistics?.viewCount || '0');
        return viewsB - viewsA;
    });

    console.log(`Found ${reviewsWithChannelThumbnails.length} relevant reviews for ${movieTitle}`);
    
    return reviewsWithChannelThumbnails.slice(0, 8); // Return top 8 relevant reviews
}

// Helper function to parse ISO 8601 duration to seconds
function parseISO8601Duration(duration) {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return (hours * 3600) + (minutes * 60) + seconds;
}

function playTrailer(videoId) {
    const modal = document.querySelector('.video-modal');
    if (!modal) return;
    
    modal.classList.add('active');
    
    if (player) {
        player.loadVideoById(videoId);
    } else {
        player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'autoplay': 1,
                'controls': 1,
                'modestbranding': 1,
                'rel': 0
            },
            events: {
                'onStateChange': onPlayerStateChange
            }
        });
    }
}

// NEW: Play Review Video Function
function playReviewVideo(videoId) {
    const modal = document.querySelector('.reviews-modal');
    if (!modal) {
        console.error('Reviews modal not found');
        return;
    }
    
    modal.classList.add('active');
    
    if (reviewsPlayer) {
        reviewsPlayer.loadVideoById(videoId);
    } else {
        reviewsPlayer = new YT.Player('reviewsPlayer', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'autoplay': 1,
                'controls': 1,
                'modestbranding': 1,
                'rel': 0
            },
            events: {
                'onStateChange': onReviewsPlayerStateChange
            }
        });
    }
}

// NEW: Close Review Video Function
function closeReviewsVideo() {
    const modal = document.querySelector('.reviews-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    if (reviewsPlayer) {
        reviewsPlayer.stopVideo();
    }
}

function closeVideo() {
    const modal = document.querySelector('.video-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    if (player) {
        player.stopVideo();
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        closeVideo();
    }
}

// NEW: Reviews Player State Change Handler
function onReviewsPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        closeReviewsVideo();
    }
}

// Spotify API Functions
let spotifyToken = null;

async function getSpotifyToken() {
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
            },
            body: 'grant_type=client_credentials'
        });
        
        if (!response.ok) {
            throw new Error(`Spotify Token HTTP ${response.status}`);
        }
        
        const data = await response.json();
        spotifyToken = data.access_token;
        return spotifyToken;
    } catch (error) {
        console.error('Spotify Token Error:', error);
        return null;
    }
}

async function searchSpotifySoundtrack(movieTitle) {
    if (!spotifyToken) {
        await getSpotifyToken();
    }
    
    const query = `${movieTitle} soundtrack`;
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album,track&limit=10`;
    
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${spotifyToken}` }
        });
        
        if (response.status === 401) {
            await getSpotifyToken();
            return searchSpotifySoundtrack(movieTitle);
        }
        
        if (!response.ok) {
            throw new Error(`Spotify API HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Spotify API Error:', error);
        return null;
    }
}

// Enhanced Movie Search with AI Integration
async function searchMoviesWithAI(query) {
    console.log('Searching movies with AI for:', query);
    
    // First try to get AI recommendations
    const aiResult = await getSmartMovieRecommendations(query);
    
    if (aiResult.success && aiResult.movies.length > 0) {
        console.log('AI found movie recommendations:', aiResult.movies.length);
        
        // Find these movies in TMDB
        const tmdbMovies = [];
        
        for (const aiMovie of aiResult.movies) {
            try {
                const searchResults = await searchMovies(aiMovie.title);
                
                if (searchResults?.results?.length > 0) {
                    // Find best match
                    let bestMatch = searchResults.results[0];
                    
                    // Try to match by year
                    const yearMatch = searchResults.results.find(movie => {
                        if (!movie.release_date) return false;
                        const movieYear = parseInt(movie.release_date.split('-')[0]);
                        return Math.abs(movieYear - aiMovie.year) <= 2;
                    });
                    
                    if (yearMatch) {
                        bestMatch = yearMatch;
                    }
                    
                    tmdbMovies.push({
                        ...bestMatch,
                        aiReason: aiMovie.reason,
                        aiRecommended: true
                    });
                }
            } catch (error) {
                console.error(`Error finding ${aiMovie.title} in TMDB:`, error);
            }
        }
        
        return {
            success: true,
            response: aiResult.response,
            movies: tmdbMovies
        };
    }
    
    // Fallback to regular TMDB search
    console.log('AI failed, using TMDB fallback');
    const searchResults = await searchMovies(query);
    
    if (searchResults?.results?.length > 0) {
        return {
            success: true,
            response: `Found movies matching "${query}":`,
            movies: searchResults.results.slice(0, 6).map(movie => ({
                ...movie,
                aiReason: `Search result for: "${query}"`,
                directSearch: true
            }))
        };
    }
    
    return {
        success: false,
        response: aiResult.fallbackResponse || `Sorry, I couldn't find movies for "${query}". Try a different search term.`,
        movies: []
    };
}

// Utility Functions
function getImageUrl(path, size = 'w500') {
    if (!path) return 'https://placehold.co/500x750/000/fff?text=No+Image'; // Updated placeholder
    return `${TMDB_IMG_BASE_URL}/${size}${path}`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).getFullYear();
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => window.location.href = `details.html?id=${movie.id}`;
    
    card.innerHTML = `
        <img src="${getImageUrl(movie.poster_path)}" alt="${movie.title}">
        <div class="movie-info">
            <h3 class="movie-title">${movie.title}</h3>
            <div class="movie-meta">
                <span>${formatDate(movie.release_date)}</span>
                <span class="movie-rating">
                    <i class="fas fa-star"></i>
                    ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                </span>
            </div>
        </div>
    `;
    
    return card;
}

// Auth Functions
function checkAuth() {
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            updateUserProfile(user);
        }
    });
}

function updateUserProfile(user) {
    const navProfilePic = document.getElementById('navProfilePic');
    const dropdownProfilePic = document.getElementById('dropdownProfilePic');
    const username = document.getElementById('username');
    const userEmail = document.getElementById('userEmail');
    
    if (navProfilePic) navProfilePic.src = user.photoURL || 'https://placehold.co/150x150/000/fff?text=User'; // Updated placeholder
    if (dropdownProfilePic) dropdownProfilePic.src = user.photoURL || 'https://placehold.co/150x150/000/fff?text=User'; // Updated placeholder
    if (username) username.textContent = user.displayName || 'User';
    if (userEmail) userEmail.textContent = user.email || 'email@example.com';
}

function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = 'index.html';
    }).catch(error => {
        console.error('Logout Error:', error);
    });
}

function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Export API functions
window.api = {
    // TMDB Functions
    fetchTMDB,
    getTrendingMovies,
    getPopularMovies,
    getTopRatedMovies,
    getUpcomingMovies,
    getMoviesByGenre,
    getMovieDetails,
    searchMovies,
    getTVSeries,
    getKidsMovies,
    
    // YouTube Functions
    searchYouTubeTrailer,
    searchYouTubeReviews, 
    playTrailer,
    playReviewVideo, 
    closeVideo,
    closeReviewsVideo, 
    
    // Spotify Functions
    searchSpotifySoundtrack,
    
    // Enhanced AI Functions
    getSmartMovieRecommendations,
    searchMoviesWithAI,
    getAiMovieAnalysis,
    
    // Utility Functions
    getImageUrl,
    formatDate,
    createMovieCard,
    
    // Auth Functions
    checkAuth,
    logout,
    toggleProfileMenu
};
