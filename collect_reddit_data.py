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


def fetch_subreddit_about(subreddit, max_retries=3):
    """
    Fetch subreddit about data including active user count.
    """
    url = f"https://www.reddit.com/r/{subreddit}/about.json"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
    
    for attempt in range(max_retries):
        try:
            print(f"Fetching subreddit info for r/{subreddit} (attempt {attempt + 1}/{max_retries})")
            
            request = urllib.request.Request(url, headers=headers)
            
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    print(f"Successfully fetched subreddit info")
                    return data
                    
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"Error: {e}. Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                print(f"Failed to fetch subreddit info: {e}")
    
    return None

def fetch_reddit_posts(subreddit, max_retries=3):
    """
    Fetch recent posts from Reddit's public JSON API with retry logic.
    
    Args:
        subreddit (str): The subreddit name (without r/)
        max_retries (int): Maximum number of retry attempts
        
    Returns:
        dict or None: Reddit API response data or None if failed
    """
    url = f"https://www.reddit.com/r/{subreddit}/new.json?limit=25"
    
    # Use a browser-like User-Agent to avoid blocks
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
    
    for attempt in range(max_retries):
        try:
            print(f"Fetching recent posts for r/{subreddit} (attempt {attempt + 1}/{max_retries})")
            
            request = urllib.request.Request(url, headers=headers)
            
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    print(f"Successfully fetched {len(data.get('data', {}).get('children', []))} recent posts")
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


def process_reddit_data(about_data, posts_data, subreddit):
    """
    Process Reddit API responses and extract relevant metrics.
    
    Args:
        about_data (dict): Subreddit about.json response
        posts_data (dict): Recent posts response
        subreddit (str): The subreddit name
        
    Returns:
        dict: Processed data ready for storage
    """
    # Extract subreddit metrics
    subreddit_info = {}
    if about_data and 'data' in about_data:
        sub_data = about_data['data']
        subreddit_info = {
            'active_users': sub_data.get('active_user_count', 0),  # Users active in last 15 minutes
            'subscribers': sub_data.get('subscribers', 0),
            'accounts_active': sub_data.get('accounts_active', 0),  # Alternative field for active users
            'created_utc': sub_data.get('created_utc', 0),
            'public_description': sub_data.get('public_description', '')
        }
        # Use accounts_active if active_user_count is 0 or missing
        if subreddit_info['active_users'] == 0 and subreddit_info['accounts_active'] > 0:
            subreddit_info['active_users'] = subreddit_info['accounts_active']
    
    # Process recent posts
    posts_info = {
        'recent_posts': [],
        'total_score': 0,
        'total_comments': 0,
        'posts_last_hour': 0
    }
    
    if posts_data and 'data' in posts_data:
        posts = posts_data['data'].get('children', [])
        current_time = datetime.utcnow()
        one_hour_ago = current_time.timestamp() - 3600
        
        for post in posts[:10]:  # Keep top 10 for display
            post_data = post['data']
            created_time = post_data.get('created_utc', 0)
            
            # Count posts from last hour
            if created_time > one_hour_ago:
                posts_info['posts_last_hour'] += 1
            
            posts_info['recent_posts'].append({
                'title': post_data.get('title', ''),
                'score': post_data.get('score', 0),
                'comments': post_data.get('num_comments', 0),
                'created_utc': created_time,
                'author': post_data.get('author', '[deleted]'),
                'url': f"https://reddit.com{post_data.get('permalink', '')}"
            })
            
            posts_info['total_score'] += post_data.get('score', 0)
            posts_info['total_comments'] += post_data.get('num_comments', 0)
    
    return {
        'timestamp': datetime.utcnow().isoformat(),
        'subreddit': subreddit,
        'active_users': subreddit_info.get('active_users', 0),
        'subscribers': subreddit_info.get('subscribers', 0),
        'posts_last_hour': posts_info['posts_last_hour'],
        'total_score_recent': posts_info['total_score'],
        'total_comments_recent': posts_info['total_comments'],
        'recent_posts': posts_info['recent_posts'],
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
    
    # Fetch subreddit info and recent posts
    about_data = fetch_subreddit_about(subreddit)
    posts_data = fetch_reddit_posts(subreddit)
    
    if about_data or posts_data:
        processed_data = process_reddit_data(about_data, posts_data, subreddit)
        if processed_data:
            save_data(processed_data)
            print(f"Data collection completed successfully")
            print(f"  Active users: {processed_data['active_users']}")
            print(f"  Subscribers: {processed_data['subscribers']}")
            print(f"  Posts in last hour: {processed_data['posts_last_hour']}")
        else:
            print("Failed to process Reddit data")
    else:
        print("Failed to fetch Reddit data")


if __name__ == "__main__":
    main()