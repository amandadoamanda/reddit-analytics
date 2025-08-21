# Reddit Activity Tracker - Project Plan

## Overview
A **100% free**, cloud-based Reddit activity monitoring system using GitHub Actions for data collection and GitHub Pages for visualization. Tracks active user counts for r/apstudents every 5 minutes to identify optimal posting times for marketing purposes. All timestamps are stored in UTC and visualized in America/Chicago (Central Time).

## Key Features
- Track active users on r/apstudents every 5 minutes (GitHub Actions limitation)
- Completely free - no hosting costs ever
- Auto-updating dashboard hosted on GitHub Pages
- Mobile-friendly charts and heatmaps
- No server or computer needed - runs entirely in the cloud
- Simple setup with no external dependencies

## Technical Architecture - Final Decision

### 1. Data Collection Layer (GitHub Actions)

#### Reddit API Integration
- **Endpoint**: `/r/{subreddit}/about`
- **Key Field**: `active_user_count` (users active in past 15 minutes)
- **Library**: Python stdlib (`urllib.request`) – no API keys required
- **User-Agent**: `reddit-activity-tracker` (set a descriptive UA to comply with Reddit)
- **Collection Interval**: Every 5 minutes (GitHub Actions minimum)

#### GitHub Actions Workflow
```yaml
name: Collect Reddit Data
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger for testing

permissions:
  contents: write

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - name: Collect data
        run: python collect_reddit_data.py
      - uses: EndBug/add-and-commit@v9
        with:
          message: 'Update Reddit activity data'
          add: 'docs/data/**'
```

### 2. Data Storage (GitHub Repository)

#### JSON File Structure
```
docs/
└── data/
    ├── 2025/
    │   ├── 01/
    │   │   └── 21.ndjson    # Append-only daily files (one JSON object per line)
    │   └── 02/
    │       └── ...
    ├── current.json         # Latest data for quick access
    └── summary.json         # Aggregated statistics (optional)
```

#### Data Retention
- Keep all data indefinitely (no pruning). Older daily NDJSON files remain in `docs/data/YYYY/MM/DD.ndjson`.

#### Data Format
```json
{
  "timestamp": "2025-01-21T15:30:00Z",
  "data": [
    {
      "subreddit": "apstudents",
      "active_users": 1234,
      "subscribers": 456789
    }
  ]
}
```

### 3. Collection Script (Python)

```python
# collect_reddit_data.py (stdlib only, no API keys)
import json
import os
import time
from datetime import datetime, timezone
from urllib.request import Request, urlopen

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DATA_DIR = os.path.join(ROOT_DIR, 'docs', 'data')

def load_config():
    with open(os.path.join(ROOT_DIR, 'config.json'), 'r') as f:
        return json.load(f)

def fetch_about(subreddit: str, retries: int = 3) -> dict:
    for attempt in range(retries):
        try:
            url = f"https://www.reddit.com/r/{subreddit}/about.json"
            req = Request(url, headers={"User-Agent": "reddit-activity-tracker"})
            with urlopen(req, timeout=10) as resp:
                return json.load(resp)
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # 1, 2, 4 seconds
            else:
                raise

def collect(subreddits: list[str]) -> dict:
    payload = {"timestamp": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), "data": []}
    for sub in subreddits:
        try:
            about = fetch_about(sub)  # Now with retry logic
            data = about.get('data', {})
            payload["data"].append({
                "subreddit": sub,
                "active_users": data.get("active_user_count", 0),
                "subscribers": data.get("subscribers", 0),
            })
        except Exception:
            payload["data"].append({"subreddit": sub, "active_users": 0, "subscribers": 0})
    return payload

def save(payload: dict) -> None:
    dt = datetime.fromisoformat(payload["timestamp"].replace('Z', '+00:00'))
    day_dir = os.path.join(DOCS_DATA_DIR, dt.strftime('%Y'), dt.strftime('%m'))
    os.makedirs(day_dir, exist_ok=True)
    ndjson_path = os.path.join(day_dir, f"{dt.strftime('%d')}.ndjson")
    with open(ndjson_path, 'a') as f:
        f.write(json.dumps(payload) + "\n")
    current_path = os.path.join(DOCS_DATA_DIR, 'current.json')
    with open(current_path, 'w') as f:
        json.dump(payload, f)

def main():
    cfg = load_config()
    subreddits = cfg.get('subreddits', ['apstudents'])
    payload = collect(subreddits)
    save(payload)

if __name__ == '__main__':
    main()
```

### 4. Data Visualization (GitHub Pages)

#### Live Dashboard Architecture
```
docs/                    # GitHub Pages root
├── index.html          # Main dashboard
├── css/
│   └── style.css       # Custom styling
├── js/
│   ├── app.js          # Main application logic
│   ├── charts.js       # Chart.js configurations
│   └── data-loader.js  # Fetch and parse JSON data
└── CNAME               # Custom domain (optional)
```

#### Dashboard Features
- **Real-time Updates**: Fetches latest data from repo
- **Activity Heatmap**: Hour vs day of week visualization
- **Trend Charts**: 7-day, 30-day activity patterns
- **Peak Time Finder**: Best posting times for r/apstudents
- **Mobile Responsive**: Works on all devices

#### Chart.js Implementation
```javascript
// Fetch data from GitHub Pages (relative path) with cache-busting
fetch('/data/current.json?d=' + Date.now())
  .then(response => response.json())
  .then(data => updateCharts(data));
```

### 5. Implementation Steps

#### Phase 1: Repository Setup (1 hour)
1. Create new GitHub repository
2. Create folder structure (`docs/data/`)
3. Enable GitHub Pages from `docs/` folder

#### Phase 2: Collection Script (2 hours)
1. Write Python script (stdlib only) to fetch `about.json` for r/apstudents
2. Save append-only NDJSON by day under `docs/data/YYYY/MM/DD.ndjson` and update `docs/data/current.json`
3. Add timeouts and basic retry/backoff for resilience
4. Test locally

#### Phase 3: GitHub Actions Workflow (1 hour)
1. Create `.github/workflows/collect.yml`
2. Configure 5-minute cron schedule
3. Grant `contents: write` and auto-commit `docs/data/**`
4. Test workflow manually

#### Phase 4: Dashboard Development (3-4 hours)
1. Create `index.html` with Chart.js
2. Build data fetching from relative path `/data/current.json`
3. Implement activity heatmap and trend charts for r/apstudents
4. Make mobile responsive

#### Phase 5: Testing & Polish (2 hours)
1. Let system run for 24 hours
2. Verify data collection consistency
3. Fine-tune visualizations
4. Add data export features

## Configuration

### App Configuration
Create `config.json` in the repository root:
```json
{
  "subreddits": ["apstudents"],
  "timezone": "America/Chicago"
}
```

## Key Insights & Considerations

### Why This Architecture Works
- **100% Free**: GitHub Actions + GitHub Pages = $0 forever
- **No Maintenance**: Runs automatically, no server to manage
- **Reliable**: GitHub's infrastructure rarely goes down
- **Transparent**: All data and code visible in your repo
- **Scalable**: Can extend to additional subreddits later without architectural changes

### Data Collection Notes
- **5-minute intervals** still capture all major activity changes
- `active_user_count` is already a 15-minute rolling average
- 288 data points per day per subreddit (plenty for analysis)
- GitHub Actions has 2000 free minutes/month (more than enough)

### Marketing Insights You'll Get
- **Peak Activity Windows**: Find when r/apstudents is most active
- **Day/Hour Patterns**: Discover weekly rhythms (e.g., Sunday nights)
- **Trend Analysis**: See growth/decline patterns over time
- **Optimal Posting Times**: Data-driven posting schedule

## Project Structure
```
reddit-analytics/
├── .github/
│   └── workflows/
│       └── collect.yml        # GitHub Actions workflow
├── collect_reddit_data.py    # Data collection script
├── config.json               # Subreddit configuration
├── docs/                    # GitHub Pages site
│   ├── index.html          # Dashboard
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       └── charts.js
│   └── data/                # Collected data (auto-generated)
│       ├── 2025/
│       │   └── 01/
│       │       └── 21.ndjson
│       ├── current.json     # Latest data
│       └── summary.json     # Aggregated stats (optional)
└── README.md               # Setup instructions
```

## Success Metrics
- ✅ Zero hosting costs
- ✅ Automatic data collection every 5 minutes
- ✅ Dashboard accessible at yourusername.github.io/reddit-analytics
- ✅ Reliable tracking for r/apstudents
- ✅ Mobile-friendly visualizations

## How It All Works Together

1. **Every 5 minutes**: GitHub Actions wakes up
2. **Fetches data**: Python script calls Reddit API for r/apstudents
3. **Saves to repo**: Commits new JSON data back to GitHub
4. **Dashboard updates**: GitHub Pages automatically serves latest data
5. **You check anytime**: Visit your dashboard URL to see live charts

## Future Enhancements (Optional)
- Optional: support additional subreddits via UI
- Export data as CSV for deeper analysis
- Email alerts for unusual activity spikes
- Historical comparison tools
- Posting success predictor based on activity

## Quick Start Timeline
- **30 minutes**: Set up GitHub repo and Reddit API
- **2 hours**: Write collection script and GitHub Action
- **2 hours**: Build dashboard with Chart.js
- **1 hour**: Deploy to GitHub Pages and test

**Total**: ~5-6 hours to fully operational system

## Why This Approach is Perfect for Marketing Research

1. **Set and Forget**: Once deployed, runs forever without intervention
2. **Free Forever**: No monthly bills, no servers to maintain
3. **Professional Output**: Clean dashboard you can screenshot for reports
4. **Reliable Data**: GitHub's infrastructure = 99.9% uptime
5. **Easy to Modify**: Just edit config.json to adjust settings or add subreddits later