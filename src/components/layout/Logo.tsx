import Image from 'next/image'

interface LogoProps {
  className?: string
  priority?: boolean
}

// Intrinsic size of the trimmed source file — keeps the aspect ratio correct
// no matter what height/width the caller applies via className.
const INTRINSIC_WIDTH = 703
const INTRINSIC_HEIGHT = 844

export default function Logo({ className = 'h-10 w-auto', priority }: LogoProps) {
  return (
    <Image
      src="/images/logo-trimmed.webp"
      alt="BCR Traders"
      width={INTRINSIC_WIDTH}
      height={INTRINSIC_HEIGHT}
      priority={priority}
      className={className}
    />
  )
}
