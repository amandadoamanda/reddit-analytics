/**
 * Reddit Activity Tracker - Chart Configurations
 * Chart.js setup and configuration for various data visualizations
 */

// Global Chart.js defaults
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif';
Chart.defaults.color = '#666';

/**
 * Chart utility functions and configurations
 */
const ChartUtils = {
    
    /**
     * Color palette for charts
     */
    colors: {
        primary: '#ff4500',
        primaryLight: 'rgba(255, 69, 0, 0.3)',
        secondary: '#0079d3',
        secondaryLight: 'rgba(0, 121, 211, 0.3)',
        success: '#46d160',
        successLight: 'rgba(70, 209, 96, 0.3)',
        warning: '#ffd635',
        warningLight: 'rgba(255, 214, 53, 0.3)',
        gray: '#878a8c',
        grayLight: 'rgba(135, 138, 140, 0.3)'
    },

    /**
     * Generate gradient background for charts
     */
    createGradient: (ctx, colorStart, colorEnd) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);
        return gradient;
    },

    /**
     * Get responsive font size based on screen width
     */
    getResponsiveFontSize: () => {
        if (window.innerWidth < 480) return 10;
        if (window.innerWidth < 768) return 11;
        return 12;
    },

    /**
     * Common chart options
     */
    getCommonOptions: () => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            legend: {
                labels: {
                    font: {
                        size: ChartUtils.getResponsiveFontSize()
                    },
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: ChartUtils.colors.primary,
                borderWidth: 1,
                cornerRadius: 6,
                displayColors: false
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    font: {
                        size: ChartUtils.getResponsiveFontSize()
                    }
                }
            },
            y: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    font: {
                        size: ChartUtils.getResponsiveFontSize()
                    }
                }
            }
        }
    }),

    /**
     * Format numbers for display in charts
     */
    formatNumber: (value) => {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        }
        if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toString();
    },

    /**
     * Generate hour labels for 24-hour display
     */
    generateHourLabels: () => {
        return Array.from({ length: 24 }, (_, i) => {
            const hour = i;
            if (hour === 0) return '12 AM';
            if (hour < 12) return `${hour} AM`;
            if (hour === 12) return '12 PM';
            return `${hour - 12} PM`;
        });
    },

    /**
     * Calculate color intensity based on value and maximum
     */
    getIntensityColor: (value, max, baseColor = ChartUtils.colors.primary) => {
        if (max === 0) return ChartUtils.colors.grayLight;
        
        const intensity = value / max;
        const opacity = 0.2 + (intensity * 0.8); // Range from 0.2 to 1.0
        
        // Extract RGB values from hex color
        const hex = baseColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
};

/**
 * Heatmap Chart Configuration
 */
const HeatmapChartConfig = {
    type: 'bar',
    
    /**
     * Generate data for hourly activity heatmap
     */
    generateData: (hourlyData) => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const data = hours.map(hour => hourlyData[hour] || 0);
        const maxValue = Math.max(...data);
        
        return {
            labels: ChartUtils.generateHourLabels(),
            datasets: [{
                label: 'Posts',
                data: data,
                backgroundColor: data.map(value => 
                    ChartUtils.getIntensityColor(value, maxValue)
                ),
                borderColor: ChartUtils.colors.primary,
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false
            }]
        };
    },

    /**
     * Get chart options for heatmap
     */
    getOptions: () => ({
        ...ChartUtils.getCommonOptions(),
        plugins: {
            ...ChartUtils.getCommonOptions().plugins,
            legend: {
                display: false
            },
            tooltip: {
                ...ChartUtils.getCommonOptions().plugins.tooltip,
                callbacks: {
                    title: (context) => {
                        const hour = context[0].dataIndex;
                        const nextHour = (hour + 1) % 24;
                        const hourLabel = ChartUtils.generateHourLabels()[hour];
                        const nextHourLabel = ChartUtils.generateHourLabels()[nextHour];
                        return `${hourLabel} - ${nextHourLabel}`;
                    },
                    label: (context) => {
                        const value = context.parsed.y;
                        return `${value} post${value !== 1 ? 's' : ''}`;
                    }
                }
            }
        },
        scales: {
            x: {
                ...ChartUtils.getCommonOptions().scales.x,
                title: {
                    display: true,
                    text: 'Hour of Day (UTC)',
                    font: {
                        size: ChartUtils.getResponsiveFontSize(),
                        weight: 'bold'
                    }
                }
            },
            y: {
                ...ChartUtils.getCommonOptions().scales.y,
                title: {
                    display: true,
                    text: 'Number of Posts',
                    font: {
                        size: ChartUtils.getResponsiveFontSize(),
                        weight: 'bold'
                    }
                },
                beginAtZero: true,
                ticks: {
                    ...ChartUtils.getCommonOptions().scales.y.ticks,
                    stepSize: 1,
                    callback: function(value) {
                        return Number.isInteger(value) ? value : '';
                    }
                }
            }
        }
    })
};

/**
 * Trends Chart Configuration
 */
const TrendsChartConfig = {
    type: 'line',
    
    /**
     * Generate data for trends chart
     */
    generateData: (trendsData) => {
        // For now, just show current data point
        // In the future, this will show historical trends
        return {
            labels: ['Current'],
            datasets: [
                {
                    label: 'Total Posts',
                    data: [trendsData.total_posts || 0],
                    borderColor: ChartUtils.colors.primary,
                    backgroundColor: ChartUtils.colors.primaryLight,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: ChartUtils.colors.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Total Score',
                    data: [trendsData.total_score || 0],
                    borderColor: ChartUtils.colors.secondary,
                    backgroundColor: ChartUtils.colors.secondaryLight,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: ChartUtils.colors.secondary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        };
    },

    /**
     * Get chart options for trends
     */
    getOptions: () => ({
        ...ChartUtils.getCommonOptions(),
        plugins: {
            ...ChartUtils.getCommonOptions().plugins,
            title: {
                display: true,
                text: 'Historical trends will appear as more data is collected',
                font: {
                    size: ChartUtils.getResponsiveFontSize(),
                    style: 'italic'
                },
                color: ChartUtils.colors.gray
            },
            legend: {
                ...ChartUtils.getCommonOptions().plugins.legend,
                position: 'top'
            }
        },
        scales: {
            x: {
                ...ChartUtils.getCommonOptions().scales.x,
                title: {
                    display: true,
                    text: 'Time',
                    font: {
                        size: ChartUtils.getResponsiveFontSize(),
                        weight: 'bold'
                    }
                }
            },
            y: {
                ...ChartUtils.getCommonOptions().scales.y,
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Number of Posts',
                    font: {
                        size: ChartUtils.getResponsiveFontSize(),
                        weight: 'bold'
                    }
                },
                beginAtZero: true
            },
            y1: {
                ...ChartUtils.getCommonOptions().scales.y,
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Total Score',
                    font: {
                        size: ChartUtils.getResponsiveFontSize(),
                        weight: 'bold'
                    }
                },
                beginAtZero: true,
                grid: {
                    drawOnChartArea: false
                }
            }
        }
    })
};

// Make configurations available globally
window.ChartUtils = ChartUtils;
window.HeatmapChartConfig = HeatmapChartConfig;
window.TrendsChartConfig = TrendsChartConfig;