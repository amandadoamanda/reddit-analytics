// Simplified time-series charts that work with limited data
function initializeTimeSeriesCharts() {
    // Initialize with simulated historical data for demonstration
    // In production, this would load from aggregated NDJSON files
    
    initializeActiveUsersChart('hour');
    initializeEngagementChart('hour');
    
    // Set up toggle buttons
    setupTimeRangeButtons();
}

function generateTimeSeriesData(range) {
    const now = new Date();
    const data = [];
    
    switch(range) {
        case 'hour':
            // Generate last 24 hours of data
            for (let i = 23; i >= 0; i--) {
                const time = new Date(now - i * 60 * 60 * 1000);
                const hour = time.getHours();
                // Simulate typical activity patterns
                let baseActivity = 30;
                if (hour >= 14 && hour <= 22) baseActivity = 120; // Afternoon/evening peak
                if (hour >= 0 && hour <= 6) baseActivity = 15; // Night low
                
                data.push({
                    time: time,
                    activeUsers: Math.round(baseActivity + Math.random() * 40 - 20),
                    engagement: Math.round((baseActivity * 3) + Math.random() * 100 - 50),
                    posts: Math.round(baseActivity / 10 + Math.random() * 5)
                });
            }
            break;
            
        case 'day':
            // Generate last 7 days
            for (let i = 6; i >= 0; i--) {
                const time = new Date(now - i * 24 * 60 * 60 * 1000);
                const dayOfWeek = time.getDay();
                // Higher activity on weekends for students
                let baseActivity = dayOfWeek === 0 || dayOfWeek === 6 ? 150 : 100;
                
                data.push({
                    time: time,
                    activeUsers: Math.round(baseActivity + Math.random() * 50),
                    engagement: Math.round((baseActivity * 5) + Math.random() * 200),
                    posts: Math.round(baseActivity / 5 + Math.random() * 10)
                });
            }
            break;
            
        case 'week':
            // Generate last 4 weeks
            for (let i = 3; i >= 0; i--) {
                const time = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
                const baseActivity = 700 + Math.random() * 200;
                
                data.push({
                    time: time,
                    activeUsers: Math.round(baseActivity),
                    engagement: Math.round(baseActivity * 10),
                    posts: Math.round(baseActivity / 2)
                });
            }
            break;
            
        case 'month':
            // Generate last 3 months
            for (let i = 2; i >= 0; i--) {
                const time = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const baseActivity = 3000 + Math.random() * 500;
                
                data.push({
                    time: time,
                    activeUsers: Math.round(baseActivity),
                    engagement: Math.round(baseActivity * 15),
                    posts: Math.round(baseActivity / 1.5)
                });
            }
            break;
    }
    
    return data;
}

function getTimeLabels(data, range) {
    return data.map(point => {
        const date = point.time;
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
        }
    });
}

let activeUsersChart = null;
let engagementChart = null;

function initializeActiveUsersChart(range) {
    const canvas = document.getElementById('activeUsersChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = generateTimeSeriesData(range);
    const labels = getTimeLabels(data, range);
    
    // Destroy existing chart if it exists
    if (activeUsersChart) {
        activeUsersChart.destroy();
    }
    
    activeUsersChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Active Users',
                data: data.map(d => d.activeUsers),
                borderColor: '#60a5fa',
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: range === 'hour' ? 1 : 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#60a5fa'
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
                    text: `Active Users - ${range.charAt(0).toUpperCase() + range.slice(1)}ly View (Eastern Time)`,
                    color: '#fafafa',
                    font: {
                        size: 14,
                        weight: '600'
                    }
                },
                tooltip: {
                    backgroundColor: '#0c0c0f',
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
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
                        maxTicksLimit: range === 'hour' ? 12 : 8
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(39, 39, 42, 0.3)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function initializeEngagementChart(range) {
    const canvas = document.getElementById('engagementChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = generateTimeSeriesData(range);
    const labels = getTimeLabels(data, range);
    
    // Destroy existing chart if it exists
    if (engagementChart) {
        engagementChart.destroy();
    }
    
    engagementChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Engagement',
                    data: data.map(d => d.engagement),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: range === 'hour' ? 1 : 3,
                    pointHoverRadius: 5,
                    yAxisID: 'y'
                },
                {
                    label: 'Posts',
                    data: data.map(d => d.posts),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: range === 'hour' ? 1 : 3,
                    pointHoverRadius: 5,
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
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: `Engagement & Activity - ${range.charAt(0).toUpperCase() + range.slice(1)}ly View (Eastern Time)`,
                    color: '#fafafa',
                    font: {
                        size: 14,
                        weight: '600'
                    }
                },
                tooltip: {
                    backgroundColor: '#0c0c0f',
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
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
                        maxTicksLimit: range === 'hour' ? 12 : 8
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(39, 39, 42, 0.3)'
                    },
                    title: {
                        display: true,
                        text: 'Engagement',
                        color: '#a1a1aa'
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
                        text: 'Posts',
                        color: '#a1a1aa'
                    }
                }
            }
        }
    });
}

function setupTimeRangeButtons() {
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', function() {
            const chartType = this.dataset.chart;
            const range = this.dataset.range;
            
            // Update active state for this chart's buttons
            document.querySelectorAll(`.time-btn[data-chart="${chartType}"]`).forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Update the appropriate chart
            if (chartType === 'activeUsers') {
                initializeActiveUsersChart(range);
            } else if (chartType === 'engagement') {
                initializeEngagementChart(range);
            }
        });
    });
}

// Export for use in app.js
window.initializeTimeSeriesCharts = initializeTimeSeriesCharts;