# Happy Bar Deployment Guide

This guide covers deploying Happy Bar using the **Vercel + Railway** strategy for optimal performance and simplicity.

## Architecture Overview

- **Web App & Admin Panel**: Vercel (Edge deployment, global CDN)
- **API Server**: Railway (Containerized backend with auto-scaling)
- **Database**: Railway PostgreSQL (Managed database)
- **Redis**: Upstash Redis (Serverless Redis with global edge)
- **Mobile App**: Expo Application Services (EAS)

## Prerequisites

1. **Accounts Required**:
   - Vercel account
   - Railway account
   - Upstash account (Redis)
   - Expo account (for mobile app)
   - Domain registrar access

2. **Required Services**:
   - Autumn account (subscription management)
   - Google OAuth credentials (optional)
   - Toast POS partner token (optional)

## Step 1: Database Setup (Railway)

1. **Create Railway Project**:

   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login to Railway
   railway login

   # Create new project
   railway new
   ```

2. **Add PostgreSQL**:
   - Go to Railway dashboard
   - Add PostgreSQL service
   - Note the `DATABASE_URL` connection string

## Step 2: Redis Setup (Upstash)

1. **Create Upstash Account**:
   - Go to [console.upstash.com](https://console.upstash.com)
   - Sign up/login with GitHub

2. **Create Redis Database**:
   - Click "Create Database"
   - Choose region closest to your Railway deployment
   - Select "Global" for multi-region replication (recommended)
   - Note the connection details:
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`

3. **Database Migration**:

   ```bash
   # Set production DATABASE_URL
   export DATABASE_URL="your-railway-postgres-url"

   # Run migrations
   pnpm db:migrate

   # Seed initial data (optional)
   pnpm db:seed
   ```

## Step 3: API Deployment (Railway)

1. **Deploy API Server**:

   ```bash
   # Connect to Railway project
   railway link

   # Set environment variables
   railway variables --set NODE_ENV=production
   railway variables --set PORT=3001
   railway variables --set JWT_SECRET="your-jwt-secret"
   railway variables --set BETTER_AUTH_SECRET="your-better-auth-secret"
   railway variables --set UPSTASH_REDIS_REST_URL="your-upstash-rest-url"
   railway variables --set UPSTASH_REDIS_REST_TOKEN="your-upstash-rest-token"
   # ... add all other environment variables

   # Deploy
   railway up
   ```

2. **Set Environment Variables**:
   Copy from `packages/api/.env.production` and set in Railway dashboard.

3. **Custom Domain** (Optional):
   - Add custom domain: `api.happybar.app`
   - Update DNS records as instructed

## Step 4: Web App Deployment (Vercel)

1. **Connect Repository**:
   - Go to Vercel dashboard
   - Import Git repository
   - Select "apps/web" as root directory

2. **Environment Variables**:
   Copy from `apps/web/.env.production` and add in Vercel dashboard.

3. **Build Configuration**:

   ```json
   {
     "buildCommand": "cd ../.. && pnpm install && pnpm run build --filter=web",
     "outputDirectory": ".next",
     "installCommand": "pnpm install"
   }
   ```

4. **Domain Setup**:
   - Add custom domain: `happybar.app`
   - Configure DNS records

## Step 5: Admin Panel Deployment (Vercel)

1. **Create Separate Vercel Project**:
   - Import same repository
   - Select "apps/admin" as root directory

2. **Environment Variables**:

   ```
   NEXT_PUBLIC_API_URL=https://api.happybar.app
   NEXTAUTH_URL=https://admin.happybar.app
   # ... other admin-specific variables
   ```

3. **Domain Setup**:
   - Add custom domain: `admin.happybar.app`

## Step 6: Mobile App Deployment (EAS)

1. **Configure EAS**:

   ```bash
   cd apps/mobile

   # Install EAS CLI
   npm install -g eas-cli

   # Login to Expo
   eas login

   # Configure project
   eas build:configure
   ```

2. **Update API URL**:

   ```typescript
   // apps/mobile/src/lib/api.ts
   const API_URL = 'https://api.happybar.app'
   ```

3. **Build and Submit**:

   ```bash
   # Build for iOS and Android
   eas build --platform all

   # Submit to app stores (when ready)
   eas submit --platform ios
   eas submit --platform android
   ```

## Step 7: Domain & SSL Configuration

1. **DNS Records**:

   ```
   A     happybar.app          → Vercel IP
   CNAME admin.happybar.app    → cname.vercel-dns.com
   CNAME api.happybar.app      → railway.app
   ```

2. **SSL Certificates**:
   - Automatically handled by Vercel and Railway
   - Verify HTTPS is working for all domains

## Step 8: Environment Variables Checklist

### Web App (Vercel)

- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `BETTER_AUTH_SECRET`
- [ ] `NEXT_PUBLIC_AUTUMN_PUBLIC_KEY`
- [ ] `AUTUMN_SECRET_KEY`
- [ ] `GOOGLE_CLIENT_ID` (if using Google OAuth)
- [ ] `GOOGLE_CLIENT_SECRET`

### API Server (Railway)

- [ ] `DATABASE_URL`
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] `JWT_SECRET`
- [ ] `BETTER_AUTH_SECRET`
- [ ] `AUTUMN_SECRET_KEY`
- [ ] `TOAST_PARTNER_TOKEN` (if using Toast POS)
- [ ] `ALLOWED_ORIGINS`

### Admin Panel (Vercel)

- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `BETTER_AUTH_SECRET`
- [ ] Admin-specific environment variables

## Step 9: Post-Deployment Verification

1. **Health Checks**:

   ```bash
   # Test API health
   curl https://api.happybar.app/health

   # Test web app
   curl https://happybar.app

   # Test admin panel
   curl https://admin.happybar.app
   ```

2. **Database & Redis Connection**:
   - Verify API can connect to database
   - Test Redis connection and session storage
   - Test authentication flow
   - Verify subscription integration

3. **Mobile App Testing**:
   - Test login/signup
   - Verify API connectivity
   - Test core features

## Step 10: Monitoring & Analytics

1. **Error Tracking** (Optional):
   - Set up Sentry for error monitoring
   - Add Sentry DSN to environment variables

2. **Performance Monitoring**:
   - Vercel Analytics (automatic)
   - Railway metrics dashboard
   - Mobile app crash reporting via Expo

3. **Uptime Monitoring**:
   - Set up monitoring for all services
   - Configure alerts for downtime

## Scaling Considerations

1. **Auto-Scaling**:
   - Railway: Automatically scales based on usage
   - Vercel: Edge functions scale automatically

2. **Database Performance**:
   - Monitor connection pool usage
   - Consider read replicas for high traffic
   - Implement database connection pooling

3. **Caching Strategy**:
   - Upstash Redis for session storage and caching (global edge locations)
   - Vercel Edge caching for static assets
   - API response caching where appropriate

## Security Checklist

- [ ] All secrets are properly configured
- [ ] CORS is correctly set up
- [ ] HTTPS is enabled on all domains
- [ ] Database connections use SSL
- [ ] JWT secrets are strong and unique
- [ ] Rate limiting is configured
- [ ] Input validation is in place

## Backup Strategy

1. **Database Backups**:
   - Railway provides automatic backups
   - Set up additional backup strategy if needed

2. **Redis Backups**:
   - Upstash provides automatic daily backups
   - Redis data is primarily session/cache data (ephemeral)

3. **Environment Variables**:
   - Keep secure backup of all environment variables
   - Use proper secret management practices

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Verify `ALLOWED_ORIGINS` includes all frontend domains
   - Check API server CORS configuration

2. **Database Connection Issues**:
   - Verify `DATABASE_URL` is correct
   - Check connection limits
   - Verify SSL settings

3. **Authentication Issues**:
   - Verify `BETTER_AUTH_SECRET` matches across services
   - Check JWT secret configuration
   - Verify Upstash Redis connection is working
   - Test session storage functionality

4. **Mobile App API Issues**:
   - Verify API URL is correct and accessible
   - Check mobile app permissions
   - Test network connectivity

### Getting Help

- Railway support: https://railway.app/help
- Vercel support: https://vercel.com/support
- Upstash support: https://upstash.com/docs
- Expo support: https://expo.dev/support

## Cost Estimation (Monthly)

- **Railway**: $5-15 (API server + Database only)
- **Upstash Redis**: $0-10 (Free tier: 10K commands/day, paid tiers available)
- **Vercel**: $0-20 (Free tier available, Pro for custom domains)
- **Expo**: $0-99 (Free for development, paid for distribution)
- **Domain**: $10-15/year

**Total**: ~$10-50/month depending on usage and features

### Cost Benefits of Upstash:

- **Free Tier**: 10,000 commands/day (great for starting out)
- **Pay-per-request**: Only pay for what you use
- **Global Edge**: Better performance without extra cost
- **Serverless**: No idle costs when not in use

This deployment strategy provides excellent scalability, performance, and developer experience while keeping costs reasonable for a growing SaaS application.
