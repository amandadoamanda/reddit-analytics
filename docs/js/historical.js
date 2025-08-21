// Historical data processing and time-series charts
class HistoricalDataManager {
    constructor() {
        this.historicalData = [];
        this.timeRange = 'day'; // hour, day, week, month
    }

    async loadHistoricalData() {
        try {
            // For now, we'll build history from current data
            // In production, this would load from multiple NDJSON files
            const response = await fetch('/data/current.json');
            const currentData = await response.json();
            
            // Simulate historical data for demonstration
            // Real implementation would aggregate from NDJSON files
            this.generateSimulatedHistory(currentData);
            
            return this.historicalData;
        } catch (error) {
            console.error('Failed to load historical data:', error);
            return [];
        }
    }

    generateSimulatedHistory(currentData) {
        // Generate sample historical data for the last 7 days
        const now = new Date();
        this.historicalData = [];
        
        // Generate hourly data for the last 7 days
        for (let i = 168; i >= 0; i--) { // 168 hours = 7 days
            const timestamp = new Date(now - i * 60 * 60 * 1000);
            
            // Simulate realistic patterns
            const hour = timestamp.getHours();
            const dayOfWeek = timestamp.getDay();
            
            // Base activity varies by time of day
            let baseActivity = 50;
            if (hour >= 14 && hour <= 22) baseActivity = 150; // Afternoon/evening peak
            if (hour >= 0 && hour <= 6) baseActivity = 20; // Night low
            
            // Weekends have different patterns
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                baseActivity *= 1.2;
            }
            
            // Add some randomness
            const activeUsers = Math.max(10, baseActivity + Math.random() * 50 - 25);
            const engagement = activeUsers * (2 + Math.random() * 3);
            
            this.historicalData.push({
                timestamp: timestamp.toISOString(),
                active_users: Math.round(activeUsers),
                total_engagement: Math.round(engagement),
                posts_count: Math.round(activeUsers / 10),
                hour: hour,
                dayOfWeek: dayOfWeek
            });
        }
        
        // Add current data point
        if (currentData) {
            this.historicalData.push({
                timestamp: currentData.timestamp,
                active_users: currentData.active_users || 0,
                total_engagement: (currentData.total_score_recent || 0) + (currentData.total_comments_recent || 0),
                posts_count: currentData.posts_last_hour || 0,
                hour: new Date(currentData.timestamp).getHours(),
                dayOfWeek: new Date(currentData.timestamp).getDay()
            });
        }
    }

    aggregateByTimeRange(data, range) {
        const aggregated = {};
        
        data.forEach(point => {
            const date = new Date(point.timestamp);
            let key;
            
            switch(range) {
                case 'hour':
                    // Group by hour
                    key = date.toISOString().slice(0, 13) + ':00';
                    break;
                case 'day':
                    // Group by day
                    key = date.toISOString().slice(0, 10);
                    break;
                case 'week':
                    // Group by week
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().slice(0, 10);
                    break;
                case 'month':
                    // Group by month
                    key = date.toISOString().slice(0, 7);
                    break;
                default:
                    key = date.toISOString();
            }
            
            if (!aggregated[key]) {
                aggregated[key] = {
                    timestamp: key,
                    active_users: [],
                    total_engagement: [],
                    posts_count: []
                };
            }
            
            aggregated[key].active_users.push(point.active_users);
            aggregated[key].total_engagement.push(point.total_engagement);
            aggregated[key].posts_count.push(point.posts_count);
        });
        
        // Calculate averages
        return Object.values(aggregated).map(group => ({
            timestamp: group.timestamp,
            active_users: Math.round(group.active_users.reduce((a, b) => a + b, 0) / group.active_users.length),
            total_engagement: Math.round(group.total_engagement.reduce((a, b) => a + b, 0) / group.total_engagement.length),
            posts_count: Math.round(group.posts_count.reduce((a, b) => a + b, 0) / group.posts_count.length)
        })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    getDataForRange(range) {
        this.timeRange = range;
        
        // Filter data based on range
        const now = new Date();
        let startDate = new Date();
        
        switch(range) {
            case 'hour':
                startDate = new Date(now - 24 * 60 * 60 * 1000); // Last 24 hours
                break;
            case 'day':
                startDate = new Date(now - 7 * 24 * 60 * 60 * 1000); // Last 7 days
                break;
            case 'week':
                startDate = new Date(now - 4 * 7 * 24 * 60 * 60 * 1000); // Last 4 weeks
                break;
            case 'month':
                startDate = new Date(now - 3 * 30 * 24 * 60 * 60 * 1000); // Last 3 months
                break;
        }
        
        const filteredData = this.historicalData.filter(point => 
            new Date(point.timestamp) >= startDate
        );
        
        return this.aggregateByTimeRange(filteredData, range);
    }
}

// Chart creation functions for time-series data
function createActiveUsersChart(ctx, historicalManager, range = 'day') {
    const data = historicalManager.getDataForRange(range);
    
    if (!data || data.length === 0) {
        return createEmptyChart(ctx, 'No historical data available');
    }
    
    const labels = data.map(point => {
        const date = new Date(point.timestamp);
        switch(range) {
            case 'hour':
                return date.toLocaleTimeString('en-US', { 
                    timeZone: 'America/New_York',
                    hour: 'numeric', 
                    hour12: true 
                });
            case 'day':
                return date.toLocaleDateString('en-US', { 
                    timeZone: 'America/New_York',
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                });
            case 'week':
                return 'Week of ' + date.toLocaleDateString('en-US', { 
                    timeZone: 'America/New_York',
                    month: 'short', 
                    day: 'numeric' 
                });
            case 'month':
                return date.toLocaleDateString('en-US', { 
                    timeZone: 'America/New_York',
                    month: 'short', 
                    year: 'numeric' 
                });
            default:
                return date.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
        }
    });
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Active Users',
                data: data.map(point => point.active_users),
                borderColor: chartColors.primary,
                backgroundColor: chartColors.gradient1,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: range === 'hour' ? 2 : 4,
                pointHoverRadius: 6,
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: chartColors.background,
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `Active Users Over Time - Eastern Time (${range.charAt(0).toUpperCase() + range.slice(1)}ly)`,
                    font: {
                        size: 16,
                        weight: '600'
                    },
                    padding: {
                        bottom: 20
                    }
                },
                tooltip: {
                    backgroundColor: chartColors.card,
                    titleColor: chartColors.text,
                    bodyColor: chartColors.muted,
                    borderColor: chartColors.border,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `Active Users: ${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: range === 'hour' ? 12 : 10
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: chartColors.border + '30',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    title: {
                        display: true,
                        text: 'Active Users',
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

function createEngagementChart(ctx, historicalManager, range = 'day') {
    const data = historicalManager.getDataForRange(range);
    
    if (!data || data.length === 0) {
        return createEmptyChart(ctx, 'No historical data available');
    }
    
    const labels = data.map(point => {
        const date = new Date(point.timestamp);
        switch(range) {
            case 'hour':
                return date.toLocaleTimeString('en-US', { 
                    timeZone: 'America/New_York',
                    hour: 'numeric', 
                    hour12: true 
                });
            case 'day':
                return date.toLocaleDateString('en-US', { 
                    timeZone: 'America/New_York',
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                });
            case 'week':
                return 'Week of ' + date.toLocaleDateString('en-US', { 
                    timeZone: 'America/New_York',
                    month: 'short', 
                    day: 'numeric' 
                });
            case 'month':
                return date.toLocaleDateString('en-US', { 
                    timeZone: 'America/New_York',
                    month: 'short', 
                    year: 'numeric' 
                });
            default:
                return date.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
        }
    });
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Engagement',
                    data: data.map(point => point.total_engagement),
                    borderColor: chartColors.success,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: range === 'hour' ? 2 : 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: chartColors.success,
                    pointBorderColor: chartColors.background,
                    pointBorderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Posts',
                    data: data.map(point => point.posts_count),
                    borderColor: chartColors.warning,
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: range === 'hour' ? 2 : 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: chartColors.warning,
                    pointBorderColor: chartColors.background,
                    pointBorderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: `Engagement & Activity Over Time - Eastern Time (${range.charAt(0).toUpperCase() + range.slice(1)}ly)`,
                    font: {
                        size: 16,
                        weight: '600'
                    },
                    padding: {
                        bottom: 20
                    }
                },
                tooltip: {
                    backgroundColor: chartColors.card,
                    titleColor: chartColors.text,
                    bodyColor: chartColors.muted,
                    borderColor: chartColors.border,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: range === 'hour' ? 12 : 10
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    grid: {
                        color: chartColors.border + '30',
                        drawBorder: false
                    },
                    title: {
                        display: true,
                        text: 'Total Engagement',
                        font: {
                            size: 12
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Posts Count',
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// Export for use in main app
window.HistoricalDataManager = HistoricalDataManager;
window.createActiveUsersChart = createActiveUsersChart;
window.createEngagementChart = createEngagementChart;