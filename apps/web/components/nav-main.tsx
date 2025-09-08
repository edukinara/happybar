'use client'

import { ChevronRight, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

import { InventoryNotificationDot } from '@/components/alerts/InventoryNotificationDot'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    badge?: React.ReactNode
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { state } = useSidebar()
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className='group/collapsible'
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    asChild
                    isActive={item.isActive}
                    className={cn(
                      'data-[active=true]:bg-primary data-[active=true]:text-primary-foreground text-sm font-normal',
                      'text-foreground/80 hover:text-foreground',
                      item.isActive ? 'btn-brand-primary' : ''
                    )}
                  >
                    {item.items ? (
                      <div className={'flex items-center w-full'}>
                        <div className='relative'>
                          {item.icon && <item.icon size={16} />}
                          {state === 'collapsed' &&
                            item.title === 'Inventory' && (
                              <InventoryNotificationDot />
                            )}
                        </div>
                        <span>{item.title}</span>
                        {item.badge}
                        <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                      </div>
                    ) : (
                      <Link
                        href={item.url}
                        className='flex items-center w-full'
                      >
                        <div className='relative'>
                          {item.icon && <item.icon size={16} />}
                          {state === 'collapsed' &&
                            item.title === 'Inventory' && (
                              <InventoryNotificationDot />
                            )}
                        </div>
                        <span>{item.title}</span>
                        {item.badge && (
                          <div className='ml-auto'>{item.badge}</div>
                        )}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {item.items?.length ? (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
