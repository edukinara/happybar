import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface LoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'card' | 'inline'
}

export function Loading({ 
  message = 'Loading...', 
  size = 'md',
  variant = 'default'
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }

  const LoadingContent = () => (
    <div className="flex items-center justify-center space-x-2">
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {message && <span className="text-muted-foreground">{message}</span>}
    </div>
  )

  if (variant === 'inline') {
    return <LoadingContent />
  }

  if (variant === 'card') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingContent />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <LoadingContent />
    </div>
  )
}

export function TableLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse flex-1"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div>
        </div>
      ))}
    </div>
  )
}

export function CardLoading() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
          <div className="flex space-x-2">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}