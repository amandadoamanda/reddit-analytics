# Cloud Deployment Guide - Reddit Activity Tracker

## Why Cloud?
- **Runs 24/7** without keeping your computer on
- **More reliable** - no interruptions from sleep/restart
- **Access from anywhere** - check data from any device
- **Better uptime** - cloud servers rarely go down

## Option 1: Railway.app (Easiest + Free Tier)

**Cost**: Free tier available ($5/month after)
**Setup Time**: 10 minutes

### Steps:
1. Push code to GitHub
2. Connect Railway to your GitHub repo
3. It auto-deploys and runs continuously

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Your app runs 24/7 in the cloud!
```

**Pros**: Dead simple, automatic deploys from GitHub
**Cons**: Free tier limited to 500 hours/month

## Option 2: Google Cloud Run + Cloud Scheduler (Most Reliable)

**Cost**: ~$2-5/month
**Setup Time**: 30 minutes

### Architecture:
- **Cloud Scheduler**: Triggers every minute
- **Cloud Run**: Runs your Python script
- **Cloud SQL/Firestore**: Stores data

```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: reddit-tracker
spec:
  template:
    spec:
      containers:
      - image: gcr.io/project/reddit-tracker
        env:
        - name: REDDIT_CLIENT_ID
          value: "your_id"
```

```bash
# Deploy
gcloud run deploy reddit-tracker --source .
gcloud scheduler jobs create http reddit-collector \
  --schedule="* * * * *" \
  --uri="https://reddit-tracker-xyz.run.app/collect"
```

## Option 3: AWS Lambda + EventBridge (Serverless)

**Cost**: ~$1-3/month (pay per execution)
**Setup Time**: 45 minutes

### How it works:
- **EventBridge**: Triggers Lambda every minute
- **Lambda**: Runs for 10 seconds, collects data
- **DynamoDB/RDS**: Stores results

```python
# lambda_function.py
import boto3
from reddit_collector import collect_data

def lambda_handler(event, context):
    data = collect_data()
    save_to_dynamodb(data)
    return {'statusCode': 200}
```

**Pros**: Only pay when it runs, scales automatically
**Cons**: More complex setup

## Option 4: Fly.io (Modern & Simple)

**Cost**: Free tier, then ~$2/month
**Setup Time**: 15 minutes

```toml
# fly.toml
app = "reddit-tracker"

[processes]
tracker = "python reddit_tracker.py"

[[services]]
  internal_port = 8080
  protocol = "tcp"
```

```bash
fly launch
fly deploy
# Done! Running globally
```

## Option 5: Replit (Easiest for Beginners)

**Cost**: Free with limitations, $7/month for always-on
**Setup Time**: 5 minutes

1. Create new Python repl
2. Paste your code
3. Add secrets (API keys)
4. Enable "Always On" ($7/month)

**Pros**: Browser-based, no terminal needed
**Cons**: Can be slow, limited resources

## Option 6: Raspberry Pi at Home (One-Time Cost)

**Cost**: $35-80 one-time
**Setup**: 1 hour

Buy a Raspberry Pi, set it up at home, runs 24/7 using minimal power (~$5/year electricity).

## Option 7: GitHub Actions (Creative Free Solution)

**Cost**: FREE (2000 minutes/month)
**Limitations**: Runs every 5 minutes minimum

```yaml
# .github/workflows/collect.yml
name: Collect Reddit Data
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: python reddit_tracker.py
      - uses: actions/upload-artifact@v2
        with:
          name: reddit-data
          path: reddit_activity.db
```

## Cost Comparison Table

| Service | Free Tier | Paid Cost | Setup Difficulty | Reliability |
|---------|-----------|-----------|------------------|-------------|
| Railway | 500 hrs/mo | $5/mo | ⭐ Easy | High |
| Google Cloud | $300 credit | $2-5/mo | ⭐⭐ Medium | Very High |
| AWS Lambda | 1M requests | $1-3/mo | ⭐⭐⭐ Hard | Very High |
| Fly.io | 3 small VMs | $2/mo | ⭐ Easy | High |
| Replit | Limited | $7/mo | ⭐ Easy | Medium |
| GitHub Actions | 2000 min/mo | $0 | ⭐⭐ Medium | High |
| Raspberry Pi | N/A | $35 once | ⭐⭐ Medium | High |

## Recommended Approach for You

### For Simplicity + Free Start:
**Use Railway.app** 
- Push to GitHub → Auto-deploys
- Free tier gets you started
- Upgrade when needed

### For Long-term Cheap:
**Use Google Cloud Run**
- Pay only for what you use
- ~$2-3/month for your needs
- Professional setup

### For Completely Free:
**Use GitHub Actions**
- Limitation: 5-minute intervals
- But totally free forever
- Good enough for trend analysis

## Database Considerations for Cloud

### Option A: Cloud Database
- **Supabase**: Free PostgreSQL (500MB)
- **PlanetScale**: Free MySQL (5GB)
- **MongoDB Atlas**: Free tier (512MB)

### Option B: Keep SQLite + Sync
```python
# Upload to cloud storage after each write
import boto3

def sync_to_s3():
    s3 = boto3.client('s3')
    s3.upload_file('reddit_activity.db', 'my-bucket', 'reddit_activity.db')
```

## Accessing Your Data Remotely

### 1. Simple Web Dashboard
Deploy a small Flask app alongside:
```python
from flask import Flask, render_template
app = Flask(__name__)

@app.route('/')
def dashboard():
    data = get_recent_data()
    return render_template('dashboard.html', data=data)
```

### 2. Download Database Periodically
```bash
# Download from cloud
scp user@server:/path/to/reddit_activity.db ./local_copy.db

# Or from S3
aws s3 cp s3://bucket/reddit_activity.db ./
```

### 3. API Endpoint
Add an endpoint to query data:
```python
@app.route('/api/activity/<subreddit>')
def get_activity(subreddit):
    data = query_database(subreddit)
    return jsonify(data)
```

## Quick Start: Railway (Recommended)

1. **Prepare your code:**
```python
# requirements.txt
praw==7.6.0
python-dotenv==1.0.0
sqlite3

# Procfile
worker: python reddit_tracker.py
```

2. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

3. **Deploy to Railway:**
- Go to railway.app
- Click "New Project"
- Select "Deploy from GitHub repo"
- Add environment variables (Reddit API keys)
- Done! Running 24/7

## Security Notes for Cloud

1. **Never commit API keys** - Use environment variables
2. **Secure your database** - Use authentication
3. **Monitor usage** - Set up billing alerts
4. **Backup data** - Download periodically

## Making the Decision

**Choose Cloud if:**
- You want true 24/7 collection
- You're okay with $2-5/month cost
- You want professional reliability

**Choose Local (your Mac) if:**
- Your computer is usually on
- You want zero monthly costs  
- You're just testing/experimenting

For marketing research where you need consistent data, cloud is worth the small cost!