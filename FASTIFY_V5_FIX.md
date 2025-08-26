# Fastify v5 Logger Fix

## Issue
When upgrading to Fastify v5, you may encounter these errors:
```
Invalid logger object provided. The logger instance should have these functions(s): 'fatal,trace'
```
or
```
FastifyError [Error]: logger options only accepts a configuration object
```
or
```
FastifyWarning: The router options for ignoreTrailingSlash property access is deprecated. Please use "options.routerOptions" instead
```

## Root Cause
Fastify v5 has several breaking changes:
1. **Logger configuration only**: Fastify v5 only accepts logger configuration objects, not logger instances
2. **Built-in Pino integration**: Fastify creates its own Pino logger internally
3. **Stricter validation**: Logger objects must have specific methods (`fatal`, `trace`, etc.)
4. **Router options restructure**: Router-specific options moved to `routerOptions` object

## Solution Applied

### 1. **Updated Fastify Logger Configuration**
Changed from passing logger instance to logger configuration object.

```typescript
// packages/api/src/index.ts - Fastify initialization
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname'
      }
    } : undefined
  },
  trustProxy: true,
  routerOptions: {
    ignoreTrailingSlash: true,
    caseSensitive: false
  }
})
```

### 2. **Added Required Dependencies**
```json
{
  "pino": "^9.5.0",
  "pino-pretty": "^13.0.0"
}
```

### 3. **Used Fastify's Built-in Logger**
Updated all logging calls to use Fastify's request logger:

```typescript
// Old way (custom logger)
logger.error('Something went wrong', { error })

// New way (Fastify's request logger)
request.log.error({ error }, 'Something went wrong')
```

### 4. **Fixed Authentication Middleware**
Updated Fastify v5 authentication pattern:

```typescript
// Proper decorator declaration
fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})
```

### 5. **Updated Route Registration**
Simplified route registration for better compatibility:

```typescript
// Register global middleware first
await fastify.register(tenantMiddleware)

// Register all routes
await fastify.register(authRoutes, { prefix: '/api/auth' })
// ... other routes
```

## Benefits

### **Performance Improvements**
- **Pino is ~10x faster** than Winston
- **Lower memory footprint**
- **Better JSON serialization**

### **Fastify Integration**
- **Native compatibility** with Fastify v5
- **Automatic request/response logging**
- **Better error handling**

### **Development Experience**
- **Pretty printed logs** in development
- **Structured JSON logs** in production
- **Consistent log levels** across the app

## Migration Steps

1. ✅ **Updated logger configuration** to use config object instead of instance
2. ✅ **Added required packages** (pino, pino-pretty)
3. ✅ **Fixed router options** using `routerOptions` instead of deprecated options
4. ✅ **Updated all logging** to use Fastify's request logger
5. ✅ **Fixed authentication middleware** 
6. ✅ **Updated route registration**
7. ✅ **Created logs directory**
8. ✅ **Maintained backward compatibility**

## Result

The API now starts without the logger error and provides:
- ✅ **Fastify v5 compatibility**
- ✅ **Better logging performance**
- ✅ **Prettier development logs**
- ✅ **Production-ready structured logs**

---

**Fix applied**: December 2024  
**Fastify version**: v5.2.0  
**Logger**: Pino v9.5.0