document.addEventListener('DOMContentLoaded', function() {
    const scheduleColumns = document.querySelectorAll('.schedule-column');

    scheduleColumns.forEach(scheduleColumn => {
        scheduleColumn.addEventListener('click', function(e) {
            const clickedNode = e.target.closest('.node-content');
            if (!clickedNode) return;

            const clickedNodeClass = clickedNode.className.split(' ')[1]; // Get the hierarchy class
            const children = clickedNode.nextElementSibling;
            const toggleBtn = clickedNode.querySelector('.toggle-btn');

            if (children && children.classList.contains('children')) {
                // Find all nodes at the same level within this schedule
                const sameHierarchyNodes = scheduleColumn.querySelectorAll(`.${clickedNodeClass}`);

                sameHierarchyNodes.forEach(node => {
                    if (node !== clickedNode) {
                        const siblingChildren = node.nextElementSibling;
                        const siblingToggleBtn = node.querySelector('.toggle-btn');
                        
                        if (siblingChildren && siblingChildren.classList.contains('children')) {
                            siblingChildren.classList.remove('visible');
                            if (siblingToggleBtn) {
                                siblingToggleBtn.style.transform = 'translateY(-50%) rotate(0deg)';
                            }
                        }
                    }
                });

                // Toggle the clicked node
                children.classList.toggle('visible');
                if (toggleBtn) {
                    toggleBtn.style.transform = children.classList.contains('visible') 
                        ? 'translateY(-50%) rotate(180deg)' 
                        : 'translateY(-50%) rotate(0deg)';
                }
            }
        });
    });

    // Add search functionality to each schedule
    document.querySelectorAll('.schedule-column').forEach(column => {
        new ScheduleSearch(column);
    });
});

// Cache handling
class AwardCache {
    constructor() {
        this.useCache = JSON.parse(localStorage.getItem('useCache') ?? 'true');
        this.cacheToggle = document.getElementById('cacheToggle');
        console.log('[Cache] Initial cache state:', this.useCache);
        this.setupToggle();
    }

    setupToggle() {
        // Set initial state
        this.cacheToggle.checked = this.useCache;
        
        // Handle changes
        this.cacheToggle.addEventListener('change', () => {
            this.useCache = this.cacheToggle.checked;
            localStorage.setItem('useCache', this.useCache);
            console.log('[Cache] Toggle changed. New state:', this.useCache);
        });
    }

    getAward(awardId) {
        console.log('[Cache] Attempting to get award', awardId);
        console.log('[Cache] Current useCache setting:', this.useCache);
        
        if (!this.useCache) {
            console.log('[Cache] Cache is disabled, returning null');
            return null;
        }
        
        const cached = localStorage.getItem(`award_${awardId}`);
        console.log('[Cache] Raw cached data exists:', !!cached);
        
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            console.log('[Cache] Cache age:', Math.round(age / 1000 / 60), 'minutes');
            
            // Cache expires after 24 hours
            if (age < 24 * 60 * 60 * 1000) {
                console.log('[Cache] Using cached data for award', awardId);
                return data;
            } else {
                console.log('[Cache] Cache expired for award', awardId);
                localStorage.removeItem(`award_${awardId}`);
            }
        }
        console.log('[Cache] No valid cache found, returning null');
        return null;
    }

    setAward(awardId, data) {
        console.log('[Cache] Attempting to save award', awardId);
        console.log('[Cache] Current useCache setting:', this.useCache);
        
        if (!this.useCache) {
            console.log('[Cache] Cache is disabled, not saving');
            return;
        }
        
        localStorage.setItem(`award_${awardId}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        console.log('[Cache] Saved award to cache');
    }
}

// Initialize cache handler
const awardCache = new AwardCache();

function updateDataSourceIndicator(fromCache) {
    const indicator = document.querySelector('.data-source');
    indicator.textContent = fromCache ? '📦 From Cache' : '🌐 From Server';
    indicator.className = 'data-source ' + (fromCache ? 'from-cache' : 'from-server');
}

async function loadAwardData() {
    const awardId = document.getElementById('searchInput').value.trim();
    if (!awardId) return;

    console.log('[Load] Starting to load award:', awardId);
    console.log('[Load] Current cache state:', awardCache.useCache);

    // Update Fair Work website link
    document.getElementById('fairWorkLink').href = `https://library.fairwork.gov.au/award/?krn=${awardId}`;

    // Show loading, hide error and schedules
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    document.getElementById('schedules').style.display = 'none';

    const progress = new FetchProgress();
    
    try {
        // Check cache first
        console.log('[Load] Checking cache');
        let data = awardCache.getAward(awardId);
        console.log('[Load] Cache check result:', !!data);
        let fromCache = false;
        
        if (!data) {
            // If not in cache or cache disabled, fetch from server
            console.log('[Load] Fetching from server');
            progress.start();
            data = await processAward(awardId);
            if (!data) throw new Error('Failed to process award data');
            progress.complete();
            
            // Save to cache
            console.log('[Load] Saving to cache');
            awardCache.setAward(awardId, data);
        } else {
            // If using cached data, show quick progress
            console.log('[Load] Using cached data');
            fromCache = true;
            progress.start();
            await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay
            progress.complete();
        }

        // Hide loading after a short delay to show 100%
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('schedules').style.display = 'flex';

            // Render each schedule
            document.getElementById('schedule-a').innerHTML = renderNodes(filterSchedule(data, 'a'), 'a');
            document.getElementById('schedule-b').innerHTML = renderNodes(filterSchedule(data, 'b'), 'b');
            document.getElementById('schedule-c').innerHTML = renderNodes(filterSchedule(data, 'c'), 'c');

            // Update award title if found
            const titleNode = data.find(node => node.id === 1);
            if (titleNode) {
                const titleMatch = titleNode.html.match(/<h1>(.*?)<\/h1>/);
                if (titleMatch) {
                    const awardHeader = document.querySelector('.award-header');
                    if (awardHeader) {
                        awardHeader.textContent = `${titleMatch[1]} - ${awardId}`;
                    }
                }
            }

            // Update data source indicator
            updateDataSourceIndicator(fromCache);
        }, 500);
    } catch (error) {
        console.error('[Load] Error:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
}

function renderNodes(nodes, scheduleType) {
    if (!nodes || nodes.length === 0) return '';
    
    let html = '<ul class="node-list">';
    for (const node of nodes) {
        html += `
            <li class="node">
                <div class="node-content ${node.class}" data-id="${node.id}">
                    ${node.html}
                    ${node.children && node.children.length ? '<span class="toggle-btn">▼</span>' : ''}
                </div>
                ${node.children && node.children.length ? 
                    `<div class="children">${renderNodes(node.children, scheduleType)}</div>` : 
                    ''}
            </li>
        `;
    }
    html += '</ul>';
    return html;
}

function filterSchedule(nodes, scheduleType) {
    return nodes.filter(node => {
        const html = node.html.toLowerCase();
        return html.includes(`schedule ${scheduleType}`);
    });
}

function viewAward() {
    const awardId = document.getElementById('searchInput').value.trim();
    if (awardId) {
        window.location.href = `award.html#${awardId}`;
    }
}

// Also handle Enter key in the input
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        viewAward();
    }
});

class ScheduleSearch {
    constructor(column) {
        this.column = column;
        this.searchInput = column.querySelector('.schedule-search-input');
        this.matchCount = column.querySelector('.match-count');
        this.prevButton = column.querySelector('.prev-match');
        this.nextButton = column.querySelector('.next-match');
        this.collapseAllButton = column.querySelector('.collapse-all');
        
        this.matches = [];
        this.currentMatchIndex = -1;
        this.debounceTimeout = null;
        this.MIN_SEARCH_LENGTH = 1; // Changed to 1 to allow single character searches
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Add debouncing to the input event
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => this.performSearch(), 300);
        });
        this.prevButton.addEventListener('click', () => this.navigateMatch(-1));
        this.nextButton.addEventListener('click', () => this.navigateMatch(1));
        
        // Add collapse all button listener
        this.collapseAllButton.addEventListener('click', () => {
            this.clearHighlights();  // Clear any search highlights
            this.collapseAllSections();
            this.searchInput.value = '';  // Clear the search input
            this.updateMatchCount(0, 0);  // Reset match count
        });
    }
    
    performSearch() {
        // Clear previous highlights
        this.clearHighlights();
        
        const searchTerm = this.searchInput.value.trim().toLowerCase();
        if (!searchTerm || searchTerm.length < this.MIN_SEARCH_LENGTH) {
            this.updateMatchCount(0, 0);
            return;
        }
        
        // Find all text nodes in the column
        const walker = document.createTreeWalker(
            this.column,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip search UI and empty text nodes
                    if (node.parentElement.closest('.schedule-search')) return NodeFilter.FILTER_REJECT;
                    if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                    if (node.parentElement.classList.contains('search-highlight')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        
        this.matches = [];
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent;
            const normalizedText = text.toLowerCase();
            let index = normalizedText.indexOf(searchTerm);
            
            while (index !== -1) {
                try {
                    const range = document.createRange();
                    range.setStart(node, index);
                    range.setEnd(node, index + searchTerm.length);
                    
                    const highlight = document.createElement('span');
                    highlight.className = 'search-highlight';
                    
                    // Use original text case
                    const originalText = text.substr(index, searchTerm.length);
                    highlight.textContent = originalText;
                    
                    range.deleteContents();
                    range.insertNode(highlight);
                    
                    this.matches.push(highlight);
                    
                    // Update the node and index for next iteration
                    node = highlight.nextSibling;
                    if (!node) break;
                    
                    const remainingText = node.textContent.toLowerCase();
                    index = remainingText.indexOf(searchTerm);
                } catch (e) {
                    console.warn('Error highlighting match:', e);
                    index = -1;
                }
            }
        }
        
        this.currentMatchIndex = this.matches.length > 0 ? 0 : -1;
        this.updateMatchCount(this.currentMatchIndex + 1, this.matches.length);
        if (this.matches.length > 0) {
            this.highlightCurrentMatch();
        }
    }
    
    clearHighlights() {
        this.matches.forEach(highlight => {
            if (highlight && highlight.parentNode) {
                const text = highlight.textContent;
                const textNode = document.createTextNode(text);
                highlight.parentNode.replaceChild(textNode, highlight);
            }
        });
        // Normalize all text nodes in the column
        this.column.normalize();
        this.matches = [];
        this.currentMatchIndex = -1;
    }
    
    navigateMatch(direction) {
        if (this.matches.length === 0) return;
        
        this.matches[this.currentMatchIndex].classList.remove('current');
        this.currentMatchIndex = (this.currentMatchIndex + direction + this.matches.length) % this.matches.length;
        this.highlightCurrentMatch();
    }
    
    highlightCurrentMatch() {
        const currentMatch = this.matches[this.currentMatchIndex];
        
        // First collapse all sections
        this.collapseAllSections();
        
        // Then expand only the parents of the current match
        this.expandParents(currentMatch);
        
        currentMatch.classList.add('current');
        currentMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.updateMatchCount(this.currentMatchIndex + 1, this.matches.length);
    }
    
    updateMatchCount(current, total) {
        this.matchCount.textContent = total > 0 ? `${current}/${total}` : 'No matches';
    }

    // Helper method to collapse all expandable sections
    collapseAllSections() {
        const allVisibleChildren = this.column.querySelectorAll('.children.visible');
        allVisibleChildren.forEach(child => {
            child.classList.remove('visible');
            const nodeContent = child.previousElementSibling;
            const toggleBtn = nodeContent.querySelector('.toggle-btn');
            if (toggleBtn) {
                toggleBtn.style.transform = 'translateY(-50%) rotate(0deg)';
            }
        });
    }

    // Helper method to expand parents of an element
    expandParents(element) {
        let current = element;
        while (current && !current.classList.contains('schedule-column')) {
            if (current.classList.contains('children')) {
                current.classList.add('visible');
                const nodeContent = current.previousElementSibling;
                const toggleBtn = nodeContent.querySelector('.toggle-btn');
                if (toggleBtn) {
                    toggleBtn.style.transform = 'translateY(-50%) rotate(180deg)';
                }
            }
            current = current.parentElement;
        }
    }
}

// Add this class at the top of main.js
class FetchProgress {
    constructor() {
        this.progressFill = document.querySelector('.progress-fill');
        this.progressText = document.querySelector('.progress-text');
        this.progressPercentage = document.querySelector('.progress-percentage');
        this.interval = null;
        this.progress = 0;
        this.startTime = null;
        
        // Load timing history from localStorage
        this.timingHistory = JSON.parse(localStorage.getItem('fetchTimings') || '[]');
        this.expectedDuration = this.calculateExpectedDuration();
    }

    calculateExpectedDuration() {
        if (this.timingHistory.length === 0) return 2000; // Default 2 seconds
        
        // Calculate average of last 5 timings
        const recentTimings = this.timingHistory.slice(-5);
        const average = recentTimings.reduce((a, b) => a + b, 0) / recentTimings.length;
        
        // Add 20% buffer to the average
        return average * 1.2;
    }

    start() {
        this.progress = 0;
        this.startTime = Date.now();
        this.updateProgress(0, "Starting fetch...");
        
        // Simulate progress based on expected duration
        this.interval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const progressPercent = Math.min((elapsed / this.expectedDuration) * 90, 90);
            
            this.progress = progressPercent;
            this.updateProgress(
                this.progress,
                "Fetching award data..."
            );
        }, 50);
    }

    complete() {
        const fetchDuration = Date.now() - this.startTime;
        
        // Store this timing in history
        this.timingHistory.push(fetchDuration);
        if (this.timingHistory.length > 10) { // Keep last 10 timings
            this.timingHistory.shift();
        }
        localStorage.setItem('fetchTimings', JSON.stringify(this.timingHistory));
        
        // Update expected duration for next time
        this.expectedDuration = this.calculateExpectedDuration();
        
        clearInterval(this.interval);
        this.updateProgress(100, "Processing data...");
        
        // Log timing information
        console.log(`Fetch completed in ${fetchDuration}ms`);
        console.log(`Average fetch time: ${this.expectedDuration}ms`);
        console.log(`Timing history:`, this.timingHistory);
    }

    updateProgress(progress, text) {
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = text;
        this.progressPercentage.textContent = `${Math.round(progress)}%`;
    }
} 