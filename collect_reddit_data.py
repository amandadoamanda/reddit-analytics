#!/usr/bin/env python3
"""
Reddit Activity Tracker - Data Collection Script
Collects data from Reddit's public JSON API and saves to NDJSON files.
Uses only Python standard library for maximum compatibility.
"""

import json
import os
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path


def load_config():
    """Load configuration from config.json"""
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Error: config.json not found")
        return None
    except json.JSONDecodeError as e:
        print(f"Error parsing config.json: {e}")
        return None


def fetch_reddit_data(subreddit, max_retries=3):
    """
    Fetch data from Reddit's public JSON API with retry logic.
    
    Args:
        subreddit (str): The subreddit name (without r/)
        max_retries (int): Maximum number of retry attempts
        
    Returns:
        dict or None: Reddit API response data or None if failed
    """
    url = f"https://www.reddit.com/r/{subreddit}/new.json?limit=100"
    
    # Use a browser-like User-Agent to avoid blocks
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
    
    for attempt in range(max_retries):
        try:
            print(f"Fetching data for r/{subreddit} (attempt {attempt + 1}/{max_retries})")
            
            request = urllib.request.Request(url, headers=headers)
            
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    print(f"Successfully fetched {len(data.get('data', {}).get('children', []))} posts")
                    return data
                else:
                    print(f"HTTP error: {response.status}")
                    
        except urllib.error.HTTPError as e:
            print(f"HTTP error {e.code}: {e.reason}")
            if e.code == 429:  # Rate limited
                wait_time = 2 ** attempt  # Exponential backoff
                print(f"Rate limited. Waiting {wait_time} seconds...")
                time.sleep(wait_time)
            elif e.code >= 500:  # Server error, retry
                wait_time = 2 ** attempt
                print(f"Server error. Waiting {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                break  # Don't retry for client errors (4xx)
                
        except urllib.error.URLError as e:
            print(f"URL error: {e.reason}")
            wait_time = 2 ** attempt
            if attempt < max_retries - 1:
                print(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
                
        except Exception as e:
            print(f"Unexpected error: {e}")
            wait_time = 2 ** attempt
            if attempt < max_retries - 1:
                print(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
    
    print(f"Failed to fetch data for r/{subreddit} after {max_retries} attempts")
    return None


def process_reddit_data(reddit_data, subreddit):
    """
    Process Reddit API response and extract relevant metrics.
    
    Args:
        reddit_data (dict): Raw Reddit API response
        subreddit (str): The subreddit name
        
    Returns:
        dict: Processed data ready for storage
    """
    if not reddit_data or 'data' not in reddit_data:
        return None
        
    posts = reddit_data['data'].get('children', [])
    
    # Calculate basic metrics
    total_posts = len(posts)
    total_score = sum(post['data'].get('score', 0) for post in posts)
    total_comments = sum(post['data'].get('num_comments', 0) for post in posts)
    
    # Get current hour for activity tracking
    current_hour = datetime.utcnow().hour
    
    # Count posts by hour (using created_utc)
    hourly_posts = {}
    for post in posts:
        post_time = datetime.fromtimestamp(post['data']['created_utc'])
        hour = post_time.hour
        hourly_posts[hour] = hourly_posts.get(hour, 0) + 1
    
    # Extract recent post titles and scores
    recent_posts = []
    for post in posts[:10]:  # Top 10 most recent
        post_data = post['data']
        recent_posts.append({
            'title': post_data.get('title', ''),
            'score': post_data.get('score', 0),
            'comments': post_data.get('num_comments', 0),
            'created_utc': post_data.get('created_utc', 0),
            'author': post_data.get('author', '[deleted]'),
            'url': f"https://reddit.com{post_data.get('permalink', '')}"
        })
    
    return {
        'timestamp': datetime.utcnow().isoformat(),
        'subreddit': subreddit,
        'total_posts': total_posts,
        'total_score': total_score,
        'total_comments': total_comments,
        'current_hour': current_hour,
        'hourly_posts': hourly_posts,
        'recent_posts': recent_posts,
        'collection_time_utc': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    }


def save_data(data, base_path='docs/data'):
    """
    Save processed data to both daily NDJSON file and current.json.
    
    Args:
        data (dict): Processed Reddit data
        base_path (str): Base directory for data storage
    """
    if not data:
        print("No data to save")
        return
        
    # Create directory structure: docs/data/YYYY/MM/
    now = datetime.utcnow()
    year_month_path = Path(base_path) / str(now.year) / f"{now.month:02d}"
    year_month_path.mkdir(parents=True, exist_ok=True)
    
    # Save to daily NDJSON file
    daily_file = year_month_path / f"{now.day:02d}.ndjson"
    with open(daily_file, 'a', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
        f.write('\n')
    
    print(f"Data appended to: {daily_file}")
    
    # Update current.json with latest data
    current_file = Path(base_path) / 'current.json'
    with open(current_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Current data updated: {current_file}")


def main():
    """Main execution function"""
    print("Reddit Activity Tracker - Starting data collection")
    print(f"Collection time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    
    # Load configuration
    config = load_config()
    if not config:
        return
    
    subreddit = config.get('subreddit', 'apstudents')
    print(f"Target subreddit: r/{subreddit}")
    
    # Create data directory
    Path('docs/data').mkdir(parents=True, exist_ok=True)
    
    # Fetch and process data
    reddit_data = fetch_reddit_data(subreddit)
    if reddit_data:
        processed_data = process_reddit_data(reddit_data, subreddit)
        if processed_data:
            save_data(processed_data)
            print("Data collection completed successfully")
        else:
            print("Failed to process Reddit data")
    else:
        print("Failed to fetch Reddit data")


if __name__ == "__main__":
    main()