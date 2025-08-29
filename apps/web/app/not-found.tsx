'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ArrowLeft, Home } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  const handleGoBack = () => {
    router.back()
  }

  return (
    <div className='min-h-screen flex items-center justify-center p-4 bg-background'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-6xl font-bold text-muted-foreground'>
            404
          </CardTitle>
          <CardDescription className='text-xl'>Page not found</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4 text-center'>
          <p className='text-muted-foreground'>
            Sorry, we couldn&apos;t find the page you&apos;re looking for.
          </p>
          <div className='flex flex-col sm:flex-row gap-2 justify-center'>
            <Button variant='outline' onClick={handleGoBack}>
              <ArrowLeft className='mr-2 size-4' />
              Go Back
            </Button>
            <Button asChild>
              <Link href='/dashboard'>
                <Home className='mr-2 size-4' />
                Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
