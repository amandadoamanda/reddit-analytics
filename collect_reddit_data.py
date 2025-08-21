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

def fetch_reddit_posts(subreddit, sort='hot', max_retries=3):
    """
    Fetch posts from Reddit's public JSON API with retry logic.
    
    Args:
        subreddit (str): The subreddit name (without r/)
        sort (str): Sort order - 'hot', 'new', 'top', 'rising'
        max_retries (int): Maximum number of retry attempts
        
    Returns:
        dict or None: Reddit API response data or None if failed
    """
    url = f"https://www.reddit.com/r/{subreddit}/{sort}.json?limit=50"
    
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


def analyze_post_type(title, text=""):
    """Categorize post type for marketing insights"""
    title_lower = title.lower()
    
    if any(word in title_lower for word in ['help', 'how to', 'how do', 'can someone', 'need help', 'struggling']):
        return 'help_request'
    elif any(word in title_lower for word in ['got a 5', 'got a 4', 'passed', 'score', 'results']):
        return 'success_story'
    elif any(word in title_lower for word in ['advice', 'tips', 'guide', 'resources']):
        return 'advice_sharing'
    elif '?' in title:
        return 'question'
    elif any(word in title_lower for word in ['meme', 'anyone else', 'when you', 'that moment']):
        return 'relatable_content'
    else:
        return 'discussion'

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
    
    # Process recent posts with marketing insights
    posts_info = {
        'recent_posts': [],
        'total_score': 0,
        'total_comments': 0,
        'posts_last_hour': 0,
        'posts_last_24h': 0,
        'content_types': {},
        'high_engagement_posts': [],
        'avg_engagement_rate': 0,
        'best_performing_type': None
    }
    
    if posts_data and 'data' in posts_data:
        posts = posts_data['data'].get('children', [])
        current_time = datetime.utcnow()
        one_hour_ago = current_time.timestamp() - 3600
        one_day_ago = current_time.timestamp() - 86400
        
        engagement_by_type = {}
        
        for i, post in enumerate(posts):
            post_data = post['data']
            created_time = post_data.get('created_utc', 0)
            
            # Time-based counting
            if created_time > one_hour_ago:
                posts_info['posts_last_hour'] += 1
            if created_time > one_day_ago:
                posts_info['posts_last_24h'] += 1
            
            # Analyze post type
            post_type = analyze_post_type(post_data.get('title', ''))
            posts_info['content_types'][post_type] = posts_info['content_types'].get(post_type, 0) + 1
            
            # Calculate engagement
            score = post_data.get('score', 0)
            comments = post_data.get('num_comments', 0)
            engagement = score + (comments * 2)  # Comments weighted more
            
            # Track engagement by type
            if post_type not in engagement_by_type:
                engagement_by_type[post_type] = []
            engagement_by_type[post_type].append(engagement)
            
            # Store post data (top 10 for display)
            if i < 10:
                posts_info['recent_posts'].append({
                    'title': post_data.get('title', ''),
                    'score': score,
                    'comments': comments,
                    'created_utc': created_time,
                    'author': post_data.get('author', '[deleted]'),
                    'url': f"https://reddit.com{post_data.get('permalink', '')}",
                    'type': post_type,
                    'engagement': engagement
                })
            
            # Track high engagement posts
            if engagement > 20:  # Threshold for "high engagement"
                posts_info['high_engagement_posts'].append({
                    'title': post_data.get('title', ''),
                    'engagement': engagement,
                    'type': post_type
                })
            
            posts_info['total_score'] += score
            posts_info['total_comments'] += comments
        
        # Calculate best performing content type
        if engagement_by_type:
            avg_by_type = {k: sum(v)/len(v) for k, v in engagement_by_type.items()}
            posts_info['best_performing_type'] = max(avg_by_type, key=avg_by_type.get)
            posts_info['avg_engagement_rate'] = sum(avg_by_type.values()) / len(avg_by_type)
    
    return {
        'timestamp': datetime.utcnow().isoformat(),
        'subreddit': subreddit,
        'active_users': subreddit_info.get('active_users', 0),
        'subscribers': subreddit_info.get('subscribers', 0),
        'posts_last_hour': posts_info['posts_last_hour'],
        'posts_last_24h': posts_info['posts_last_24h'],
        'total_score_recent': posts_info['total_score'],
        'total_comments_recent': posts_info['total_comments'],
        'recent_posts': posts_info['recent_posts'],
        'content_types': posts_info['content_types'],
        'high_engagement_posts': posts_info['high_engagement_posts'][:5],  # Top 5
        'best_performing_type': posts_info['best_performing_type'],
        'avg_engagement_rate': round(posts_info['avg_engagement_rate'], 2),
        'collection_time_utc': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
        'collection_hour': datetime.utcnow().hour
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
    
    # Fetch subreddit info and hot posts (better for engagement analysis)
    about_data = fetch_subreddit_about(subreddit)
    posts_data = fetch_reddit_posts(subreddit, sort='hot')
    
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