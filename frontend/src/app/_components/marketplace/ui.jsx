import Image from 'next/image';
import Link from 'next/link';

function toneClasses(tone) {
  if (tone === 'warning') {
    return 'bg-clicon-warning/20 text-[#8A6900]';
  }

  if (tone === 'teal') {
    return 'bg-[#20B2AA]/15 text-[#1A6B66]';
  }

  if (tone === 'violet') {
    return 'bg-[#8B5CF6]/15 text-[#5A35A3]';
  }

  return 'bg-clicon-secondary/15 text-clicon-darkBlue';
}

export function CtaLink({ href = '#', children, className = '' }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 text-sm font-semibold text-clicon-primary transition hover:text-clicon-darkBlue ${className}`}
    >
      <span>{children}</span>
      <span className="text-base leading-none">{'->'}</span>
    </Link>
  );
}

export function SectionHeading({ title, actionText = 'Browse All Product', tabs = [] }) {
  return (
    <div className="flex flex-col gap-4 border-b border-clicon-border pb-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-6">
        <h2 className="text-2xl font-semibold tracking-tight text-clicon-slate">{title}</h2>
        {tabs.length ? (
          <div className="hidden flex-wrap items-center gap-2 xl:flex">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={
                  index === 0
                    ? 'rounded-full bg-clicon-secondary/10 px-3 py-1 text-sm font-medium text-clicon-darkBlue'
                    : 'rounded-full border border-transparent px-3 py-1 text-sm text-clicon-muted transition hover:border-clicon-border hover:bg-clicon-surface'
                }
              >
                {tab}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <CtaLink>{actionText}</CtaLink>
    </div>
  );
}

export function FeatureCard({ title, description, marker, tone }) {
  return (
    <article className="flex items-center gap-3 px-4 py-3 md:px-5">
      <div className={`grid size-10 place-content-center rounded-xl text-xs font-extrabold uppercase tracking-[0.14em] ${toneClasses(tone)}`}>
        {marker}
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-clicon-slate">{title}</p>
        <p className="text-xs text-clicon-muted md:text-sm">{description}</p>
      </div>
    </article>
  );
}

export function DealProductCard({ title, image, price, oldPrice, badge }) {
  return (
    <article className="group relative rounded-xl border border-clicon-border bg-white p-3 transition hover:-translate-y-0.5 hover:border-clicon-secondary/40 hover:shadow-card">
      {badge ? (
        <span className="absolute left-3 top-3 rounded bg-clicon-warning px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-clicon-slate">
          {badge}
        </span>
      ) : null}

      <div className="mb-3 flex min-h-28 items-center justify-center pt-2">
        <Image src={image} alt={title} width={120} height={120} className="h-24 w-auto object-contain" />
      </div>

      <h3 className="line-clamp-2 text-sm leading-5 text-clicon-slate">{title}</h3>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-base font-semibold text-clicon-secondary">{price}</span>
        {oldPrice ? <span className="text-xs text-clicon-muted line-through">{oldPrice}</span> : null}
      </div>
    </article>
  );
}

export function GridProductCard({ title, image, price, oldPrice, sold, badge }) {
  return (
    <article className="group relative rounded-xl border border-clicon-border bg-white p-3 transition hover:-translate-y-0.5 hover:border-clicon-secondary/40 hover:shadow-card">
      {badge ? (
        <span className="absolute left-3 top-3 rounded bg-clicon-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {badge}
        </span>
      ) : null}

      <div className="mb-3 flex min-h-28 items-center justify-center pt-2">
        <Image src={image} alt={title} width={120} height={120} className="h-24 w-auto object-contain" />
      </div>

      <h3 className="line-clamp-2 text-sm leading-5 text-clicon-slate">{title}</h3>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-base font-semibold text-clicon-secondary">{price}</span>
        {oldPrice ? <span className="text-xs text-clicon-muted line-through">{oldPrice}</span> : null}
      </div>

      {sold ? <p className="mt-1 text-xs text-clicon-muted">{sold}</p> : null}
    </article>
  );
}

export function CategoryCard({ title, image }) {
  return (
    <article className="rounded-xl border border-clicon-border bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-clicon-secondary/40 hover:shadow-card">
      <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-clicon-surface">
        <Image src={image} alt={title} width={56} height={56} className="h-14 w-14 object-contain" />
      </div>
      <h3 className="text-sm font-medium text-clicon-slate">{title}</h3>
    </article>
  );
}

export function MiniProductCard({ title, price, image }) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-clicon-border bg-white p-3 transition hover:-translate-y-0.5 hover:border-clicon-secondary/40 hover:shadow-card">
      <Image src={image} alt={title} width={64} height={64} className="h-14 w-14 object-contain" />
      <div>
        <h3 className="line-clamp-2 text-sm text-clicon-slate">{title}</h3>
        <p className="mt-1 text-sm font-semibold text-clicon-secondary">{price}</p>
      </div>
    </article>
  );
}

export function NewsCard({ author, date, comments, title, text, image }) {
  return (
    <article className="rounded-xl border border-clicon-border bg-white p-4 shadow-sm">
      <Image src={image} alt={title} width={376} height={248} className="h-52 w-full rounded-lg object-cover" />
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-clicon-muted">
        <span>{author}</span>
        <span>{date}</span>
        <span>{comments} comments</span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-6 text-clicon-slate">{title}</h3>
      <p className="mt-2 line-clamp-3 text-sm text-clicon-muted">{text}</p>
      <CtaLink className="mt-4">Read more</CtaLink>
    </article>
  );
}
