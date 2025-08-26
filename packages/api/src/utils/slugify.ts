/**
 * Generate a URL-safe slug from a string
 * @param text The text to convert to a slug
 * @returns A URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')          // Replace multiple - with single -
    .replace(/^-+/, '')              // Trim - from start of text
    .replace(/-+$/, '')              // Trim - from end of text
}

/**
 * Generate a unique domain from company name
 * Adds a random suffix if the base domain already exists
 * @param companyName The company name to generate a domain from
 * @param checkExisting Function to check if a domain already exists
 * @returns A unique domain string
 */
export async function generateUniqueDomain(
  companyName: string,
  checkExisting: (domain: string) => Promise<boolean>
): Promise<string> {
  const baseDomain = slugify(companyName)
  
  // First try the base domain
  const exists = await checkExisting(baseDomain)
  if (!exists) {
    return baseDomain
  }
  
  // If it exists, add a random suffix
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const domain = `${baseDomain}-${suffix}`
    
    const domainExists = await checkExisting(domain)
    if (!domainExists) {
      return domain
    }
    
    attempts++
  }
  
  // If we still can't find a unique domain, use timestamp
  return `${baseDomain}-${Date.now()}`
}