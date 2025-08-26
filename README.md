# Happy Bar - Inventory Management SaaS

A comprehensive, POS-integrated inventory management SaaS for bars and restaurants with modern UI/UX, multi-tenant architecture, and deep analytics capabilities.

> **⚡ Latest Update (Dec 2024)**: Complete modernization! Now using Next.js 15, React 19, Fastify 5, TypeScript 5.7, **Tailwind CSS v4 Beta**, and pnpm 10. **~10x faster builds** with zero-config CSS architecture! See [CHANGELOG.md](./CHANGELOG.md) for details.

## 🚀 Features

### ✅ Completed Core Features
- **Multi-tenant Architecture**: Secure tenant isolation with row-level security
- **Modern Tech Stack**: Next.js 15, React 19, Fastify 5, PostgreSQL, Redis, TypeScript 5.7
- **Authentication**: JWT-based auth with role-based access control
- **Dashboard**: Real-time inventory overview with key metrics
- **Database Schema**: Complete multi-tenant schema for inventory lifecycle
- **API Foundation**: RESTful APIs with OpenAPI 3.0 documentation
- **UI Framework**: Latest shadcn/ui components with **Tailwind CSS v4 Beta** (10x faster builds)
- **Monorepo Structure**: Optimized pnpm workspace with Turbo 2.0

### 🏗️ Core Inventory Management
- Products, categories, locations, and supplier management
- Inventory counting with variance tracking
- Purchase order management
- Multi-location inventory tracking
- Real-time stock level monitoring

### 📊 Analytics Foundation
- Variance analysis framework
- Menu engineering calculations
- Dashboard with key performance indicators
- Cost trend tracking capabilities

### 🔌 POS Integration Ready
- Abstract POS provider interface
- Webhook handling infrastructure
- Support planned for Toast, Square, Clover, Shopify POS

## 🏗️ Architecture

### Database Design
- **Multi-tenant**: Shared database with tenant isolation
- **Comprehensive Schema**: 15+ tables covering full inventory lifecycle
- **Relationships**: Proper foreign keys and constraints
- **Scalable**: Designed for high-volume operations

### Backend (Fastify v5)
- **Performance-focused**: Fastify 5.x for maximum throughput
- **Type-safe**: Full TypeScript 5.7 implementation
- **Error Handling**: Centralized error handling with proper HTTP codes
- **Middleware**: Authentication, tenant isolation, logging
- **Documentation**: Auto-generated OpenAPI 3.0 docs

### Frontend (Next.js 15)
- **App Router**: Next.js 15 with React 19 server components
- **UI System**: Latest shadcn/ui + **Tailwind CSS v4 Beta** with zero-config architecture
- **State Management**: TanStack Query v5 + Zustand v5
- **Authentication**: Context-based auth with automatic token handling
- **Mobile-first**: Responsive design optimized for mobile counting
- **Performance**: 10x faster CSS builds with modern CSS features

## 📁 Project Structure

```
happy-bar/
├── apps/
│   ├── web/           # Main Next.js web application
│   ├── mobile/        # Mobile PWA (planned)
│   └── admin/         # Admin dashboard (planned)
├── packages/
│   ├── api/           # Fastify backend API
│   ├── database/      # Prisma schema & client
│   ├── ui/            # Shared UI components
│   ├── types/         # Shared TypeScript types
│   └── pos/           # POS integration modules (planned)
├── tools/
│   ├── scripts/       # Deployment & utility scripts
│   └── docker/        # Docker configurations
└── docs/              # Documentation
```

## 🚀 Getting Started

### Prerequisites
- **Node.js 20+** - [Download](https://nodejs.org/)
- **pnpm 10+** - `npm install -g pnpm@latest`
- **PostgreSQL 15+** - [Download](https://www.postgresql.org/download/)
- **Redis 6+** - [Download](https://redis.io/download/)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd happy-bar
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment files
   cp packages/api/.env.example packages/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

4. **Configure database**
   ```bash
   # Set your PostgreSQL connection string in packages/api/.env
   DATABASE_URL="postgresql://user:password@localhost:5432/happy_bar"
   
   # Generate Prisma client and run migrations
   pnpm db:generate
   pnpm db:migrate
   ```

5. **Start development servers**
   ```bash
   # Start all services in development mode
   pnpm dev
   ```

   This will start:
   - **API**: http://localhost:3001
   - **Web App**: http://localhost:3000
   - **API Docs**: http://localhost:3001/docs

### Environment Variables

#### API (.env in packages/api/)
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/happy_bar"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key"
NODE_ENV="development"
PORT=3001
```

#### Web App (.env.local in apps/web/)
```bash
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## 🎯 Roadmap

### Phase 1: Core Completion (Current)
- [x] Architecture & Database Design
- [x] Authentication System
- [x] Core Inventory APIs
- [x] Dashboard UI
- [ ] Mobile Counting Interface
- [ ] Order Management
- [ ] Basic Analytics

### Phase 2: POS Integration
- [ ] Abstract POS Framework
- [ ] Toast POS Integration
- [ ] Square POS Integration
- [ ] Real-time Sync

### Phase 3: Advanced Analytics
- [ ] Variance Root-cause Analysis
- [ ] Menu Engineering
- [ ] Weather/Event-aware Forecasting
- [ ] Draft Yield Optimization

### Phase 4: Enterprise Features
- [ ] Multi-location Support
- [ ] Advanced Reporting
- [ ] API Rate Limiting
- [ ] Audit Logging
- [ ] Advanced User Management

## 🛠️ Available Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages
- `pnpm test` - Run tests
- `pnpm lint` - Lint all code
- `pnpm typecheck` - TypeScript type checking
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Prisma Studio

## 📱 Mobile Support

The application is built with mobile-first principles:
- **PWA-ready**: Service worker and manifest support
- **Touch-optimized**: Mobile counting interface
- **Offline-capable**: Local storage for counting sessions
- **Fast input**: Optimized for rapid inventory counting

## 🔒 Security

- **Multi-tenant Isolation**: Row-level security
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Zod schema validation
- **Rate Limiting**: API protection (planned)
- **HTTPS Only**: Production security headers

## 📊 Database Schema Highlights

- **Tenants**: Multi-tenant organization data
- **Users**: Staff with role-based permissions
- **Products**: Items with variants, suppliers, costs
- **Inventory**: Current stock levels by location
- **Counts**: Physical inventory counts with variance
- **Orders**: Purchase orders and receiving
- **Analytics**: Pre-computed metrics for performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🎉 Next Steps

1. **Install dependencies**: `pnpm install`
2. **Set up database**: Configure PostgreSQL and run migrations
3. **Start development**: `pnpm dev`
4. **Create your first tenant**: Visit http://localhost:3000/register
5. **Explore the dashboard**: Start building your inventory

---

**Happy Bar** - Making inventory management delightful for bars and restaurants everywhere! 🍻