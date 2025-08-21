/**
 * Reddit Activity Tracker - Main Application
 * Handles data loading, UI updates, and dashboard functionality
 */

class RedditActivityTracker {
    constructor() {
        this.data = null;
        this.charts = {};
        this.historicalManager = null;
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Reddit Activity Tracker...');
        
        // Show loading state
        this.showLoading();
        
        try {
            // Load the latest data
            await this.loadData();
            
            // Update the dashboard
            this.updateDashboard();
            
            // Initialize charts
            this.initializeCharts();
            
            // Initialize time-series charts
            if (typeof initializeTimeSeriesCharts !== 'undefined') {
                initializeTimeSeriesCharts();
            }
            
            // Show the dashboard
            this.showDashboard();
            
            console.log('Dashboard initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showError();
        }
    }

    /**
     * Load data from the current.json file
     */
    async loadData() {
        try {
            const response = await fetch('./data/current.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.data = await response.json();
            console.log('Data loaded successfully:', this.data);
            
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    /**
     * Update dashboard metrics and content
     */
    updateDashboard() {
        if (!this.data) return;

        // Update last updated time
        this.updateLastUpdated();
        
        // Update metrics
        this.updateMetrics();
        
        // Update recent posts
        this.updateRecentPosts();
    }

    /**
     * Update the last updated timestamp
     */
    updateLastUpdated() {
        const timestamp = new Date(this.data.timestamp);
        const timeString = timestamp.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
        
        document.getElementById('lastUpdated').textContent = timeString;
    }

    /**
     * Update the metrics cards
     */
    updateMetrics() {
        const { 
            active_users, 
            subscribers, 
            posts_last_hour, 
            total_score_recent, 
            total_comments_recent 
        } = this.data;
        
        // Format numbers with commas
        const formatNumber = (num) => {
            if (num === undefined || num === null) return '-';
            return new Intl.NumberFormat('en-US').format(num);
        };
        
        // Update metric values
        document.getElementById('activeUsers').textContent = formatNumber(active_users);
        document.getElementById('subscribers').textContent = formatNumber(subscribers);
        document.getElementById('postsLastHour').textContent = formatNumber(posts_last_hour);
        
        // Calculate total engagement
        const totalEngagement = (total_score_recent || 0) + (total_comments_recent || 0);
        document.getElementById('recentEngagement').textContent = formatNumber(totalEngagement);
    }

    /**
     * Update the recent posts section
     */
    updateRecentPosts() {
        const postsContainer = document.getElementById('recentPostsList');
        const recentPosts = this.data.recent_posts || [];
        
        if (recentPosts.length === 0) {
            postsContainer.innerHTML = '<p class="no-posts">No recent posts found.</p>';
            return;
        }
        
        const postsHTML = recentPosts.map(post => {
            const postTime = new Date(post.created_utc * 1000);
            const timeAgo = this.getTimeAgo(postTime);
            
            return `
                <div class="post-item">
                    <a href="${post.url}" target="_blank" rel="noopener" class="post-title-link">
                        ${this.escapeHtml(post.title)}
                    </a>
                    <div class="post-meta">
                        <span>${post.score} points</span>
                        <span>${post.comments} comments</span>
                        <span>u/${this.escapeHtml(post.author)}</span>
                        <span>${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        postsContainer.innerHTML = postsHTML;
    }

    /**
     * Initialize all charts
     */
    initializeCharts() {
        this.initializeHeatmapChart();
        this.initializeTrendsChart();
    }

    /**
     * Initialize the 24-hour activity heatmap chart
     */
    initializeHeatmapChart() {
        const canvas = document.getElementById('heatmapChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Check if Chart.js and our custom function are loaded
        if (typeof Chart === 'undefined' || typeof createContentPerformanceChart === 'undefined') {
            console.error('Chart.js or createContentPerformanceChart not loaded');
            return;
        }
        
        // Destroy existing chart if it exists
        if (this.charts.heatmap) {
            this.charts.heatmap.destroy();
        }
        
        // Create new chart using our custom function
        try {
            this.charts.heatmap = createContentPerformanceChart(ctx, this.data);
        } catch (error) {
            console.error('Failed to create content chart:', error);
        }
    }

    /**
     * Initialize the trends chart
     */
    initializeTrendsChart() {
        const canvas = document.getElementById('trendsChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Check if Chart.js and our custom function are loaded
        if (typeof Chart === 'undefined' || typeof createEngagementTimelineChart === 'undefined') {
            console.error('Chart.js or createEngagementTimelineChart not loaded');
            return;
        }
        
        // Destroy existing chart if it exists
        if (this.charts.trends) {
            this.charts.trends.destroy();
        }
        
        // Create new chart using our custom function
        try {
            this.charts.trends = createEngagementTimelineChart(ctx, this.data);
        } catch (error) {
            console.error('Failed to create engagement chart:', error);
        }
    }

    // Historical charts are now handled by time-series.js

    // Time controls are now handled by time-series.js

    /**
     * Show loading state
     */
    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
    }

    /**
     * Show dashboard
     */
    showDashboard() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('errorMessage').style.display = 'none';
    }

    /**
     * Show error message
     */
    showError() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'block';
    }

    /**
     * Get human-readable time ago string with Eastern time
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        // Format the actual time in Eastern
        const easternTime = date.toLocaleTimeString('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        let timeAgo;
        if (diffMins < 1) timeAgo = 'just now';
        else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
        else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
        else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
        else timeAgo = date.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
        
        // Show Eastern time for recent posts
        if (diffHours < 24) {
            return `${timeAgo} (${easternTime} ET)`;
        }
        return timeAgo;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Refresh the dashboard data
     */
    async refresh() {
        console.log('Refreshing dashboard...');
        this.showLoading();
        
        try {
            await this.loadData();
            this.updateDashboard();
            
            // Update existing charts
            if (this.charts.heatmap) {
                this.updateHeatmapChart();
            }
            
            this.showDashboard();
            console.log('Dashboard refreshed successfully');
            
        } catch (error) {
            console.error('Failed to refresh dashboard:', error);
            this.showError();
        }
    }

    /**
     * Update the heatmap chart with new data
     */
    updateHeatmapChart() {
        if (!this.charts.heatmap || !this.data) return;
        
        const hourlyData = this.data.hourly_posts || {};
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const data = hours.map(hour => hourlyData[hour] || 0);
        
        this.charts.heatmap.data.datasets[0].data = data;
        this.charts.heatmap.update();
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.redditTracker = new RedditActivityTracker();
    
    // Set up auto-refresh every 5 minutes
    setInterval(() => {
        if (window.redditTracker) {
            window.redditTracker.refresh();
        }
    }, 5 * 60 * 1000); // 5 minutes
});

// Handle page visibility changes to refresh when user returns
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.redditTracker) {
        window.redditTracker.refresh();
    }
});