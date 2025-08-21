// Chart.js configurations for shadcn-inspired dark theme
const chartColors = {
    primary: '#60a5fa',
    primaryDark: '#3b82f6',
    primaryLight: '#93c5fd',
    background: '#09090b',
    card: '#0c0c0f',
    border: '#27272a',
    text: '#fafafa',
    muted: '#a1a1aa',
    gradient1: 'rgba(96, 165, 250, 0.1)',
    gradient2: 'rgba(96, 165, 250, 0.05)'
};

// Set default Chart.js options for dark theme
Chart.defaults.color = chartColors.text;
Chart.defaults.borderColor = chartColors.border;
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function createActivityHeatmap(ctx, data) {
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const hourlyData = new Array(24).fill(0);
    
    // Aggregate data by hour
    if (data && data.hourly_posts) {
        Object.entries(data.hourly_posts).forEach(([hour, count]) => {
            hourlyData[parseInt(hour)] = count;
        });
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [{
                label: 'Posts per Hour',
                data: hourlyData,
                backgroundColor: function(context) {
                    const value = context.raw || 0;
                    const max = Math.max(...hourlyData);
                    const intensity = max > 0 ? value / max : 0;
                    return `rgba(96, 165, 250, ${0.3 + intensity * 0.7})`;
                },
                borderColor: chartColors.primary,
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
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
                    text: '24-Hour Activity Pattern',
                    color: chartColors.text,
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
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.raw} posts`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: chartColors.muted,
                        font: {
                            size: 11
                        },
                        callback: function(value, index) {
                            return index % 3 === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: chartColors.border + '30',
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: chartColors.muted,
                        font: {
                            size: 11
                        },
                        stepSize: 1,
                        callback: function(value) {
                            return Number.isInteger(value) ? value : '';
                        }
                    }
                }
            }
        }
    });
}

function createEngagementChart(ctx, data) {
    if (!data || !data.recent_posts) return null;
    
    const posts = data.recent_posts.slice(0, 7);
    const labels = posts.map(p => {
        const title = p.title.length > 30 ? p.title.substring(0, 30) + '...' : p.title;
        return title;
    });
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Score',
                    data: posts.map(p => p.score),
                    borderColor: chartColors.primary,
                    backgroundColor: chartColors.gradient1,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: chartColors.primary,
                    pointBorderColor: chartColors.background,
                    pointBorderWidth: 2
                },
                {
                    label: 'Comments',
                    data: posts.map(p => p.comments),
                    borderColor: chartColors.primaryLight,
                    backgroundColor: chartColors.gradient2,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: chartColors.primaryLight,
                    pointBorderColor: chartColors.background,
                    pointBorderWidth: 2
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
                        color: chartColors.text,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Recent Post Engagement',
                    color: chartColors.text,
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
                    displayColors: true,
                    usePointStyle: true
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: chartColors.border + '30',
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: chartColors.muted,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Export functions for use in app.js
window.createActivityHeatmap = createActivityHeatmap;
window.createEngagementChart = createEngagementChart;