# Automatic Execution Guide - Reddit Activity Tracker

## How It Works
The script runs as a **background service** on your computer, automatically collecting data every minute even when you're not actively using it. Think of it like how Dropbox or Spotify run in the background.

## Option 1: Simple Python Loop (Easiest to Start)
The script itself contains an infinite loop that:
1. Fetches data from Reddit
2. Saves to database
3. Sleeps for 60 seconds
4. Repeats forever

```python
while True:
    collect_subreddit_data()
    time.sleep(60)  # Wait 60 seconds
```

**To run it:**
```bash
# Start in background (Mac/Linux)
nohup python3 reddit_tracker.py &

# Or use screen/tmux for better control
screen -S reddit_tracker
python3 reddit_tracker.py
# Press Ctrl+A then D to detach

# To check if it's running
ps aux | grep reddit_tracker
```

## Option 2: macOS - LaunchAgent (Most Reliable for Mac)

Since you're on macOS, this is the best approach. It will:
- Start automatically when your Mac boots up
- Restart if it crashes
- Run even when you're logged out

### Setup Steps:

1. **Create the launch agent file:**
```bash
nano ~/Library/LaunchAgents/com.reddit.tracker.plist
```

2. **Add this configuration:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.reddit.tracker</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/amandahq/reddit-analytics/reddit_tracker.py</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>/Users/amandahq/reddit-analytics</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>/Users/amandahq/reddit-analytics/logs/output.log</string>
    
    <key>StandardErrorPath</key>
    <string>/Users/amandahq/reddit-analytics/logs/error.log</string>
</dict>
</plist>
```

3. **Load and start the service:**
```bash
# Load the service
launchctl load ~/Library/LaunchAgents/com.reddit.tracker.plist

# Start it immediately
launchctl start com.reddit.tracker

# Check if it's running
launchctl list | grep reddit
```

4. **Manage the service:**
```bash
# Stop the tracker
launchctl stop com.reddit.tracker

# Restart the tracker
launchctl stop com.reddit.tracker
launchctl start com.reddit.tracker

# Unload (disable) the service
launchctl unload ~/Library/LaunchAgents/com.reddit.tracker.plist
```

## Option 3: PM2 Process Manager (Developer Friendly)

PM2 is a popular process manager that works great for long-running scripts:

```bash
# Install PM2
npm install -g pm2

# Start the tracker
pm2 start reddit_tracker.py --name reddit-tracker --interpreter python3

# Set it to start on boot
pm2 startup
pm2 save

# Monitor it
pm2 status
pm2 logs reddit-tracker
```

## Option 4: Docker Container (Most Isolated)

Run in a Docker container for complete isolation:

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "reddit_tracker.py"]
```

```bash
# Build and run
docker build -t reddit-tracker .
docker run -d --name reddit-tracker --restart always reddit-tracker
```

## Monitoring & Maintenance

### Check if it's running:
```bash
# See if process is active
ps aux | grep reddit_tracker

# Check last data collected
sqlite3 reddit_activity.db "SELECT * FROM activity_data ORDER BY timestamp DESC LIMIT 5;"

# View logs
tail -f logs/tracker.log
```

### Auto-restart on crash:
The script should include error handling:

```python
def main():
    while True:
        try:
            collect_data()
            time.sleep(60)
        except Exception as e:
            logging.error(f"Error: {e}")
            time.sleep(60)  # Wait before retry
```

## Which Option to Choose?

### For your Mac (Recommended):
**Use LaunchAgent** - It's built into macOS, very reliable, and starts automatically on boot.

### Quick testing:
**Use Simple Python Loop** with `screen` or `nohup`

### If you're familiar with Node.js:
**Use PM2** - Great dashboard and logging

## Important Notes

1. **Computer must stay on**: The script only collects data while your computer is running
2. **Network connection required**: Needs internet to reach Reddit API
3. **Handle rate limits**: Script should gracefully handle API limits
4. **Log rotation**: Prevent logs from filling disk space
5. **Database backups**: Periodically backup your SQLite database

## Testing Your Setup

After setting up automatic execution:

1. **Verify it's running:**
```bash
# Check process
ps aux | grep reddit

# Check recent data
sqlite3 reddit_activity.db "SELECT datetime(timestamp, 'localtime'), subreddit, active_users FROM activity_data ORDER BY timestamp DESC LIMIT 10;"
```

2. **Monitor for 24 hours** to ensure stable operation

3. **Check data gaps:**
```sql
-- Run this SQL to find any gaps > 2 minutes
SELECT * FROM (
    SELECT 
        timestamp,
        LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp,
        (julianday(timestamp) - julianday(LAG(timestamp) OVER (ORDER BY timestamp))) * 24 * 60 as minutes_gap
    FROM activity_data
) WHERE minutes_gap > 2;
```

The key is that once you set this up, it runs completely automatically - collecting data 24/7 without any intervention from you!