import { FastifyRequest } from 'fastify'

// ANSI color codes for better visual separation
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Text colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
}

const isDevelopment = process.env.NODE_ENV !== 'production'

export class DevLogger {
  private static formatTimestamp(): string {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  }

  private static formatRequest(request: FastifyRequest): string {
    const method = request.method.padEnd(6)
    const url = request.url
    const ip = request.ip || request.socket.remoteAddress || 'unknown'
    
    return `${colors.cyan}${method}${colors.reset} ${colors.blue}${url}${colors.reset} ${colors.gray}(${ip})${colors.reset}`
  }

  static middleware(message: string, request?: FastifyRequest) {
    if (!isDevelopment) return
    
    const timestamp = this.formatTimestamp()
    const requestInfo = request ? ` ${this.formatRequest(request)}` : ''
    
    console.log(`\n${colors.bgMagenta}${colors.white} MIDDLEWARE ${colors.reset} ${colors.gray}${timestamp}${colors.reset}${requestInfo}`)
    console.log(`${colors.magenta}│${colors.reset} ${message}`)
  }

  static auth(message: string, details?: any) {
    if (!isDevelopment) return
    
    const timestamp = this.formatTimestamp()
    
    console.log(`\n${colors.bgBlue}${colors.white} AUTH ${colors.reset} ${colors.gray}${timestamp}${colors.reset}`)
    console.log(`${colors.blue}│${colors.reset} ${message}`)
    
    if (details) {
      console.log(`${colors.blue}│${colors.reset} ${colors.dim}${JSON.stringify(details, null, 2).split('\n').join(`\n${colors.blue}│${colors.reset} ${colors.dim}`)}${colors.reset}`)
    }
  }

  static success(message: string, details?: any) {
    if (!isDevelopment) return
    
    const timestamp = this.formatTimestamp()
    
    console.log(`\n${colors.bgGreen}${colors.white} SUCCESS ${colors.reset} ${colors.gray}${timestamp}${colors.reset}`)
    console.log(`${colors.green}│${colors.reset} ${message}`)
    
    if (details) {
      console.log(`${colors.green}│${colors.reset} ${colors.dim}${JSON.stringify(details, null, 2).split('\n').join(`\n${colors.green}│${colors.reset} ${colors.dim}`)}${colors.reset}`)
    }
  }

  static error(message: string, error?: any) {
    if (!isDevelopment) return
    
    const timestamp = this.formatTimestamp()
    
    console.log(`\n${colors.bgRed}${colors.white} ERROR ${colors.reset} ${colors.gray}${timestamp}${colors.reset}`)
    console.log(`${colors.red}│${colors.reset} ${message}`)
    
    if (error) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        name: error.name,
        ...(error.statusCode && { statusCode: error.statusCode })
      }
      console.log(`${colors.red}│${colors.reset} ${colors.dim}${JSON.stringify(errorDetails, null, 2).split('\n').join(`\n${colors.red}│${colors.reset} ${colors.dim}`)}${colors.reset}`)
    }
  }

  static warn(message: string, details?: any) {
    if (!isDevelopment) return
    
    const timestamp = this.formatTimestamp()
    
    console.log(`\n${colors.bgYellow}${colors.white} WARNING ${colors.reset} ${colors.gray}${timestamp}${colors.reset}`)
    console.log(`${colors.yellow}│${colors.reset} ${message}`)
    
    if (details) {
      console.log(`${colors.yellow}│${colors.reset} ${colors.dim}${JSON.stringify(details, null, 2).split('\n').join(`\n${colors.yellow}│${colors.reset} ${colors.dim}`)}${colors.reset}`)
    }
  }

  static info(message: string, details?: any) {
    if (!isDevelopment) return
    
    const timestamp = this.formatTimestamp()
    
    console.log(`\n${colors.bgCyan}${colors.white} INFO ${colors.reset} ${colors.gray}${timestamp}${colors.reset}`)
    console.log(`${colors.cyan}│${colors.reset} ${message}`)
    
    if (details) {
      console.log(`${colors.cyan}│${colors.reset} ${colors.dim}${JSON.stringify(details, null, 2).split('\n').join(`\n${colors.cyan}│${colors.reset} ${colors.dim}`)}${colors.reset}`)
    }
  }

  static jwt(message: string, payload?: any) {
    if (!isDevelopment) return
    
    const timestamp = this.formatTimestamp()
    
    console.log(`\n${colors.bgMagenta}${colors.white} JWT ${colors.reset} ${colors.gray}${timestamp}${colors.reset}`)
    console.log(`${colors.magenta}│${colors.reset} ${message}`)
    
    if (payload) {
      // Format JWT payload nicely
      const formattedPayload = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        organizationId: payload.organizationId,
        ...(payload.exp && { expiresAt: new Date(payload.exp * 1000).toISOString() })
      }
      console.log(`${colors.magenta}│${colors.reset} ${colors.dim}${JSON.stringify(formattedPayload, null, 2).split('\n').join(`\n${colors.magenta}│${colors.reset} ${colors.dim}`)}${colors.reset}`)
    }
  }

  static user(message: string, user?: any) {
    if (!isDevelopment) return
    
    const timestamp = this.formatTimestamp()
    
    console.log(`\n${colors.bgGreen}${colors.white} USER ${colors.reset} ${colors.gray}${timestamp}${colors.reset}`)
    console.log(`${colors.green}│${colors.reset} ${message}`)
    
    if (user) {
      const userDetails = {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        organizationId: user.organizationId
      }
      console.log(`${colors.green}│${colors.reset} ${colors.dim}${JSON.stringify(userDetails, null, 2).split('\n').join(`\n${colors.green}│${colors.reset} ${colors.dim}`)}${colors.reset}`)
    }
  }

  static separator() {
    if (!isDevelopment) return
    console.log(`${colors.gray}${'─'.repeat(80)}${colors.reset}`)
  }
}