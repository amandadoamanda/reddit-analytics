// Time-series charts using REAL collected data only
function initializeTimeSeriesCharts() {
    // Load real data from NDJSON files
    loadRealTimeSeriesData().then(data => {
        if (data && data.length > 0) {
            initializeActiveUsersChart('hour', data);
            initializeEngagementChart('hour', data);
            setupTimeRangeButtons(data);
        } else {
            // Show message that we're still collecting data
            showNoDataMessage();
        }
    });
}

async function loadRealTimeSeriesData() {
    const allData = [];
    
    try {
        // Get today's date in Eastern Time
        const now = new Date();
        const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const year = easternTime.getFullYear();
        const month = String(easternTime.getMonth() + 1).padStart(2, '0');
        const day = String(easternTime.getDate()).padStart(2, '0');
        
        // Try to load today's NDJSON file
        const todayPath = `/data/${year}/${month}/${day}.ndjson`;
        
        try {
            const response = await fetch(todayPath);
            if (response.ok) {
                const text = await response.text();
                const lines = text.trim().split('\n');
                
                for (const line of lines) {
                    if (line) {
                        try {
                            const entry = JSON.parse(line);
                            // Only use entries with active_users data
                            if (entry.active_users !== undefined) {
                                allData.push({
                                    time: new Date(entry.timestamp),
                                    activeUsers: entry.active_users,
                                    engagement: (entry.total_score_recent || 0) + (entry.total_comments_recent || 0),
                                    posts: entry.posts_last_hour || 0
                                });
                            }
                        } catch (e) {
                            console.log('Skipping invalid line:', e);
                        }
                    }
                }
            }
        } catch (e) {
            console.log('No data file for today yet');
        }
        
        // Try to load previous days (up to 7 days back)
        for (let i = 1; i <= 7; i++) {
            const date = new Date(easternTime);
            date.setDate(date.getDate() - i);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const path = `/data/${y}/${m}/${d}.ndjson`;
            
            try {
                const response = await fetch(path);
                if (response.ok) {
                    const text = await response.text();
                    const lines = text.trim().split('\n');
                    
                    for (const line of lines) {
                        if (line) {
                            try {
                                const entry = JSON.parse(line);
                                if (entry.active_users !== undefined) {
                                    allData.push({
                                        time: new Date(entry.timestamp),
                                        activeUsers: entry.active_users,
                                        engagement: (entry.total_score_recent || 0) + (entry.total_comments_recent || 0),
                                        posts: entry.posts_last_hour || 0
                                    });
                                }
                            } catch (e) {
                                // Skip invalid lines
                            }
                        }
                    }
                }
            } catch (e) {
                // No data for this day
            }
        }
        
    } catch (error) {
        console.error('Error loading time series data:', error);
    }
    
    // Sort by time
    allData.sort((a, b) => a.time - b.time);
    
    return allData;
}

function filterDataByRange(data, range) {
    if (!data || data.length === 0) return [];
    
    const now = new Date();
    let startTime;
    
    switch(range) {
        case 'hour':
            startTime = new Date(now - 24 * 60 * 60 * 1000); // Last 24 hours
            break;
        case 'day':
            startTime = new Date(now - 7 * 24 * 60 * 60 * 1000); // Last 7 days
            break;
        case 'week':
            startTime = new Date(now - 4 * 7 * 24 * 60 * 60 * 1000); // Last 4 weeks
            break;
        case 'month':
            startTime = new Date(now - 3 * 30 * 24 * 60 * 60 * 1000); // Last 3 months
            break;
        default:
            startTime = new Date(now - 24 * 60 * 60 * 1000);
    }
    
    return data.filter(point => point.time >= startTime);
}

function aggregateDataByRange(data, range) {
    if (!data || data.length === 0) return [];
    
    const aggregated = {};
    
    data.forEach(point => {
        let key;
        const date = point.time;
        
        switch(range) {
            case 'hour':
                // No aggregation for hourly view
                key = date.toISOString();
                break;
            case 'day':
                // Aggregate by day
                key = date.toISOString().slice(0, 10);
                break;
            case 'week':
                // Aggregate by week
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().slice(0, 10);
                break;
            case 'month':
                // Aggregate by month
                key = date.toISOString().slice(0, 7);
                break;
            default:
                key = date.toISOString();
        }
        
        if (!aggregated[key]) {
            aggregated[key] = {
                time: range === 'hour' ? date : new Date(key),
                activeUsers: [],
                engagement: [],
                posts: []
            };
        }
        
        aggregated[key].activeUsers.push(point.activeUsers);
        aggregated[key].engagement.push(point.engagement);
        aggregated[key].posts.push(point.posts);
    });
    
    // Calculate averages
    const result = Object.values(aggregated).map(group => ({
        time: group.time,
        activeUsers: Math.round(group.activeUsers.reduce((a, b) => a + b, 0) / group.activeUsers.length),
        engagement: Math.round(group.engagement.reduce((a, b) => a + b, 0) / group.engagement.length),
        posts: Math.round(group.posts.reduce((a, b) => a + b, 0) / group.posts.length)
    }));
    
    // Sort by time
    result.sort((a, b) => a.time - b.time);
    
    return result;
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
let currentData = [];

function initializeActiveUsersChart(range, data) {
    const canvas = document.getElementById('activeUsersChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Filter and aggregate data
    const filteredData = filterDataByRange(data, range);
    const chartData = range === 'hour' ? filteredData : aggregateDataByRange(filteredData, range);
    const labels = getTimeLabels(chartData, range);
    
    // Destroy existing chart if it exists
    if (activeUsersChart) {
        activeUsersChart.destroy();
    }
    
    // If no data, show message
    if (chartData.length === 0) {
        ctx.font = '14px system-ui';
        ctx.fillStyle = '#a1a1aa';
        ctx.textAlign = 'center';
        ctx.fillText('No data available for this time range yet', canvas.width / 2, canvas.height / 2);
        ctx.fillText('Data collection started on Aug 20, 2025', canvas.width / 2, canvas.height / 2 + 20);
        return;
    }
    
    activeUsersChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Active Users',
                data: chartData.map(d => d.activeUsers),
                borderColor: '#60a5fa',
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
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
                    text: `Active Users - ${range.charAt(0).toUpperCase() + range.slice(1)}ly View (Eastern Time) - REAL DATA`,
                    color: '#fafafa',
                    font: {
                        size: 14,
                        weight: '600'
                    }
                },
                subtitle: {
                    display: true,
                    text: `Showing ${chartData.length} data points collected since Aug 20, 2025`,
                    color: '#a1a1aa',
                    font: {
                        size: 12
                    }
                },
                tooltip: {
                    backgroundColor: '#0c0c0f',
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        title: function(context) {
                            const date = chartData[context[0].dataIndex].time;
                            return date.toLocaleString('en-US', {
                                timeZone: 'America/New_York',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            }) + ' ET';
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
                        maxTicksLimit: 12
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

function initializeEngagementChart(range, data) {
    const canvas = document.getElementById('engagementChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Filter and aggregate data
    const filteredData = filterDataByRange(data, range);
    const chartData = range === 'hour' ? filteredData : aggregateDataByRange(filteredData, range);
    const labels = getTimeLabels(chartData, range);
    
    // Destroy existing chart if it exists
    if (engagementChart) {
        engagementChart.destroy();
    }
    
    // If no data, show message
    if (chartData.length === 0) {
        ctx.font = '14px system-ui';
        ctx.fillStyle = '#a1a1aa';
        ctx.textAlign = 'center';
        ctx.fillText('No data available for this time range yet', canvas.width / 2, canvas.height / 2);
        ctx.fillText('Data collection started on Aug 20, 2025', canvas.width / 2, canvas.height / 2 + 20);
        return;
    }
    
    engagementChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Engagement',
                    data: chartData.map(d => d.engagement),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    yAxisID: 'y'
                },
                {
                    label: 'Posts',
                    data: chartData.map(d => d.posts),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
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
                    text: `Engagement & Activity - ${range.charAt(0).toUpperCase() + range.slice(1)}ly View (Eastern Time) - REAL DATA`,
                    color: '#fafafa',
                    font: {
                        size: 14,
                        weight: '600'
                    }
                },
                subtitle: {
                    display: true,
                    text: `Showing ${chartData.length} data points collected since Aug 20, 2025`,
                    color: '#a1a1aa',
                    font: {
                        size: 12
                    }
                },
                tooltip: {
                    backgroundColor: '#0c0c0f',
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        title: function(context) {
                            const date = chartData[context[0].dataIndex].time;
                            return date.toLocaleString('en-US', {
                                timeZone: 'America/New_York',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            }) + ' ET';
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
                        maxTicksLimit: 12
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

function setupTimeRangeButtons(data) {
    currentData = data;
    
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
                initializeActiveUsersChart(range, currentData);
            } else if (chartType === 'engagement') {
                initializeEngagementChart(range, currentData);
            }
        });
    });
}

function showNoDataMessage() {
    // Show message in both chart canvases
    const canvases = ['activeUsersChart', 'engagementChart'];
    
    canvases.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.font = '16px system-ui';
            ctx.fillStyle = '#a1a1aa';
            ctx.textAlign = 'center';
            ctx.fillText('Data collection just started!', canvas.width / 2, canvas.height / 2 - 10);
            ctx.font = '14px system-ui';
            ctx.fillText('Charts will populate as we collect more data points', canvas.width / 2, canvas.height / 2 + 15);
            ctx.fillText('(GitHub Actions runs every 5 minutes)', canvas.width / 2, canvas.height / 2 + 35);
        }
    });
    
    // Disable buttons if no data
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
}

// Export for use in app.js
window.initializeTimeSeriesCharts = initializeTimeSeriesCharts;