import Image from 'next/image'

interface LogoProps {
  className?: string
  priority?: boolean
  /**
   * Rendered width hint for the browser's srcset pick. Defaults to the largest
   * of the small usages (h-16 => ~53px wide). The footer renders this far bigger
   * and passes its own, otherwise it would be served a blurry variant.
   */
  sizes?: string
}

// Intrinsic size of the trimmed source file — keeps the aspect ratio correct
// no matter what height/width the caller applies via className.
const INTRINSIC_WIDTH = 703
const INTRINSIC_HEIGHT = 844

export default function Logo({ className = 'h-10 w-auto', priority, sizes = '64px' }: LogoProps) {
  return (
    <Image
      src="/images/logo-trimmed.webp"
      alt="BCR Traders"
      width={INTRINSIC_WIDTH}
      height={INTRINSIC_HEIGHT}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  )
}
