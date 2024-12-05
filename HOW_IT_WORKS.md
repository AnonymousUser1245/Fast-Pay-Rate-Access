# How It Works

This document explains the technical process of how the Fast Pay Rate Access viewer operates when you look up an award.

## Step-by-Step Process

### 1. Initial Award Request
- User enters an award ID (e.g., MA000089) and clicks "View"
- System redirects to `award.html#MA000089` using URL hash for navigation
- This allows for bookmarking and sharing specific award views

### 2. Data Fetching
- System first checks for cached data (if caching is enabled)
- If valid cache exists (less than 24 hours old):
  - Uses cached data
  - Shows yellow "From Cache" indicator
- If no cache or cache disabled:
  - Fetches award directly from Fair Work website
  - Shows progress bar during fetch
  - Uses timestamp to prevent browser caching
  - Shows green "From Server" indicator

### 3. HTML Processing
- Takes raw HTML from Fair Work website
- Parses it into a structured format
- Filters for specific CSS classes containing relevant content
- Builds a hierarchical structure of the content for easy navigation
- Organizes content into appropriate schedules

### 4. Display Organization
- Content is split into three columns:
  - Left: Schedule A (Classifications)
  - Middle: Schedule B (Pay Rates)
  - Right: Schedule C (Allowances)
- Each column gets independent:
  - Search functionality
  - Navigation controls
  - Collapsible sections

### 5. Interactive Features
Each column includes:
- Search input field
- Up/down navigation buttons
- Match counter (current/total)
- Collapse All button
- Expandable/collapsible sections
- Highlighted search matches

### 6. Visual Feedback
- Data source indicator:
  - Yellow badge for cached data
  - Green badge for fresh server data
- Direct link to Fair Work website for verification
- Award title display
- Loading progress bar during fetches

### 7. Caching System
- Saves processed award data locally
- 24-hour cache validity
- Toggle switch to enable/disable caching
- Visual indicators for cache status
- Automatic cache cleanup after expiration

## Performance Benefits

The system is significantly faster than PACT because:
- No questionnaire required
- Direct access to all pay rates
- Quick search and navigation
- Instant access to cached awards
- Multiple awards can be open in different tabs