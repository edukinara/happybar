# Upstash Redis Setup Guide

This guide walks you through setting up Upstash Redis for Happy Bar's session management and caching.

## Why Upstash Redis?

- **Serverless**: Pay only for what you use, no idle costs
- **Global Edge**: Deployed across multiple regions for low latency
- **Free Tier**: 10,000 commands per day to get started
- **REST API**: Easy integration with any platform
- **Automatic Backups**: Daily backups included

## Setup Steps

### 1. Create Upstash Account

1. Go to [console.upstash.com](https://console.upstash.com)
2. Sign up with GitHub (recommended) or email
3. Verify your account

### 2. Create Redis Database

1. Click **"Create Database"** from the dashboard
2. Fill in the details:
   - **Name**: `happy-bar-redis`
   - **Region**: Choose closest to your API server (e.g., US East for Railway US East)
   - **Type**: Select **Global** for multi-region replication (recommended for production)
3. Click **"Create"**

### 3. Get Connection Details

After creation, you'll see your database dashboard with:

- **REST URL**: `https://your-redis-url.upstash.io`
- **REST Token**: `your-authentication-token`

Copy these values - you'll need them for deployment.

### 4. Configure Environment Variables

Add these to your production environment:

```bash
# Railway (API Server)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-authentication-token
```

### 5. Test Connection (Optional)

You can test your Redis connection using the Upstash CLI:

```bash
# Install Upstash CLI
npm install -g @upstash/cli

# Test connection
upstash redis ping --url="https://your-redis-url.upstash.io" --token="your-token"
```

## Usage in Happy Bar

Happy Bar uses Redis for:

1. **Session Storage**: Better Auth sessions for web and mobile apps
2. **Caching**: API response caching and temporary data
3. **Rate Limiting**: Request throttling and abuse prevention
4. **Temporary Data**: Pending user invitations and assignments

## Free Tier Limits

The Upstash free tier includes:

- **10,000 commands per day**
- **256 MB storage**
- **Global replication**
- **Daily backups**

This is sufficient for:
- ~50-100 active users
- Development and testing
- Initial production deployment

## Scaling

When you exceed the free tier:

- **Pay-per-request**: $0.2 per 100K requests
- **Storage**: $0.25 per GB/month
- **Bandwidth**: Free for first 1GB/month

## Monitoring

Monitor your usage in the Upstash dashboard:

1. **Commands**: Daily request count
2. **Storage**: Database size
3. **Latency**: Response times across regions
4. **Errors**: Connection and request failures

## Security

Upstash provides enterprise-grade security:

- **TLS Encryption**: All connections encrypted in transit
- **REST API**: Secure HTTPS endpoints
- **Token-based Auth**: Secure access tokens
- **VPC Peering**: Available for enterprise plans

## Troubleshooting

### Common Issues

1. **Connection Timeout**:
   - Verify URL and token are correct
   - Check network connectivity
   - Ensure region is optimal

2. **Rate Limiting**:
   - Monitor daily command usage
   - Optimize Redis operations
   - Consider upgrading plan

3. **High Latency**:
   - Choose region closest to your API server
   - Enable global replication
   - Optimize Redis commands

### Debug Commands

```bash
# Test connection
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-redis-url.upstash.io/ping

# Get database info
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-redis-url.upstash.io/info

# Check specific key (replace KEY_NAME)
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-redis-url.upstash.io/get/KEY_NAME
```

## Migration from Traditional Redis

If migrating from a traditional Redis setup:

1. **Backup Data**: Export your current Redis data
2. **Update Code**: Change connection configuration to use Upstash REST API
3. **Test**: Verify all Redis operations work correctly
4. **Deploy**: Update production environment variables
5. **Monitor**: Watch for any performance or functionality issues

The Happy Bar codebase is already configured for Upstash Redis, so no code changes are needed - just update the environment variables!