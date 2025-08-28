import { cn } from '@/lib/utils'

export const NewLogo = ({ className }: { className?: string }) => (
  <div className={cn(`text-current`, className)}>
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
  </div>
)
