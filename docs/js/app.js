/**
 * Reddit Activity Tracker - Main Application
 * Handles data loading, UI updates, and dashboard functionality
 */

class RedditActivityTracker {
    constructor() {
        this.data = null;
        this.charts = {};
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
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
        
        document.getElementById('lastUpdated').textContent = `Last updated: ${timeString}`;
    }

    /**
     * Update the metrics cards
     */
    updateMetrics() {
        const { total_posts, total_score, total_comments, hourly_posts, current_hour } = this.data;
        
        // Format numbers with commas
        const formatNumber = (num) => {
            return new Intl.NumberFormat('en-US').format(num);
        };
        
        // Update metric values
        document.getElementById('totalPosts').textContent = formatNumber(total_posts);
        document.getElementById('totalScore').textContent = formatNumber(total_score);
        document.getElementById('totalComments').textContent = formatNumber(total_comments);
        
        // Current hour activity
        const currentHourPosts = hourly_posts[current_hour] || 0;
        document.getElementById('currentHourActivity').textContent = formatNumber(currentHourPosts);
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
                    <a href="${post.url}" target="_blank" rel="noopener" class="post-title">
                        ${this.escapeHtml(post.title)}
                    </a>
                    <div class="post-meta">
                        <span>👤 <span class="post-author">${this.escapeHtml(post.author)}</span></span>
                        <span>⬆️ ${post.score} points</span>
                        <span>💬 ${post.comments} comments</span>
                        <span>🕒 ${timeAgo}</span>
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
        const ctx = document.getElementById('heatmapChart').getContext('2d');
        const hourlyData = this.data.hourly_posts || {};
        
        // Create data for all 24 hours
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const data = hours.map(hour => hourlyData[hour] || 0);
        const labels = hours.map(hour => {
            const time = new Date();
            time.setHours(hour, 0, 0, 0);
            return time.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                hour12: true 
            });
        });

        this.charts.heatmap = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Posts',
                    data: data,
                    backgroundColor: (ctx) => {
                        const value = ctx.parsed.y;
                        const max = Math.max(...data);
                        const intensity = max > 0 ? value / max : 0;
                        return `rgba(255, 69, 0, ${0.3 + intensity * 0.7})`;
                    },
                    borderColor: '#ff4500',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                const hour = hours[context[0].dataIndex];
                                return `${hour}:00 - ${hour + 1}:00 UTC`;
                            },
                            label: (context) => {
                                return `${context.parsed.y} posts`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Hour of Day (UTC)'
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Posts'
                        },
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    /**
     * Initialize the trends chart (placeholder for now)
     */
    initializeTrendsChart() {
        const ctx = document.getElementById('trendsChart').getContext('2d');
        
        // For now, show a simple message since we only have current data
        // In a real implementation, this would show historical trends
        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Current'],
                datasets: [{
                    label: 'Total Posts',
                    data: [this.data.total_posts],
                    borderColor: '#ff4500',
                    backgroundColor: 'rgba(255, 69, 0, 0.1)',
                    borderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Historical trends will appear as more data is collected'
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Posts'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

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
     * Get human-readable time ago string
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
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