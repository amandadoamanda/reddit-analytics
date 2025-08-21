# Reddit Activity Tracker

A real-time dashboard for tracking activity in the r/apstudents subreddit. This system automatically collects data from Reddit's public API every 5 minutes and displays activity patterns through an interactive web dashboard.

## Features

- **Real-time Data Collection**: Automatically fetches data every 5 minutes using GitHub Actions
- **Activity Heatmap**: 24-hour visualization showing posting patterns by hour
- **Key Metrics**: Displays total posts, scores, comments, and current hour activity
- **Recent Posts**: Shows the latest posts with titles, scores, and engagement
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- **No Backend Required**: Fully static site that can be hosted on GitHub Pages

## Live Dashboard

The dashboard is automatically deployed to GitHub Pages and can be accessed at:
`https://[your-username].github.io/reddit-analytics/`

## System Architecture

```
.
├── .github/workflows/
│   └── collect.yml           # GitHub Actions workflow (runs every 5 minutes)
├── docs/                     # GitHub Pages site
│   ├── index.html           # Main dashboard
│   ├── css/style.css        # Styling
│   ├── js/
│   │   ├── app.js           # Main application logic
│   │   └── charts.js        # Chart configurations
│   └── data/                # Data storage
│       ├── current.json     # Latest data snapshot
│       └── YYYY/MM/         # Historical data by year/month
│           └── DD.ndjson    # Daily data files
├── collect_reddit_data.py   # Data collection script
├── config.json             # Configuration settings
└── README.md               # This file
```

## Setup Instructions

### 1. Fork and Clone

1. Fork this repository to your GitHub account
2. Clone your fork to your local machine:
   ```bash
   git clone https://github.com/[your-username]/reddit-analytics.git
   cd reddit-analytics
   ```

### 2. Enable GitHub Actions

1. Go to your repository on GitHub
2. Click on the "Actions" tab
3. Click "I understand my workflows, go ahead and enable them"

### 3. Enable GitHub Pages

1. Go to Settings → Pages in your repository
2. Under "Source", select "Deploy from a branch"
3. Select "main" branch and "/docs" folder
4. Click "Save"
5. Your dashboard will be available at `https://[your-username].github.io/reddit-analytics/`

### 4. Configuration (Optional)

Edit `config.json` to customize the tracker:

```json
{
  "subreddit": "apstudents",
  "collection_interval_minutes": 5,
  "data_retention_days": 30,
  "dashboard_title": "r/apstudents Activity Tracker",
  "dashboard_description": "Real-time tracking of activity in the AP Students subreddit",
  "timezone": "UTC",
  "max_recent_posts": 10
}
```

### 5. Test Locally (Optional)

You can test the data collection script locally:

```bash
python3 collect_reddit_data.py
```

This will:
- Create the `docs/data/` directory structure
- Fetch data from Reddit's API
- Save data to `docs/data/current.json`
- Create historical files in `docs/data/YYYY/MM/DD.ndjson`

## How It Works

### Data Collection

The `collect_reddit_data.py` script:
- Uses only Python standard library (no external dependencies)
- Fetches data from Reddit's public JSON API (`https://reddit.com/r/apstudents/new.json`)
- Implements retry logic with exponential backoff (1s, 2s, 4s delays)
- Handles rate limiting and network errors gracefully
- Saves data in two formats:
  - `current.json`: Latest snapshot for the dashboard
  - Daily NDJSON files: Historical data for trends

### Automation

GitHub Actions workflow:
- Runs every 5 minutes using cron schedule
- Uses Ubuntu environment with Python 3.11
- Automatically commits new data files
- Handles failures gracefully without breaking the workflow

### Dashboard

The web dashboard:
- Loads data from `./data/current.json` (relative path)
- Uses Chart.js for interactive visualizations
- Automatically refreshes every 5 minutes
- Responsive design works on all devices
- No backend server required

## Data Format

### current.json
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "subreddit": "apstudents",
  "total_posts": 87,
  "total_score": 1542,
  "total_comments": 234,
  "current_hour": 10,
  "hourly_posts": {
    "0": 2, "1": 1, "2": 0, "3": 1,
    "4": 3, "5": 8, "6": 12, "7": 15,
    "8": 18, "9": 21, "10": 6, "11": 0
  },
  "recent_posts": [
    {
      "title": "Question about AP Chemistry",
      "score": 23,
      "comments": 8,
      "created_utc": 1705316400,
      "author": "student123",
      "url": "https://reddit.com/r/apstudents/comments/..."
    }
  ],
  "collection_time_utc": "2024-01-15 10:30:00"
}
```

### Historical Data (NDJSON)
Each line in the daily files contains a complete data snapshot, allowing for trend analysis over time.

## Customization

### Changing the Target Subreddit

1. Edit `config.json` and change the `"subreddit"` value
2. Update the dashboard title and description in `config.json`
3. Optionally update the HTML title and headers in `docs/index.html`

### Modifying Collection Frequency

1. Edit `.github/workflows/collect.yml`
2. Change the cron schedule (currently `*/5 * * * *` for every 5 minutes)
3. Update `config.json` if needed

### Styling Customization

Edit `docs/css/style.css` to customize:
- Colors and branding
- Layout and spacing
- Mobile responsiveness
- Dark mode support

## Troubleshooting

### No Data Appearing

1. Check GitHub Actions logs for errors
2. Verify the workflow is enabled
3. Ensure GitHub Pages is configured correctly
4. Check browser console for JavaScript errors

### Rate Limiting

The script includes retry logic for rate limiting, but if you encounter persistent issues:
1. Increase delays in the retry logic
2. Reduce collection frequency
3. Check if Reddit is blocking requests

### GitHub Actions Failing

1. Check the Actions tab for error logs
2. Verify repository permissions
3. Ensure the Python script runs without errors locally

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Disclaimer

This tool uses Reddit's public API and complies with their terms of service. No personal information is collected or stored. All data shown is publicly available on Reddit.