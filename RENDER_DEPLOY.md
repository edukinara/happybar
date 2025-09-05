# Deploying Happy Bar API to Render

## Prerequisites
- A Render account (sign up at https://render.com)
- Your code pushed to a GitHub repository
- Environment variables ready

## Deployment Steps

### Using External Services (Neon + Upstash)

Since you're using Neon for database and Upstash for Redis, follow these steps:

### Option 1: Using Render Blueprint (Recommended)

1. **Update render.yaml**:
   - Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username in `render.yaml`
   - Update `FRONTEND_URL` with your Vercel app URL
   - Commit and push to your repository

2. **Deploy from Render Dashboard**:
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select your repository and branch
   - Render will automatically detect `render.yaml`
   - Click "Apply" to create the web service

### Option 2: Manual Setup

1. **Get your Neon Database URLs**:
   - Go to your Neon dashboard
   - Copy both:
     - **Pooled connection string** (for DATABASE_URL)
     - **Direct connection string** (for DIRECT_URL - used for migrations)

2. **Get your Upstash Redis URL**:
   - Go to your Upstash dashboard
   - Copy the Redis connection URL (redis://...)

3. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Name: `happy-bar-api`
   - Runtime: Docker
   - Dockerfile Path: `./Dockerfile.render`
   - Branch: main
   - Region: Same as database
   - Plan: Starter ($7/month)

4. **Configure Environment Variables**:
   Add these in the "Environment" tab:

   ```bash
   # Server
   NODE_ENV=production
   PORT=3001
   HOST=0.0.0.0
   
   # Neon Database URLs
   DATABASE_URL=<your-neon-pooled-connection-string>
   DIRECT_URL=<your-neon-direct-connection-string>
   
   # Upstash Redis
   REDIS_URL=<your-upstash-redis-url>
   UPSTASH_REDIS_REST_URL=<optional-rest-url>
   UPSTASH_REDIS_REST_TOKEN=<optional-rest-token>
   
   # Auth (click "Generate" for random values)
   JWT_SECRET=<generate>
   BETTER_AUTH_SECRET=<generate>
   BETTER_AUTH_URL=https://your-service-name.onrender.com
   
   # External Services (add your actual keys)
   AUTUMN_SECRET_KEY=<your-autumn-key>
   RESEND_API_KEY=<your-resend-key>
   
   # POS Integration
   TOAST_CLIENT_ID=<your-toast-client-id>
   TOAST_CLIENT_SECRET=<your-toast-client-secret>
   
   # URLs
   FRONTEND_URL=https://your-app.vercel.app
   API_URL=https://your-service-name.onrender.com
   ```

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for the build and deployment to complete

## Post-Deployment Setup

1. **Update Frontend Environment**:
   Update your frontend's `.env.production`:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-service-name.onrender.com
   ```

2. **Test the API**:
   ```bash
   curl https://your-service-name.onrender.com/health
   ```

3. **Monitor Logs**:
   - Go to your service in Render Dashboard
   - Click "Logs" tab to monitor real-time logs

## Troubleshooting

### Common Issues and Solutions

1. **502 Bad Gateway / Service Unavailable**:
   - Check logs for startup errors
   - Ensure PORT environment variable is set correctly
   - Verify database connection string
   - Increase health check timeout in render.yaml

2. **Database Connection Issues**:
   - Verify DATABASE_URL is correct
   - Ensure database and service are in the same region
   - Check if migrations ran successfully

3. **Memory Issues**:
   - Upgrade to Standard plan ($25/month) for more memory
   - Add memory limits to Node.js:
     ```bash
     NODE_OPTIONS=--max-old-space-size=512
     ```

4. **Slow Cold Starts**:
   - Upgrade from free/starter tier to avoid sleep after 15 minutes
   - Consider using Render's "Always On" feature

## Performance Optimization

1. **Enable Auto-Scaling** (Standard plan and above):
   - Set min instances: 1
   - Set max instances: 3
   - Target CPU: 60%
   - Target Memory: 60%

2. **Configure Health Checks**:
   Update render.yaml:
   ```yaml
   healthCheckPath: /health
   healthCheckInterval: 30
   healthCheckTimeout: 10
   ```

3. **Use Build Caching**:
   Render automatically caches Docker layers, but ensure your Dockerfile is optimized with proper layer ordering.

## Monitoring

1. **Set up Alerts**:
   - Go to service settings → "Notifications"
   - Add email/Slack alerts for deploy failures and service issues

2. **View Metrics**:
   - CPU, Memory, and Response time graphs available in dashboard
   - Set up custom alerts based on thresholds

## Costs

### With External Services (Neon + Upstash):
- **Render Web Service (Starter)**: $7/month
- **Neon Database**: Free tier available (or $19/month for Pro)
- **Upstash Redis**: Free tier available (or pay-as-you-go)
- **Total: From $7/month** (using free tiers)

### For Better Performance:
- **Render Web Service (Standard)**: $25/month (2GB RAM, better CPU)
- **Total: $25/month** (plus any Neon/Upstash costs if exceeding free tier)

## Migration from Railway

1. **Export Railway Environment Variables**:
   ```bash
   railway variables --json > railway-vars.json
   ```

2. **Update any Railway-specific configurations**:
   - Remove `railway.json`
   - Update deployment workflows

3. **Update DNS** (if using custom domain):
   - Get new DNS settings from Render
   - Update your domain provider

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Docker on Render](https://render.com/docs/docker)
- [PostgreSQL on Render](https://render.com/docs/databases)
- [Environment Variables](https://render.com/docs/environment-variables)