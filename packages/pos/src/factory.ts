import {
  type POSCredentials,
  POSType,
  type SyncResult,
  type ToastCredentials,
} from '@happy-bar/types'
import { ToastAPIClient } from './toast/client'

export interface POSClient {
  testConnection(): Promise<{ success: boolean; error?: string }>
  syncData(
    locationIds: string[],
    options?: Record<string, unknown>
  ): Promise<SyncResult>
  getMenuGroups?(locationId: string): Promise<unknown[]>
}

/**
 * Factory function to create POS clients based on credentials
 */
export function createPOSClient(
  credentials: POSCredentials,
  onCredentialsUpdate?: (credentials: unknown) => Promise<void>
): POSClient {
  switch (credentials.type) {
    case POSType.TOAST:
      return new ToastAPIClient(
        credentials as ToastCredentials,
        onCredentialsUpdate
      )

    case POSType.SQUARE:
      throw new Error('Square integration not yet implemented')

    case POSType.CLOVER:
      throw new Error('Clover integration not yet implemented')

    case POSType.SHOPIFY:
      throw new Error('Shopify integration not yet implemented')

    case POSType.LIGHTSPEED:
      throw new Error('Lightspeed integration not yet implemented')

    default:
      throw new Error(`Unsupported POS type: ${credentials.type}`)
  }
}
