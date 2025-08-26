# Feature Gating Implementation Guide

This guide shows how to implement proper feature gating for Autumn subscription features throughout the Happy Bar application.

## Available Feature Gates

### 1. ProductsGate
Controls access to product management features based on the subscription's product limits.

```tsx
import { ProductsGate } from '@/components/subscription/feature-gate'

<ProductsGate>
  <Button asChild>
    <Link href="/dashboard/products/new">Add Product</Link>
  </Button>
</ProductsGate>
```

### 2. POSIntegrationsGate  
Controls access to POS integration features.

```tsx
import { POSIntegrationsGate } from '@/components/subscription/feature-gate'

<POSIntegrationsGate>
  <Button onClick={createIntegration}>Add Integration</Button>
</POSIntegrationsGate>
```

### 3. LocationsGate
Controls access to additional location management.

```tsx
import { LocationsGate } from '@/components/subscription/feature-gate'

<LocationsGate>
  <Button onClick={addLocation}>Add Location</Button>
</LocationsGate>
```

### 4. TeamMembersGate
Controls access to team member invitations.

```tsx
import { TeamMembersGate } from '@/components/subscription/feature-gate'

<TeamMembersGate>
  <Button onClick={inviteTeamMember}>Invite Team Member</Button>
</TeamMembersGate>
```

## Usage Tracking

Track feature usage to update Autumn subscription balances:

```tsx
import { ProductUsageTracker, POSIntegrationUsageTracker } from '@/components/subscription/usage-tracker'

function ProductsPage() {
  const [products, setProducts] = useState([])
  
  return (
    <div>
      {/* Your products UI */}
      
      {/* Track current product count */}
      <ProductUsageTracker productCount={products.length} />
    </div>
  )
}
```

## Implementation Examples

### 1. Products Page (`/dashboard/products`)
- ✅ **Implemented**: Add Product button is gated
- ✅ **Implemented**: Usage tracking for product count

### 2. Settings Page (`/dashboard/settings`)  
- ✅ **Implemented**: Add Integration button is gated
- ✅ **Implemented**: Usage tracking for integration count

### 3. Areas That Need Implementation

#### Team Management
```tsx
// In team management page
<TeamMembersGate>
  <Button onClick={inviteUser}>
    <UserPlus className="mr-2 h-4 w-4" />
    Invite Team Member
  </Button>
</TeamMembersGate>

{/* Track team member count */}
<TeamMemberUsageTracker memberCount={teamMembers.length} />
```

#### Location Management
```tsx
// In locations/inventory management
<LocationsGate>
  <Button onClick={createLocation}>
    <MapPin className="mr-2 h-4 w-4" />
    Add Location
  </Button>
</LocationsGate>

{/* Track location count */}
<LocationUsageTracker locationCount={locations.length} />
```

## Programmatic Usage Tracking

For tracking feature usage when actions are performed:

```tsx
import { useFeatureTracker } from '@/components/subscription/usage-tracker'

function CreateProductForm() {
  const { trackProductCreation } = useFeatureTracker()
  
  const handleSubmit = async (data) => {
    // Create the product
    await createProduct(data)
    
    // Track usage in Autumn
    trackProductCreation()
  }
}
```

## Advanced Feature Gating

### Custom Fallback Components
```tsx
<ProductsGate
  fallback={
    <div className="text-center p-4 border-2 border-dashed rounded">
      <h3>Product Limit Reached</h3>
      <p>Upgrade to add more products</p>
      <Button onClick={upgradeToProPlan}>Upgrade Plan</Button>
    </div>
  }
>
  <AddProductForm />
</ProductsGate>
```

### Conditional Rendering
```tsx
const { hasAccess } = useFeatureAccess('products', 1)

return (
  <div>
    {hasAccess ? (
      <FullProductFeatures />
    ) : (
      <UpgradePrompt featureName="Product Management" />
    )}
  </div>
)
```

## Best Practices

1. **Always Gate Creation**: Gate buttons/forms that create new resources
2. **Track Usage**: Add usage trackers to pages that display counts
3. **Graceful Fallbacks**: Provide clear upgrade prompts when limits are reached
4. **Real-time Updates**: Usage tracking updates subscription balances in real-time
5. **Consistent UX**: Use the same gating patterns across all features

## Subscription Features Map

| Feature | Free Plan | Pro Plan | Business Plan |
|---------|-----------|----------|---------------|
| Products | 50 | 300 | Unlimited |
| POS Integrations | 1 | 3 | Unlimited |
| Locations | 1 | 2 | 5 |
| Team Members | 1 | 3 | 10 |

## Testing Feature Gates

1. **Free Plan**: Create a user with free plan, verify limits work
2. **Pro Plan**: Upgrade to Pro, verify increased limits
3. **Usage Tracking**: Check Autumn dashboard for usage updates
4. **Limit Enforcement**: Try to exceed limits, verify blocks work