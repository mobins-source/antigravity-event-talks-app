// --- STATE MANAGEMENT ---
let state = {
    updates: [],
    filteredUpdates: [],
    selectedUpdate: null,
    currentStyle: 'standard',
    searchQuery: '',
    filterType: 'all',
    sortOrder: 'newest',
    isLoading: false
};

// --- DOM ELEMENTS ---
const elements = {
    notesContainer: document.getElementById('notes-container'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnRefreshText: document.getElementById('btn-refresh-text'),
    refreshSpinner: document.getElementById('refresh-spinner'),
    cacheIndicator: document.getElementById('cache-indicator'),
    cacheTimeText: document.getElementById('cache-time-text'),
    
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    filterType: document.getElementById('filter-type'),
    sortOrder: document.getElementById('sort-order'),
    statsCount: document.getElementById('stats-count'),
    filterActiveTag: document.getElementById('filter-active-tag'),
    
    emptyState: document.getElementById('empty-state'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    btnRetry: document.getElementById('btn-retry'),
    
    // Composer elements
    composerEmptyState: document.getElementById('composer-empty-state'),
    composerActiveState: document.getElementById('composer-active-state'),
    composerSelectedType: document.getElementById('composer-selected-type'),
    composerSelectedDate: document.getElementById('composer-selected-date'),
    btnDeselect: document.getElementById('btn-deselect'),
    templateBtns: document.querySelectorAll('.template-btn'),
    btnAutoShorten: document.getElementById('btn-auto-shorten'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCounter: document.getElementById('char-counter'),
    hashtagChips: document.querySelectorAll('.hashtag-chip'),
    btnCopyTweet: document.getElementById('btn-copy-tweet'),
    btnCopyText: document.getElementById('btn-copy-text'),
    btnSendTweet: document.getElementById('btn-send-tweet'),
    toast: document.getElementById('toast')
};

// --- TWEET TEMPLATE GENERATOR ---
function generateTweetDraft(update, style = 'standard', maxSummaryLen = null) {
    if (!update) return '';

    const date = update.date;
    const type = update.type.toUpperCase();
    const link = update.link;
    
    // Default text summary (clean text without HTML tags)
    let summary = update.text;
    
    // If a max length is forced (e.g. for auto-shorten)
    if (maxSummaryLen !== null && summary.length > maxSummaryLen) {
        if (maxSummaryLen > 3) {
            summary = summary.substring(0, maxSummaryLen - 3) + '...';
        } else {
            summary = '';
        }
    }

    switch (style) {
        case 'hype':
            return `🔥 BigQuery just dropped a new ${update.type.toLowerCase()} update!\n\n"${summary}"\n\nDetails: ${link}\n#BigQuery #GoogleCloud #DataEngineering`;
        
        case 'professional':
            return `📢 Google Cloud BigQuery Update - ${date}\n\nType: ${update.type}\nDetails: ${summary}\n\nRead more at: ${link}`;
        
        case 'minimal':
            return `BigQuery ${update.type} (${date}):\n${summary}\n\n${link}`;
            
        case 'standard':
        default:
            return `🚀 New BigQuery update!\n\n${type}: ${summary}\n\nRelease notes: ${link}\n#BigQuery #GoogleCloud`;
    }
}

// --- INITIALIZE & ATTACH EVENTS ---
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventHandlers();
});

function setupEventHandlers() {
    // Refresh button
    elements.btnRefresh.addEventListener('click', () => fetchReleaseNotes(true));
    elements.btnRetry.addEventListener('click', () => fetchReleaseNotes(true));

    // Filters & Search
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        toggleClearSearchButton();
        applyFilters();
    });

    elements.btnClearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        toggleClearSearchButton();
        applyFilters();
    });

    elements.filterType.addEventListener('change', (e) => {
        state.filterType = e.target.value;
        applyFilters();
    });

    elements.sortOrder.addEventListener('change', (e) => {
        state.sortOrder = e.target.value;
        applyFilters();
    });

    elements.btnResetFilters.addEventListener('click', resetFilters);

    // Composer interactions
    elements.btnDeselect.addEventListener('click', deselectUpdate);

    elements.templateBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.templateBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentStyle = btn.dataset.style;
            
            // Re-generate draft with the selected style template
            const text = generateTweetDraft(state.selectedUpdate, state.currentStyle);
            elements.tweetTextarea.value = text;
            updateCharCounter();
        });
    });

    elements.tweetTextarea.addEventListener('input', () => {
        updateCharCounter();
    });

    elements.btnAutoShorten.addEventListener('click', autoShortenText);

    elements.hashtagChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const tag = chip.dataset.tag;
            let currentText = elements.tweetTextarea.value;
            
            if (currentText.includes(tag)) {
                showToast(`Hashtag ${tag} is already in the draft`);
                return;
            }

            // Append with proper spacing
            if (currentText.trim() === '') {
                elements.tweetTextarea.value = tag;
            } else {
                elements.tweetTextarea.value = currentText.trimEnd() + ' ' + tag;
            }
            updateCharCounter();
            showToast(`Added ${tag}`);
        });
    });

    elements.btnCopyTweet.addEventListener('click', copyTweetToClipboard);
    elements.btnSendTweet.addEventListener('click', sendTweetToX);
}

// --- FETCH & PARSE NOTES ---
async function fetchReleaseNotes(forceRefresh = false) {
    if (state.isLoading) return;
    
    state.isLoading = true;
    showLoadingState();
    
    const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.status === 'error') {
            throw new Error(result.message);
        }
        
        state.updates = result.data;
        
        // Show cache notification if served from cache
        if (result.source.includes('cache')) {
            elements.cacheTimeText.textContent = `Cached: ${result.cached_at.split(' ')[1]}`;
            elements.cacheIndicator.classList.remove('hidden');
        } else {
            elements.cacheIndicator.classList.add('hidden');
        }
        
        applyFilters();
        
        if (forceRefresh) {
            showToast('Release notes successfully refreshed');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showErrorState(error.message || 'Could not fetch release notes. Check your network connection.');
    } finally {
        state.isLoading = false;
        hideLoadingState();
    }
}

// --- FILTER & SORT LOGIC ---
function applyFilters() {
    let filtered = [...state.updates];

    // Filter by type
    if (state.filterType !== 'all') {
        filtered = filtered.filter(item => item.type === state.filterType);
    }

    // Filter by search query
    if (state.searchQuery.trim() !== '') {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(item => 
            item.text.toLowerCase().includes(query) || 
            item.type.toLowerCase().includes(query) ||
            item.date.toLowerCase().includes(query)
        );
    }

    // Sort order
    filtered.sort((a, b) => {
        const dateA = new Date(a.sort_date);
        const dateB = new Date(b.sort_date);
        if (state.sortOrder === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });

    state.filteredUpdates = filtered;
    renderNotes();
}

function resetFilters() {
    elements.searchInput.value = '';
    elements.filterType.value = 'all';
    elements.sortOrder.value = 'newest';
    
    state.searchQuery = '';
    state.filterType = 'all';
    state.sortOrder = 'newest';
    
    toggleClearSearchButton();
    applyFilters();
}

function toggleClearSearchButton() {
    if (state.searchQuery.trim() !== '') {
        elements.btnClearSearch.classList.remove('hidden');
    } else {
        elements.btnClearSearch.classList.add('hidden');
    }
}

// --- RENDERING VIEWS ---
function renderNotes() {
    elements.notesContainer.innerHTML = '';
    
    // Update stats count
    const total = state.filteredUpdates.length;
    elements.statsCount.textContent = `Showing ${total} update${total !== 1 ? 's' : ''}`;
    
    // Show active filter label if filters are applied
    if (state.searchQuery !== '' || state.filterType !== 'all') {
        elements.filterActiveTag.classList.remove('hidden');
    } else {
        elements.filterActiveTag.classList.add('hidden');
    }

    if (total === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    elements.emptyState.classList.add('hidden');

    state.filteredUpdates.forEach(update => {
        const card = document.createElement('article');
        card.className = `note-card card ${state.selectedUpdate && state.selectedUpdate.id === update.id ? 'selected' : ''}`;
        card.setAttribute('data-id', update.id);
        
        // Define badge class based on type
        let badgeClass = 'badge-general';
        const typeLower = update.type.toLowerCase();
        if (typeLower.includes('feature')) badgeClass = 'badge-feature';
        else if (typeLower.includes('change')) badgeClass = 'badge-change';
        else if (typeLower.includes('deprecat')) badgeClass = 'badge-deprecated';

        card.innerHTML = `
            <div class="note-header">
                <div class="note-meta-badges">
                    <span class="badge ${badgeClass}">${update.type}</span>
                    <time class="note-date" datetime="${update.sort_date}">${update.date}</time>
                </div>
                <div class="quick-actions">
                    <button class="btn-quick-share" title="Deselect/Select update for Tweet" aria-label="Select update">
                        <svg class="quick-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="note-body">
                ${update.content}
            </div>
        `;

        // Card select click listener
        card.addEventListener('click', (e) => {
            // Avoid selecting card if user clicks a link inside the card
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            selectUpdate(update);
        });

        elements.notesContainer.appendChild(card);
    });
}

// --- STATE ACTIONS ---
function selectUpdate(update) {
    state.selectedUpdate = update;
    
    // Update card visual selections
    const cards = elements.notesContainer.querySelectorAll('.note-card');
    cards.forEach(card => {
        if (card.dataset.id === update.id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Populate Composer fields
    elements.composerEmptyState.classList.add('hidden');
    elements.composerActiveState.classList.remove('hidden');
    
    elements.composerSelectedType.textContent = update.type;
    elements.composerSelectedType.className = `badge badge-${update.type.toLowerCase().includes('feature') ? 'feature' : update.type.toLowerCase().includes('change') ? 'change' : update.type.toLowerCase().includes('deprecat') ? 'deprecated' : 'general'}`;
    elements.composerSelectedDate.textContent = update.date;

    // Reset standard template button
    elements.templateBtns.forEach(btn => {
        if (btn.dataset.style === state.currentStyle) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Generate tweet text
    const text = generateTweetDraft(update, state.currentStyle);
    elements.tweetTextarea.value = text;
    updateCharCounter();
    
    // Smooth scroll composer on mobile devices
    if (window.innerWidth <= 1024) {
        elements.composerActiveState.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function deselectUpdate() {
    state.selectedUpdate = null;
    
    const cards = elements.notesContainer.querySelectorAll('.note-card');
    cards.forEach(card => card.classList.remove('selected'));
    
    elements.composerActiveState.classList.add('hidden');
    elements.composerEmptyState.classList.remove('hidden');
}

// --- TWEET COMPOSER LOGIC ---
function updateCharCounter() {
    const text = elements.tweetTextarea.value;
    const len = text.length;
    elements.charCounter.textContent = `${len} / 280`;

    // Visual indicators
    elements.charCounter.className = 'char-counter';
    if (len > 280) {
        elements.charCounter.classList.add('danger');
    } else if (len > 250) {
        elements.charCounter.classList.add('warning');
    }
}

function autoShortenText() {
    if (!state.selectedUpdate) return;
    
    // We determine characters needed for structure: template formatting + link
    const baseTweetLength = generateTweetDraft(state.selectedUpdate, state.currentStyle, 0).length;
    
    // The maximum length of summary we can accommodate is: 280 - baseTweetLength
    const maxAllowedSummaryLen = 280 - baseTweetLength;
    
    if (state.selectedUpdate.text.length <= maxAllowedSummaryLen) {
        showToast('Text is already within 280 characters limit');
        return;
    }
    
    if (maxAllowedSummaryLen <= 10) {
        showToast('Cannot auto-shorten: template elements are too long');
        return;
    }
    
    // Generate shortened draft
    const text = generateTweetDraft(state.selectedUpdate, state.currentStyle, maxAllowedSummaryLen);
    elements.tweetTextarea.value = text;
    updateCharCounter();
    showToast('Draft automatically optimized to fit 280 characters!');
}

async function copyTweetToClipboard() {
    const text = elements.tweetTextarea.value;
    if (text.trim() === '') return;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // Show success animation on button
        const originalText = elements.btnCopyText.textContent;
        elements.btnCopyText.textContent = 'Copied!';
        elements.btnCopyTweet.classList.add('btn-success');
        
        showToast('Tweet copied to clipboard!');
        
        setTimeout(() => {
            elements.btnCopyText.textContent = originalText;
            elements.btnCopyTweet.classList.remove('btn-success');
        }, 2000);
    } catch (err) {
        console.error('Clipboard copy failed:', err);
        showToast('Failed to copy. Please manually select and copy text.');
    }
}

function sendTweetToX() {
    const text = elements.tweetTextarea.value;
    if (text.trim() === '') return;
    
    const len = text.length;
    if (len > 280) {
        showToast('Draft exceeds 280 characters limit. Please shorten it.', 'warning');
        return;
    }
    
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
}

// --- SYSTEM VISUAL STATES ---
function showLoadingState() {
    elements.refreshSpinner.classList.remove('hidden');
    elements.btnRefresh.setAttribute('disabled', 'true');
    elements.btnRefreshText.textContent = 'Refreshing...';
    
    // If empty feed, show skeleton placeholders
    if (state.updates.length === 0) {
        elements.notesContainer.innerHTML = `
            <div class="skeleton-card card">
                <div class="skeleton-header">
                    <div class="skeleton-badge"></div>
                    <div class="skeleton-badge"></div>
                </div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
            <div class="skeleton-card card">
                <div class="skeleton-header">
                    <div class="skeleton-badge"></div>
                    <div class="skeleton-badge"></div>
                </div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
        `;
    }
}

function hideLoadingState() {
    elements.refreshSpinner.classList.add('hidden');
    elements.btnRefresh.removeAttribute('disabled');
    elements.btnRefreshText.textContent = 'Refresh';
}

function showErrorState(msg) {
    elements.errorState.classList.remove('hidden');
    elements.errorMessage.textContent = msg;
    elements.notesContainer.innerHTML = '';
}

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = 'toast';
    
    if (type === 'warning') {
        elements.toast.classList.add('toast-warning');
    }
    
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}
