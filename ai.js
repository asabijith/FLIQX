// ai.js - ENHANCED Gemini AI Movie Bot (2025 ACCURACY FIXED)

api.checkAuth();

document.addEventListener('DOMContentLoaded', () => {
    setupChatInput();
    console.log('AI Movie System loaded');
    console.log('TMDB API Key exists:', !!TMDB_API_KEY);
    console.log('Gemini API Key exists:', !!GEMINI_API_KEY);
    
    // Test Gemini immediately
    testGeminiConnection();
});

function setupChatInput() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.querySelector('.send-btn');

    if (!chatInput || !sendBtn) {
        console.error('Chat elements not found');
        return;
    }

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);
}

async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;

    chatInput.value = '';
    addMessage(message, 'user');
    showTypingIndicator();

    console.log('Processing query:', message);

    try {
        // STEP 1: Call Enhanced Gemini API with 2025 context
        console.log('🤖 Calling Enhanced Gemini API...');
        const geminiResponse = await callEnhancedGeminiAPI(message);
        
        removeTypingIndicator();
        
        if (geminiResponse && geminiResponse.success) {
            console.log('✅ Gemini responded successfully');
            
            // STEP 2: Show Gemini response
            addMessage(geminiResponse.text, 'ai');
            
            // STEP 3: Extract movies with enhanced accuracy
            const movieTitles = extractMoviesFromTextEnhanced(geminiResponse.text);
            console.log('🎬 Found movies:', movieTitles);
            
            if (movieTitles.length > 0) {
                await showMoviesFromGeminiEnhanced(movieTitles);
            }
        } else {
            console.log('❌ Gemini failed, trying enhanced fallback');
            addMessage("I'm having connection issues. Let me search our latest movie database.", 'ai');
            await searchTMDBDirectlyEnhanced(message);
        }
        
    } catch (error) {
        removeTypingIndicator();
        console.error('💥 Complete failure:', error);
        addMessage("Technical error occurred. Searching latest movie database...", 'ai');
        await searchTMDBDirectlyEnhanced(message);
    }
}

// ENHANCED Gemini API call with 2025 context and accuracy
async function callEnhancedGeminiAPI(userQuery) {
    console.log('🚀 Starting Enhanced Gemini API call for:', userQuery);
    
    if (!GEMINI_API_KEY) {
        console.error('❌ No Gemini API key');
        return { success: false, error: 'No API key' };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    // ENHANCED PROMPT with current date context and accuracy instructions
    const currentDate = new Date().toLocaleDateString();
    const prompt = `You are an expert movie AI assistant with access to the most current movie information. Today is ${currentDate} (July 2025).

IMPORTANT CONTEXT:
- Current year: 2025
- Focus on the most recent and relevant movies
- When user asks for recent/new/latest movies, prioritize 2024-2025 releases
- Be accurate with release dates and movie information
- Include both theatrical and streaming releases

User query: "${userQuery}"

Please provide a detailed, helpful response about movies. When mentioning specific movies, format them exactly like this: **Movie Title (YYYY)**

Guidelines:
1. If asking for recent/new movies, focus on 2024-2025 releases
2. If asking for specific genres/themes, include mix of recent and classic films
3. Always include release years in parentheses
4. Be conversational and informative
5. Provide 6-8 movie recommendations when appropriate
6. Include brief descriptions of why each movie is recommended

Response should be engaging and include specific movie titles with accurate years.

User query: "${userQuery}"`;

    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: prompt
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.3, // Lower temperature for more accuracy
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 2048,
            stopSequences: []
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };

    console.log('📡 Sending enhanced request to Gemini...');

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MovieAI/2025'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📨 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('📄 Response received');

        // Extract text from response with error handling
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            console.error('❌ No text content in response');
            return { success: false, error: 'No content' };
        }

        console.log('✅ Enhanced Gemini response received');
        
        return {
            success: true,
            text: formatResponseTextEnhanced(text),
            rawText: text
        };

    } catch (error) {
        console.error('💥 Enhanced Gemini API call failed:', error);
        return { success: false, error: error.message };
    }
}

// Enhanced response formatting
function formatResponseTextEnhanced(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\* /g, '• ')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/(<br>){3,}/g, '<br><br>')
        .trim();
}

// ENHANCED movie extraction with better accuracy
function extractMoviesFromTextEnhanced(text) {
    console.log('🔍 Enhanced movie extraction from text...');
    
    const movies = [];
    const currentYear = new Date().getFullYear(); // 2025
    
    // Multiple enhanced patterns for better extraction
    const patterns = [
        /\*\*([^*\n]+?)\s*\((\d{4})\)\*\*/g,  // **Movie (Year)**
        /([A-Z][^(\n]+?)\s*\((\d{4})\)/g,      // Movie Title (Year)
        /"([^"]+?)"\s*\((\d{4})\)/g,           // "Movie Title" (Year)
        /([A-Z][A-Za-z0-9\s:'-]{2,50})\s*\((\d{4})\)/g // Flexible title pattern
    ];
    
    patterns.forEach((pattern, index) => {
        console.log(`🎯 Using pattern ${index + 1}...`);
        let match;
        while ((match = pattern.exec(text)) !== null) {
            let title = match[1].trim().replace(/[\*"]/g, '').replace(/\s+/g, ' ');
            const year = parseInt(match[2]);
            
            // Enhanced filtering for accuracy
            if (title.length > 2 && 
                title.length < 100 && 
                year >= 1920 && 
                year <= currentYear + 1 && // Allow for next year releases
                !title.match(/^\d+$/) && // Not just numbers
                !title.toLowerCase().includes('season') && // Not TV seasons
                !title.toLowerCase().includes('episode')) { // Not TV episodes
                
                // Clean up common issues
                title = title
                    .replace(/^(The |A |An )/i, '$1') // Normalize articles
                    .replace(/\s+(the|a|an)\s+/gi, ' $1 ') // Fix spacing
                    .trim();
                
                movies.push({ title, year, pattern: index + 1 });
                console.log(`🎬 Found: "${title}" (${year}) [Pattern ${index + 1}]`);
            }
        }
        pattern.lastIndex = 0; // Reset regex
    });
    
    // Enhanced duplicate removal with fuzzy matching
    const uniqueMovies = [];
    movies.forEach(movie => {
        const isDuplicate = uniqueMovies.some(existing => {
            const titleSimilarity = movie.title.toLowerCase().replace(/[^\w\s]/g, '');
            const existingTitleSimilarity = existing.title.toLowerCase().replace(/[^\w\s]/g, '');
            return titleSimilarity === existingTitleSimilarity && Math.abs(movie.year - existing.year) <= 1;
        });
        
        if (!isDuplicate) {
            uniqueMovies.push(movie);
        }
    });
    
    // Prioritize recent movies (2024-2025) if query suggests recency
    uniqueMovies.sort((a, b) => {
        if (a.year >= 2024 && b.year < 2024) return -1;
        if (b.year >= 2024 && a.year < 2024) return 1;
        return b.year - a.year; // Otherwise sort by year descending
    });
    
    console.log(`🎯 Total unique movies found: ${uniqueMovies.length}`);
    return uniqueMovies.slice(0, 8); // Limit to 8 movies
}

// Enhanced TMDB movie search with better matching
async function showMoviesFromGeminiEnhanced(movieList) {
    console.log('🎭 Enhanced TMDB search for Gemini movies...');
    
    const tmdbMovies = [];
    
    for (const movieInfo of movieList) {
        try {
            console.log(`🔍 Enhanced search: ${movieInfo.title} (${movieInfo.year})`);
            
            // Try multiple search strategies
            let searchResult = await api.searchMovies(movieInfo.title);
            
            // If no results, try without year-specific terms
            if (!searchResult?.results?.length) {
                const cleanTitle = movieInfo.title.replace(/\s*(2024|2025|II|III|IV|Part\s*\d+)/i, '').trim();
                if (cleanTitle !== movieInfo.title) {
                    console.log(`🔄 Retry with cleaned title: ${cleanTitle}`);
                    searchResult = await api.searchMovies(cleanTitle);
                }
            }
            
            if (searchResult?.results?.length > 0) {
                // Enhanced matching algorithm
                let bestMatch = findBestMovieMatch(searchResult.results, movieInfo);
                
                console.log(`✅ Best match: ${bestMatch.title} (${bestMatch.release_date?.split('-')[0]})`);
                
                tmdbMovies.push({
                    ...bestMatch,
                    aiReason: `🤖 AI recommended: ${movieInfo.title} (${movieInfo.year})`,
                    geminiPick: true,
                    accuracyScore: calculateAccuracyScore(bestMatch, movieInfo)
                });
            } else {
                console.log(`❌ Not found in TMDB: ${movieInfo.title}`);
            }
            
        } catch (error) {
            console.error(`💥 Error searching ${movieInfo.title}:`, error);
        }
    }
    
    // Sort by accuracy score and recency
    tmdbMovies.sort((a, b) => {
        const aYear = a.release_date ? parseInt(a.release_date.split('-')[0]) : 0;
        const bYear = b.release_date ? parseInt(b.release_date.split('-')[0]) : 0;
        
        // Prioritize 2024-2025 movies
        if (aYear >= 2024 && bYear < 2024) return -1;
        if (bYear >= 2024 && aYear < 2024) return 1;
        
        // Then by accuracy score
        return (b.accuracyScore || 0) - (a.accuracyScore || 0);
    });
    
    console.log(`🎪 Displaying ${tmdbMovies.length} enhanced results`);
    
    if (tmdbMovies.length > 0) {
        displayRecommendations(tmdbMovies);
    } else {
        addMessage('The movies I mentioned might not be in our database yet, or may have different titles. Let me search with broader terms.', 'ai');
    }
}

// Enhanced movie matching algorithm
function findBestMovieMatch(results, targetMovie) {
    const targetYear = targetMovie.year;
    const targetTitle = targetMovie.title.toLowerCase().replace(/[^\w\s]/g, '');
    
    let bestMatch = results[0];
    let bestScore = 0;
    
    results.forEach(movie => {
        let score = 0;
        const movieYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0;
        const movieTitle = movie.title.toLowerCase().replace(/[^\w\s]/g, '');
        
        // Year matching (high priority)
        const yearDiff = Math.abs(movieYear - targetYear);
        if (yearDiff === 0) score += 50;
        else if (yearDiff === 1) score += 30;
        else if (yearDiff <= 2) score += 10;
        
        // Title similarity
        if (movieTitle === targetTitle) score += 40;
        else if (movieTitle.includes(targetTitle) || targetTitle.includes(movieTitle)) score += 25;
        
        // Popularity boost for recent movies
        if (movieYear >= 2024) score += 15;
        
        // Vote average boost
        score += (movie.vote_average || 0) * 2;
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = movie;
        }
    });
    
    return bestMatch;
}

// Calculate accuracy score for sorting
function calculateAccuracyScore(movie, targetMovie) {
    const movieYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0;
    const yearDiff = Math.abs(movieYear - targetMovie.year);
    
    let score = 100;
    score -= yearDiff * 10; // Penalize year differences
    score += (movie.vote_average || 0) * 5; // Boost for higher ratings
    score += movie.popularity || 0; // Boost for popularity
    
    return Math.max(0, score);
}

// Enhanced fallback TMDB search with recency focus
async function searchTMDBDirectlyEnhanced(query) {
    console.log('🔄 Enhanced fallback TMDB search for:', query);
    
    try {
        // Check if query suggests recency
        const recentKeywords = ['new', 'latest', 'recent', '2025', '2024', 'this year'];
        const isRecentQuery = recentKeywords.some(keyword => 
            query.toLowerCase().includes(keyword)
        );
        
        const result = await api.searchMovies(query);
        
        if (result?.results?.length > 0) {
            let movies = result.results;
            
            // If recent query, prioritize recent movies
            if (isRecentQuery) {
                movies = movies.sort((a, b) => {
                    const aYear = a.release_date ? parseInt(a.release_date.split('-')[0]) : 0;
                    const bYear = b.release_date ? parseInt(b.release_date.split('-')[0]) : 0;
                    
                    // Prioritize 2024-2025
                    if (aYear >= 2024 && bYear < 2024) return -1;
                    if (bYear >= 2024 && aYear < 2024) return 1;
                    
                    return bYear - aYear;
                });
            }
            
            const displayMovies = movies.slice(0, 6).map(movie => ({
                ...movie,
                aiReason: `Enhanced search: "${query}"${isRecentQuery ? ' (Recent focus)' : ''}`,
                fallbackSearch: true,
                isRecent: movie.release_date ? parseInt(movie.release_date.split('-')[0]) >= 2024 : false
            }));
            
            displayRecommendations(displayMovies);
        } else {
            addMessage('No movies found in database. Try different keywords or check for typos.', 'ai');
        }
    } catch (error) {
        console.error('💥 Enhanced TMDB search failed:', error);
        addMessage('Database search failed. Please try again with different terms.', 'ai');
    }
}

// Keep original Gemini API for compatibility
async function callGeminiAPI(userQuery) {
    return await callEnhancedGeminiAPI(userQuery);
}

// Test enhanced Gemini connection
async function testGeminiConnection() {
    console.log('🧪 Testing Enhanced Gemini connection...');
    
    try {
        const testResult = await callEnhancedGeminiAPI('What are some good recent movies from 2025?');
        if (testResult.success) {
            console.log('✅ Enhanced Gemini API is working!');
        } else {
            console.log('❌ Enhanced Gemini API test failed:', testResult.error);
        }
    } catch (error) {
        console.log('💥 Enhanced Gemini test error:', error);
    }
}

// Rest of the original functions remain the same
function addMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-${sender === 'ai' ? 'robot' : 'user'}"></i>
        </div>
        <div class="message-content">
            <div class="message-text">${text}</div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message typing-message';
    typingDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typing = document.querySelector('.typing-message');
    if (typing) typing.remove();
}

function displayRecommendations(movies) {
    const grid = document.getElementById('recommendationsGrid');
    if (!grid) {
        console.error('Recommendations grid not found');
        return;
    }

    grid.innerHTML = '';
    console.log('🎨 Displaying enhanced movies:', movies.map(m => `${m.title} (${m.release_date?.split('-')[0] || 'N/A'})`));

    movies.forEach(movie => {
        const card = createEnhancedMovieCard(movie);
        grid.appendChild(card);
    });
}

function createEnhancedMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'recommendation-card';

    const title = movie.title || 'Unknown Title';
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const posterUrl = movie.poster_path ? api.getImageUrl(movie.poster_path) : 'https://via.placeholder.com/300x450?text=No+Poster';
    
    // Enhanced badges
    const isRecent = year >= 2024;
    const badges = [];
    if (movie.geminiPick) badges.push('<span class="ai-badge">🤖 AI</span>');
    if (isRecent) badges.push('<span class="new-badge">🆕 New</span>');

    card.innerHTML = `
        <img src="${posterUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
        <div class="recommendation-info">
            <h3 class="recommendation-title">${title}</h3>
            <div class="movie-meta">
                <span class="year ${isRecent ? 'recent-year' : ''}">${year}</span>
                <span class="rating">⭐ ${rating}</span>
                ${badges.join(' ')}
            </div>
            ${movie.aiReason ? `<p class="ai-reason">${movie.aiReason}</p>` : ''}
            <div class="recommendation-buttons">
                <button class="rec-btn details-btn" onclick="viewDetails(${movie.id})">
                    Details
                </button>
                <button class="rec-btn trailer-btn" onclick="playTrailer(${movie.id}, '${title.replace(/'/g, "\\'")}', ${year})">
                    Trailer
                </button>
            </div>
        </div>
    `;

    return card;
}

function viewDetails(movieId) {
    if (movieId) {
        window.location.href = `details.html?id=${movieId}`;
    }
}

async function playTrailer(movieId, title, year) {
    try {
        const movie = await api.getMovieDetails(movieId);
        
        if (movie?.videos?.results?.length > 0) {
            const trailer = movie.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || 
                           movie.videos.results[0];
            
            if (trailer?.key) {
                api.playTrailer(trailer.key);
                return;
            }
        }

        const videoId = await api.searchYouTubeTrailer(title, year);
        if (videoId) {
            api.playTrailer(videoId);
        } else {
            console.log(`No trailer found for ${title}`);
        }
    } catch (error) {
        console.error('Trailer error:', error);
    }
}

function useExample(example) {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = example;
        chatInput.focus();
        setTimeout(() => sendMessage(), 500);
    }
}

// Enhanced debug function
function debugGemini() {
    console.log('🐛 Enhanced debug info:');
    console.log('API Key exists:', !!GEMINI_API_KEY);
    console.log('Current year:', new Date().getFullYear());
    console.log('Current date:', new Date().toLocaleDateString());
    
    // Test enhanced call
    callEnhancedGeminiAPI('What are the best new movies from 2025?').then(result => {
        console.log('🧪 Enhanced test result:', result);
    });
}

// Global functions
window.viewDetails = viewDetails;
window.playTrailer = playTrailer;
window.useExample = useExample;
window.debugGemini = debugGemini;
window.callGeminiAPI = callGeminiAPI;
window.callEnhancedGeminiAPI = callEnhancedGeminiAPI;

// Auto-test enhanced version on load
setTimeout(() => {
    console.log('🚀 Auto-testing Enhanced Gemini...');
    debugGemini();
}, 3000);

// Close dropdown
document.addEventListener('click', (e) => {
    const profileMenu = document.querySelector('.profile-menu');
    const dropdown = document.getElementById('profileDropdown');
    if (!profileMenu?.contains(e.target)) {
        dropdown?.classList.remove('active');
    }
});

// Enhanced styling
const styles = `
<style>
.ai-badge {
    background: linear-gradient(45deg, #7c3aed, #ec4899);
    color: white;
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
}

.new-badge {
    background: linear-gradient(45deg, #10b981, #3b82f6);
    color: white;
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
}

.recent-year {
    color: #10b981;
    font-weight: 600;
}

.ai-reason {
    font-size: 12px;
    color: #666;
    margin-top: 5px;
}
</style>
`;
document.head.insertAdjacentHTML('beforeend', styles);