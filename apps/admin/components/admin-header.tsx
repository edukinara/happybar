'use client'

import { LogOut, User } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Logo } from '@/components/brand/logo'

export function AdminHeader() {
  const { user, logout } = useAuth()

  return (
    <header className={`border-b bg-background`}>
      <div className={`container mx-auto px-4 py-4`}>
        <div className={`flex items-center justify-between`}>
          <Link href="/" className={`flex items-center gap-2`}>
            <Logo size="md" />
            <span className={`text-sm font-medium text-muted-foreground`}>Admin</span>
          </Link>

          <nav className={`hidden md:flex gap-6`}>
            <Link href="/" className={`text-sm hover:text-primary transition-colors`}>
              Dashboard
            </Link>
            <Link href="/organizations" className={`text-sm hover:text-primary transition-colors`}>
              Organizations
            </Link>
            <Link href="/users" className={`text-sm hover:text-primary transition-colors`}>
              Users
            </Link>
            <Link href="/support" className={`text-sm hover:text-primary transition-colors`}>
              Support
            </Link>
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`gap-2`}>
                <User className={`h-4 w-4`} />
                <span className={`hidden sm:inline`}>{user?.name || user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                <div className={`flex flex-col`}>
                  <span className={`font-medium`}>{user?.name || 'Admin User'}</span>
                  <span className={`text-xs text-muted-foreground`}>{user?.email}</span>
                  <span className={`text-xs text-muted-foreground capitalize`}>
                    {user?.role?.toLowerCase().replace('_', ' ')}
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className={`gap-2 text-destructive`}>
                <LogOut className={`h-4 w-4`} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}