# Inventory Count System - Implementation Plan

## Overview
Based on market research, we'll implement a professional inventory counting system that combines the best features from BevSpot, BackBar, and WISK while maintaining a user-friendly interface.

## Core Features (Phase 1 - MVP)

### 1. Count Session Management
- **Create Count Session**: Name, location, type (full/spot/cycle)
- **Save & Resume**: Auto-save every 10 seconds, resume incomplete counts
- **Count Status**: Draft → In Progress → Completed → Approved
- **Session History**: View past counts with timestamps and users

### 2. Storage Area Organization
- **Predefined Areas**: Bar, Storage, Walk-in, Beer Cooler, Wine Cellar
- **Custom Areas**: Add unlimited custom storage locations
- **Area Templates**: Save common layouts for reuse
- **Progress Tracking**: Visual indicators per area

### 3. Product Counting Interface

#### Mobile-Optimized Design
```
┌─────────────────────────────┐
│  ◄ Behind Bar   (12/45)     │
│  ========================   │
│  75% Complete    $2,450      │
├─────────────────────────────┤
│  🔍 Search or Scan...       │
├─────────────────────────────┤
│  Jameson Irish Whiskey      │
│  750ml bottle               │
│                             │
│  Full Bottles: [  3  ] ▲▼   │
│                             │
│  Partial Bottle:            │
│  ┌─────────────────────┐    │
│  │ ◄══════════►       │    │
│  └─────────────────────┘    │
│  0.6 (about 2/3 full)       │
│                             │
│  Total: 3.6 bottles         │
│  Expected: 4.0 (−0.4 var)   │
│                             │
│  [ Skip ] [ Save & Next ]   │
└─────────────────────────────┘
```

#### Key Features:
- **Visual Bottle Slider**: Tenthing method (0.1 increments)
- **Smart Suggestions**: Show expected quantity based on par levels
- **Variance Alerts**: Highlight significant differences
- **Quick Entry**: Auto-advance after input
- **Recent Items**: Quick access to frequently counted items

### 4. Count Methods

#### Tenthing Method (Default)
- Visual slider for partial bottles
- 0.1 increment precision
- Visual guides (1/4, 1/2, 3/4 marks)
- Tooltip showing common fractions

#### Full + Partial Entry
- Separate inputs for full and partial bottles
- Automatic total calculation
- Support for different container sizes

#### Quick Count Mode
- Rapid entry for full bottles only
- Swipe/tap to increment
- Batch operations

### 5. Review & Finalization
- **Count Summary**: Overview by area and category
- **Variance Report**: Items with significant differences
- **Quick Edit**: In-line editing without navigation
- **Approval Workflow**: Manager review and sign-off
- **Export Options**: PDF, CSV, Excel formats

## Technical Architecture

### Database Schema

```prisma
model InventoryCount {
  id              String          @id @default(cuid())
  organizationId  String
  locationId      String
  name            String
  type            CountType       // FULL, SPOT, CYCLE
  status          CountStatus     // DRAFT, IN_PROGRESS, COMPLETED, APPROVED
  startedAt       DateTime        @default(now())
  completedAt     DateTime?
  approvedAt      DateTime?
  approvedById    String?
  totalValue      Float           @default(0)
  itemsCounted    Int             @default(0)
  notes           String?
  
  organization    Organization    @relation(fields: [organizationId], references: [id])
  location        Location        @relation(fields: [locationId], references: [id])
  approvedBy      User?           @relation(fields: [approvedById], references: [id])
  areas           CountArea[]
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@index([organizationId, locationId])
  @@index([status])
}

model CountArea {
  id              String          @id @default(cuid())
  countId         String
  name            String
  order           Int
  status          AreaStatus      // PENDING, COUNTING, COMPLETED
  
  count           InventoryCount  @relation(fields: [countId], references: [id], onDelete: Cascade)
  items           CountItem[]
  
  @@unique([countId, name])
  @@index([countId])
}

model CountItem {
  id              String          @id @default(cuid())
  areaId          String
  productId       String
  fullUnits       Int             @default(0)
  partialUnit     Float           @default(0)  // 0.0 to 0.9
  totalQuantity   Float           // fullUnits + partialUnit
  expectedQty     Float?
  variance        Float?
  notes           String?
  countedById     String
  countedAt       DateTime        @default(now())
  
  area            CountArea       @relation(fields: [areaId], references: [id], onDelete: Cascade)
  product         Product         @relation(fields: [productId], references: [id])
  countedBy       User            @relation(fields: [countedById], references: [id])
  
  @@unique([areaId, productId])
  @@index([productId])
}

enum CountType {
  FULL
  SPOT
  CYCLE
}

enum CountStatus {
  DRAFT
  IN_PROGRESS
  COMPLETED
  APPROVED
}

enum AreaStatus {
  PENDING
  COUNTING
  COMPLETED
}
```

### API Endpoints

```typescript
// Count Sessions
POST   /api/inventory/counts                 // Create new count
GET    /api/inventory/counts                 // List counts
GET    /api/inventory/counts/:id             // Get count details
PUT    /api/inventory/counts/:id             // Update count
DELETE /api/inventory/counts/:id             // Delete draft count
POST   /api/inventory/counts/:id/approve     // Approve count
POST   /api/inventory/counts/:id/resume      // Resume counting

// Count Areas
GET    /api/inventory/counts/:id/areas       // List areas
POST   /api/inventory/counts/:id/areas       // Add area
PUT    /api/inventory/counts/:id/areas/:areaId // Update area

// Count Items
POST   /api/inventory/counts/:id/items       // Add/update item
GET    /api/inventory/counts/:id/items       // List items
DELETE /api/inventory/counts/:id/items/:itemId // Remove item

// Templates & Reports
GET    /api/inventory/templates              // Get area templates
POST   /api/inventory/templates              // Save template
GET    /api/inventory/counts/:id/report      // Generate report
GET    /api/inventory/counts/:id/variance    // Variance analysis
```

### Frontend Components

```typescript
// Main Components
<InventoryCountPage />          // Main inventory page
<CountSessionList />            // List of count sessions
<CountSessionCreate />          // New count wizard
<CountingInterface />           // Active counting UI
<CountReview />                // Review and approve

// Sub-Components  
<StorageAreaSelector />        // Area navigation
<ProductSearch />              // Search with barcode scan
<BottleSlider />              // Tenthing slider
<QuantityInput />             // Full + partial input
<VarianceIndicator />         // Visual variance display
<ProgressBar />               // Count progress
<QuickCountMode />           // Rapid counting interface

// Shared Components
<CountStatusBadge />         // Status indicators
<CountSummaryCard />        // Summary statistics
<VarianceReport />          // Detailed variance view
```

## UI/UX Guidelines

### Mobile-First Principles
1. **Large Touch Targets**: Minimum 44x44px
2. **Thumb-Friendly**: Primary actions in thumb reach
3. **Minimal Scrolling**: Key info above fold
4. **Gesture Support**: Swipe between areas
5. **Offline First**: Cache everything locally

### Visual Design
1. **Progress Indicators**: Clear visual feedback
2. **Color Coding**: Green (good), Yellow (warning), Red (alert)
3. **Container Icons**: Visual product identification
4. **Animations**: Smooth transitions, no jarring movements
5. **Dark Mode**: Support for low-light environments

### Speed Optimizations
1. **Predictive Loading**: Pre-load next likely products
2. **Instant Search**: < 100ms response time
3. **Auto-Save**: Every 10 seconds or on blur
4. **Keyboard Shortcuts**: Tab navigation, Enter to advance
5. **Batch Operations**: Multi-select for similar items

## Implementation Timeline

### Week 1-2: Data Model & API
- [ ] Create database schema
- [ ] Implement core API endpoints
- [ ] Add validation and error handling
- [ ] Create test data and seeders

### Week 3-4: Core UI Components
- [ ] Build counting interface
- [ ] Implement bottle slider
- [ ] Add product search
- [ ] Create area selector
- [ ] Build progress tracking

### Week 5-6: Count Management
- [ ] Session creation flow
- [ ] Save/resume functionality
- [ ] Review interface
- [ ] Approval workflow
- [ ] Basic reporting

### Week 7-8: Polish & Optimization
- [ ] Mobile optimizations
- [ ] Offline support
- [ ] Performance tuning
- [ ] User testing
- [ ] Bug fixes

## Success Metrics

### Performance Targets
- Count completion time: < 90 minutes (full inventory)
- Page load time: < 2 seconds
- Search response: < 100ms
- Auto-save: Every 10 seconds
- Offline sync: < 5 seconds when reconnected

### User Experience Goals
- Training time: < 30 minutes
- Error rate: < 5%
- Task completion: > 95%
- User satisfaction: > 4.5/5 stars

## Future Enhancements (Phase 2)

### Advanced Features
1. **Barcode Scanning**: Native mobile camera integration
2. **Bluetooth Scales**: Weight-based counting
3. **Voice Input**: "Three and a half bottles of Jameson"
4. **Photo Documentation**: Shelf photos for verification
5. **POS Integration**: Auto-calculate expected quantities
6. **AI Predictions**: ML-based count suggestions
7. **Multi-User Sync**: Real-time collaborative counting
8. **Supplier Integration**: Direct ordering from variances

### Analytics & Reporting
1. **Trend Analysis**: Historical variance patterns
2. **Shrinkage Reports**: Loss identification
3. **Par Level Optimization**: AI-suggested levels
4. **Cost Analysis**: Real-time COGS tracking
5. **Audit Trail**: Complete count history
6. **Custom Reports**: Configurable report builder

## Conclusion

This implementation plan provides a clear roadmap for building a professional inventory counting system that matches industry leaders while maintaining excellent user experience. The phased approach ensures we deliver value quickly while building toward a comprehensive solution.