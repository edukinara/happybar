import React from 'react'
import Svg, { 
  Path, 
  Circle, 
  Rect, 
  Defs, 
  ClipPath, 
  LinearGradient, 
  Stop,
  G 
} from 'react-native-svg'

interface HappyBarLogoProps {
  size?: number
  color?: string
}

export const HappyBarLogo: React.FC<HappyBarLogoProps> = ({ 
  size = 32, 
  color = 'currentColor' 
}) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
    >
      <Defs>
        <ClipPath id="glass-clip2">
          <Path d="M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z" />
        </ClipPath>
        <LinearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop
            offset="0%"
            stopColor="rgb(245, 158, 11)"
            stopOpacity="0.5"
          />
          <Stop
            offset="100%"
            stopColor="rgb(147, 51, 234)"
            stopOpacity="0.7"
          />
        </LinearGradient>
      </Defs>

      <G clipPath="url(#glass-clip2)">
        <Rect x="8" y="14" width="16" height="5" fill="url(#waveGradient)" />
        <Path
          d="M8 14 Q12 13, 16 14 T24 14 L24 18 Q20 18.5, 16 18 Q12 18.5, 8 18 Z"
          fill="url(#waveGradient)"
          opacity="0.8"
        />
      </G>

      {/* Glass outline */}
      <Path
        d="M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Glass stem */}
      <Path
        d="M16 19V26"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Glass base */}
      <Path
        d="M12 26H20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Smile on the drink */}
      <Path
        d="M12 13C12 13 13.5 15 16 15C18.5 15 20 13 20 13"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Bubbles */}
      <Circle cx="14" cy="6" r="1" fill={color} />
      <Circle cx="18" cy="5" r="1.5" fill={color} />
      <Circle cx="11" cy="4" r="1" fill={color} />
    </Svg>
  )
}