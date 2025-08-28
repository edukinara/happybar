import { cn } from '@/lib/utils'

interface HappBarLoaderProps {
  variant?: 'fill' | 'wave'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  text?: string
  className?: string
}

export const HappBarLoader = ({
  variant = 'wave',
  size = 'md',
  showText = true,
  text = 'Loading...',
  className,
}: HappBarLoaderProps) => {
  // Size mappings
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
  }

  // Custom styles for animations that can't be done with Tailwind classes alone
  const customStyles = `
    @keyframes fillUp {
      0%, 100% {
        transform: scaleY(0.2);
        opacity: 0.3;
      }
      50% {
        transform: scaleY(1);
        opacity: 0.7;
      }
    }
    
    @keyframes bubble1 {
      0%, 100% {
        transform: translate(0, 0);
        opacity: 0.3;
      }
      25% {
        transform: translate(-2px, -3px);
        opacity: 0.6;
      }
      50% {
        transform: translate(-2px, -5px) scale(1.2);
        opacity: 0.4;
      }
      75% {
        transform: translate(2px, -2px);
        opacity: 0.5;
      }
    }
    
    @keyframes bubble2 {
      0%, 100% {
        transform: translate(0, 0) scale(1);
        opacity: 0.4;
      }
      33% {
        transform: translate(3px, -3px) scale(1.1);
        opacity: 0.5;
      }
      66% {
        transform: translate(-4px, -4px) scale(1.3);
        opacity: 0.3;
      }
    }
    
    @keyframes bubble3 {
      0%, 100% {
        transform: translate(0, 0);
        opacity: 0.3;
      }
      20% {
        transform: translate(1px, 2px);
        opacity: 0.4;
      }
      40% {
        transform: translate(-1px, -2px) scale(1.15);
        opacity: 0.35;
      }
      60% {
        transform: translate(0px, -3px);
        opacity: 0.45;
      }
      80% {
        transform: translate(2px, -1px);
        opacity: 0.3;
      }
    }
    
    @keyframes wave {
      0%, 100% {
        d: path("M8 14 Q12 13, 16 14 T24 14 L24 18 Q20 18.5, 16 18 Q12 18.5, 8 18 Z");
      }
      25% {
        d: path("M8 14 Q12 15, 16 14 T24 14 L24 18 Q20 18.5, 16 18 Q12 18.5, 8 18 Z");
      }
      50% {
        d: path("M8 14 Q12 13, 16 14 T24 14 L24 18 Q20 18.5, 16 18 Q12 18.5, 8 18 Z");
      }
      75% {
        d: path("M8 14 Q12 14, 16 13 T24 14 L24 18 Q20 18.5, 16 18 Q12 18.5, 8 18 Z");
      }
    }
    
    @keyframes shimmer {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
    
    @keyframes smile {
      0%, 100% { transform: scaleY(1); }
      50% { transform: scaleY(1.1) translateY(-0.5px); }
    }
    
    .drink-fill {
      animation: fillUp 2.5s ease-in-out infinite;
      transform-origin: bottom;
    }
    
    .bubble-1 { animation: bubble1 3s ease-in-out infinite; }
    .bubble-2 { animation: bubble2 3s ease-in-out infinite 0.5s; }
    .bubble-3 { animation: bubble3 3s ease-in-out infinite 1s; }
    .glass-shimmer { animation: shimmer 3s ease-in-out infinite; }
    .drink-smile { animation: smile 2.5s ease-in-out infinite; }
    .wave-fill { animation: wave 2s ease-in-out infinite; transform-origin: center; }
  `

  const FillVariant = () => (
    <svg
      viewBox='0 0 32 32'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='w-full h-full'
    >
      <defs>
        <clipPath id='glass-clip'>
          <path d='M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z' />
        </clipPath>
        <linearGradient id='drinkGradient' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop
            offset='0%'
            style={{ stopColor: '#FFD700', stopOpacity: 0.6 }}
          />
          <stop
            offset='100%'
            style={{ stopColor: '#FFA500', stopOpacity: 0.8 }}
          />
        </linearGradient>
      </defs>

      <rect
        x='8'
        y='9'
        width='16'
        height='10'
        fill='url(#drinkGradient)'
        clipPath='url(#glass-clip)'
        className='drink-fill'
      />

      <path
        d='M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        className='glass-shimmer'
      ></path>
      <path
        d='M16 19V26'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
      ></path>
      <path
        d='M12 26H20'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
      ></path>
      <path
        d='M12 13C12 13 13.5 15 16 15C18.5 15 20 13 20 13'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        className='drink-smile'
      ></path>

      <circle
        cx='14'
        cy='6'
        r='1'
        fill='currentColor'
        className='bubble-1'
      ></circle>
      <circle
        cx='18'
        cy='5'
        r='1.5'
        fill='currentColor'
        className='bubble-2'
      ></circle>
      <circle
        cx='11'
        cy='4'
        r='1'
        fill='currentColor'
        className='bubble-3'
      ></circle>
    </svg>
  )

  const WaveVariant = () => (
    <svg
      viewBox='0 0 32 32'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='w-full h-full'
    >
      <defs>
        <clipPath id='glass-clip2'>
          <path d='M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z' />
        </clipPath>
        <linearGradient id='waveGradient' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop
            offset='0%'
            style={{ stopColor: 'rgb(245 158 11)', stopOpacity: 0.5 }}
          />
          <stop
            offset='100%'
            style={{ stopColor: 'rgb(147 51 234)', stopOpacity: 0.7 }}
          />
        </linearGradient>
      </defs>

      <g clipPath='url(#glass-clip2)'>
        <rect x='8' y='14' width='16' height='5' fill='url(#waveGradient)' />
        <path
          d='M8 14 Q12 13, 16 14 T24 14 L24 18 Q20 18.5, 16 18 Q12 18.5, 8 18 Z'
          fill='url(#waveGradient)'
          className='wave-fill'
          opacity='0.8'
        />
      </g>

      <path
        d='M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
      ></path>
      <path
        d='M16 19V26'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
      ></path>
      <path
        d='M12 26H20'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
      ></path>
      <path
        d='M12 13C12 13 13.5 15 16 15C18.5 15 20 13 20 13'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        className='drink-smile'
      ></path>

      <circle
        cx='14'
        cy='6'
        r='1'
        fill='currentColor'
        className='bubble-1'
      ></circle>
      <circle
        cx='18'
        cy='5'
        r='1.5'
        fill='currentColor'
        className='bubble-2'
      ></circle>
      <circle
        cx='11'
        cy='4'
        r='1'
        fill='currentColor'
        className='bubble-3'
      ></circle>
    </svg>
  )

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className={cn('flex flex-col items-center gap-0', className)}>
        <div className={`${sizeClasses[size]} text-current`}>
          {variant === 'fill' ? <FillVariant /> : <WaveVariant />}
        </div>
        {showText && (
          <span className='text-sm text-muted-foreground animate-pulse pl-3'>
            {text}
          </span>
        )}
      </div>
    </>
  )
}
