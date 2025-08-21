// Chart.js configurations for marketing insights dashboard
// Wait for Chart.js to be available
if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
}

const chartColors = {
    primary: '#60a5fa',
    primaryDark: '#3b82f6',
    primaryLight: '#93c5fd',
    background: '#09090b',
    card: '#0c0c0f',
    border: '#27272a',
    text: '#fafafa',
    muted: '#a1a1aa',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gradient1: 'rgba(96, 165, 250, 0.1)',
    gradient2: 'rgba(96, 165, 250, 0.05)'
};

// Set default Chart.js options for dark theme (only if Chart is loaded)
if (typeof Chart !== 'undefined') {
    Chart.defaults.color = chartColors.text;
    Chart.defaults.borderColor = chartColors.border;
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
}

function createContentPerformanceChart(ctx, data) {
    // Show which content types drive the most engagement
    if (!data || !data.content_types) {
        return createEmptyChart(ctx, 'No content type data available');
    }
    
    const contentTypes = data.content_types || {};
    const labels = Object.keys(contentTypes).map(type => {
        // Make labels more readable
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    });
    const values = Object.values(contentTypes);
    
    // Color code by performance
    const colors = labels.map(label => {
        if (label.includes('Help')) return chartColors.success;
        if (label.includes('Question')) return chartColors.primary;
        if (label.includes('Success')) return chartColors.warning;
        return chartColors.primaryLight;
    });
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: chartColors.background,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            return data.labels.map((label, i) => ({
                                text: `${label} (${data.datasets[0].data[i]})`,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                hidden: false,
                                index: i
                            }));
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Content Type Distribution',
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
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${percentage}% (${value} posts)`;
                        }
                    }
                }
            }
        }
    });
}

function createEngagementTimelineChart(ctx, data) {
    // Show engagement metrics for recent posts
    if (!data || !data.recent_posts || data.recent_posts.length === 0) {
        return createEmptyChart(ctx, 'No recent posts data available');
    }
    
    const posts = data.recent_posts.slice(0, 10).reverse(); // Show chronologically
    
    // Truncate long titles for display
    const labels = posts.map(p => {
        const title = p.title.length > 40 ? p.title.substring(0, 40) + '...' : p.title;
        return title;
    });
    
    // Calculate engagement rate (engagement per 100 subscribers)
    const subscriberBase = data.subscribers || 1;
    const engagementRates = posts.map(p => {
        const engagement = p.engagement || (p.score + p.comments * 2);
        return ((engagement / subscriberBase) * 10000).toFixed(3); // Per 10k subscribers
    });
    
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Engagement per 10k subscribers',
                    data: engagementRates,
                    backgroundColor: posts.map(p => {
                        const engagement = p.engagement || (p.score + p.comments * 2);
                        if (engagement > 50) return chartColors.success;
                        if (engagement > 20) return chartColors.primary;
                        return chartColors.primaryLight;
                    }),
                    borderColor: chartColors.border,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            indexAxis: 'y', // Horizontal bars
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Post Performance Analysis',
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
                        afterLabel: function(context) {
                            const post = posts[context.dataIndex];
                            return [
                                `Type: ${post.type?.replace(/_/g, ' ') || 'Unknown'}`,
                                `Score: ${post.score}, Comments: ${post.comments}`,
                                `Total Engagement: ${post.engagement || post.score + post.comments * 2}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Engagement Rate',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: chartColors.border + '30',
                        drawBorder: false
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        autoSkip: false
                    }
                }
            }
        }
    });
}

function createMarketingMetricsChart(ctx, data) {
    // Create a comprehensive view of key marketing metrics
    const metrics = {
        'Active Reach': data.active_users || 0,
        'Posts/Day': data.posts_last_24h || 0,
        'Avg Engagement': Math.round(data.avg_engagement_rate || 0),
        'High Performers': (data.high_engagement_posts?.length || 0) * 10
    };
    
    const maxValue = Math.max(...Object.values(metrics), 100);
    
    return new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.keys(metrics),
            datasets: [{
                label: 'Current Metrics',
                data: Object.values(metrics),
                borderColor: chartColors.primary,
                backgroundColor: chartColors.gradient1,
                borderWidth: 2,
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: chartColors.background,
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Marketing Opportunity Score',
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
                r: {
                    beginAtZero: true,
                    max: maxValue,
                    grid: {
                        color: chartColors.border + '30'
                    },
                    pointLabels: {
                        font: {
                            size: 12
                        },
                        color: chartColors.text
                    },
                    ticks: {
                        display: false
                    }
                }
            }
        }
    });
}

function createEmptyChart(ctx, message) {
    // Placeholder chart when no data is available
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['No Data'],
            datasets: [{
                label: message,
                data: [0],
                backgroundColor: chartColors.border
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: message,
                    color: chartColors.muted,
                    font: {
                        size: 14
                    }
                }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

// Export functions for use in app.js
window.createContentPerformanceChart = createContentPerformanceChart;
window.createEngagementTimelineChart = createEngagementTimelineChart;
window.createMarketingMetricsChart = createMarketingMetricsChart;