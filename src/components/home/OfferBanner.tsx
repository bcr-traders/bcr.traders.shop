import Image from 'next/image'
import Link from 'next/link'
import type { OfferBannerConfig } from '@/types/database.types'

interface Props {
  data: OfferBannerConfig
}

export default function OfferBanner({ data }: Props) {
  return (
    <section className="px-4">
      <Link
        href={data.link_url}
        className="block relative w-full aspect-[16/5] md:aspect-[21/5] rounded-xl overflow-hidden border border-table-border shadow-sm hover:opacity-95 transition-opacity"
      >
        <Image
          src={data.image_url}
          alt={data.alt_text}
          fill
          sizes="100vw"
          className="object-cover"
        />
      </Link>
    </section>
  )
}
