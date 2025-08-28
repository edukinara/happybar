# Neon Database Setup Guide

## Quick Setup

1. **Create Neon Account**
   - Sign up at [neon.tech](https://neon.tech)
   - Create a new project (choose the region closest to your Railway deployment)

2. **Get Connection String** (Only ONE needed!)
   - Go to your project dashboard
   - Click "Connection Details"
   - Toggle "Pooled connection" **ON**
   - Copy the connection string

3. **Update Environment Variables**

   In Railway (just ONE variable):
   ```bash
   DATABASE_URL="postgresql://user:pass@project-pooler.region.neon.tech/neondb?sslmode=require"
   ```

   Locally (in `packages/database/prisma/.env`):
   ```bash
   DATABASE_URL="your-pooled-connection-string"
   ```

   **Note**: With Prisma 6.x, you only need the pooled URL. Prisma automatically:
   - Uses direct connection for migrations
   - Uses pooled connection for queries

4. **Run Migrations**
   ```bash
   cd packages/database
   pnpm db:migrate
   ```

## Neon Features to Enable

1. **Auto-suspend**: Saves money by pausing compute when inactive
2. **Branching**: Create dev branches from production
3. **Point-in-time Recovery**: Enable for production

## Connection Pooling

Neon's pooler handles up to 10,000 concurrent connections. Your app uses:
- **Pooled connection** (`DATABASE_URL`) for all queries
- **Direct connection** (`DIRECT_URL`) only for migrations

## Performance Tips

1. **Use Pooled Connections**: Always use the pooled URL for your app
2. **Connection Limit**: Neon handles this automatically
3. **Query Optimization**: Use Neon's query insights dashboard
4. **Branching for Dev**: Create branches for development/staging

## Troubleshooting

### "Too many connections" error
- Make sure you're using the pooled connection URL (has `-pooler` in hostname)

### SSL connection errors
- Ensure `?sslmode=require` is at the end of your connection strings

### Migration failures
- Use the DIRECT_URL for migrations, not the pooled URL
- Check if you have the correct permissions

## Monitoring

Neon provides:
- Query insights
- Connection metrics
- Storage usage
- Compute hours

Access these in your Neon dashboard under "Monitoring".