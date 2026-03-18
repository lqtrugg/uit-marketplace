import Image from 'next/image';
import Link from 'next/link';
import {
  bestDealFeatured,
  bestDealProducts,
  featureCards,
  featuredProductsOne,
  featuredProductsTwo,
  featuredTabLabels,
  featuredTabLabelsTwo,
  heroSideBanners,
  heroSlide,
  latestNews,
  miniColumns,
  shopCategories
} from '@/app/_lib/marketplaceData';
import {
  CategoryCard,
  CtaLink,
  DealProductCard,
  FeatureCard,
  GridProductCard,
  MiniProductCard,
  NewsCard,
  SectionHeading
} from '@/app/_components/marketplace/ui';

function PrimaryButton({ children, variant = 'primary' }) {
  const classes =
    variant === 'secondary'
      ? 'bg-clicon-secondary text-white hover:bg-clicon-darkBlue'
      : 'bg-clicon-primary text-white hover:bg-clicon-primary/90';

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-sm px-4 py-3 text-sm font-semibold uppercase tracking-wide transition ${classes}`}
    >
      {children}
      <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3.125 10H16.875" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.25 4.375L16.875 10L11.25 15.625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function HeroSection() {
  return (
    <section className="app-container grid gap-6 pt-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <article className="rounded-md bg-[#F2F4F5] p-6 sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-clicon-secondary">
              <span className="h-0.5 w-6 bg-clicon-secondary" />
              {heroSlide.badge}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-clicon-slate sm:text-5xl">
              {heroSlide.title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-6 text-clicon-muted">{heroSlide.description}</p>
            <div className="mt-8">
              <PrimaryButton>Shop now</PrimaryButton>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[360px]">
            <Image src={heroSlide.image} alt={heroSlide.title} width={368} height={408} className="h-auto w-full object-contain" />
            <div className="absolute right-1 top-1 grid h-20 w-20 place-content-center rounded-full border-4 border-white bg-clicon-secondary text-xl font-semibold text-white shadow-card">
              {heroSlide.price}
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
        <article className="relative overflow-hidden rounded-md bg-[#191C1F] p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-wider text-clicon-warning">
            {heroSideBanners[0].subtitle}
          </p>
          <h3 className="mt-2 text-2xl font-semibold leading-tight">{heroSideBanners[0].title}</h3>
          <div className="mt-4">
            <PrimaryButton>Shop now</PrimaryButton>
          </div>
          <Image
            src={heroSideBanners[0].image}
            alt={heroSideBanners[0].title}
            width={200}
            height={180}
            className="ml-auto mt-3 h-40 w-auto object-contain"
          />
          <span className="absolute right-5 top-5 rounded bg-clicon-warning px-2 py-1 text-xs font-bold text-clicon-slate">
            {heroSideBanners[0].badge}
          </span>
        </article>

        <article className="rounded-md bg-[#F2F4F5] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-clicon-muted">
                {heroSideBanners[1].subtitle}
              </p>
              <h3 className="mt-2 text-2xl font-semibold leading-tight text-clicon-slate">
                {heroSideBanners[1].title}
              </h3>
              <p className="mt-2 inline-block rounded bg-clicon-warning/80 px-2 py-1 text-sm font-semibold text-clicon-slate">
                {heroSideBanners[1].badge}
              </p>
            </div>
            <Image
              src={heroSideBanners[1].image}
              alt={heroSideBanners[1].title}
              width={140}
              height={120}
              className="h-28 w-auto object-contain"
            />
          </div>
          <div className="mt-5">
            <PrimaryButton>Shop now</PrimaryButton>
          </div>
        </article>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section className="app-container">
      <div className="grid divide-y rounded-md border border-clicon-border bg-white md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
        {featureCards.map((item) => (
          <FeatureCard key={item.title} title={item.title} description={item.description} icon={item.icon} />
        ))}
      </div>
    </section>
  );
}

function BestDealsSection() {
  return (
    <section className="app-container rounded-md border border-clicon-border bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-clicon-border pb-4">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-2xl font-semibold text-clicon-slate">Best Deals</h2>
          <p className="rounded bg-clicon-surface px-3 py-1 text-sm text-clicon-muted">
            Deals ends in <span className="font-semibold text-clicon-slate">16d : 21h : 57m : 23s</span>
          </p>
        </div>
        <CtaLink>Browse All Product</CtaLink>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <article className="rounded-md border border-clicon-border bg-white p-4">
          <Image
            src={bestDealFeatured.image}
            alt={bestDealFeatured.title}
            width={336}
            height={288}
            className="mx-auto h-60 w-auto object-contain"
          />
          <div className="mt-3 flex gap-1 text-clicon-warning">
            {'★★★★★'.split('').map((star, index) => (
              <span key={`${star}-${index}`}>{star}</span>
            ))}
            <span className="ml-2 text-sm text-clicon-muted">({bestDealFeatured.ratingCount})</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-clicon-slate">{bestDealFeatured.title}</h3>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xl font-semibold text-clicon-secondary">{bestDealFeatured.price}</span>
            <span className="text-sm text-clicon-muted line-through">{bestDealFeatured.oldPrice}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-clicon-muted">{bestDealFeatured.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {bestDealFeatured.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  tag === 'HOT' ? 'bg-red-500 text-white' : 'bg-clicon-warning text-clicon-slate'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-5">
            <PrimaryButton>Add to cart</PrimaryButton>
          </div>
        </article>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {bestDealProducts.map((product) => (
            <DealProductCard key={`${product.title}-${product.image}`} {...product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoriesSection() {
  return (
    <section className="app-container rounded-md border border-clicon-border bg-white p-4 sm:p-6">
      <h2 className="text-center text-2xl font-semibold text-clicon-slate">Shop with Categories</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {shopCategories.map((item) => (
          <CategoryCard key={`${item.title}-${item.image}`} {...item} />
        ))}
      </div>
    </section>
  );
}

function FeaturedProductsSectionOne() {
  return (
    <section className="app-container grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <article className="flex h-full flex-col justify-between rounded-md bg-clicon-darkBlue p-6 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-clicon-warning">Computer & Accessories</p>
          <h3 className="mt-3 text-4xl font-semibold">32% Discount</h3>
          <p className="mt-2 text-sm text-white/80">For all electronics products</p>
          <p className="mt-4 inline-block rounded bg-white px-3 py-1 text-xs font-semibold text-clicon-slate">
            ENDS OF CHRISTMAS
          </p>
        </div>
        <Image
          src="/clicon/image/add/apple-accessories.png"
          alt="Apple accessories"
          width={250}
          height={220}
          className="mt-4 h-auto w-full object-contain"
        />
        <div className="mt-5">
          <PrimaryButton>Shop now</PrimaryButton>
        </div>
      </article>

      <div className="rounded-md border border-clicon-border bg-white p-4 sm:p-6">
        <SectionHeading title="Featured Products" tabs={featuredTabLabels} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featuredProductsOne.map((product) => (
            <GridProductCard key={`${product.title}-${product.image}`} {...product} sold={`${product.sold} sold`} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BannersSection() {
  return (
    <section className="app-container grid gap-4 lg:grid-cols-2">
      <article className="rounded-md bg-clicon-slate p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-clicon-warning">Introducing</p>
        <h3 className="mt-3 text-3xl font-semibold leading-tight">New Apple Homepod Mini</h3>
        <p className="mt-3 text-sm text-white/80">Jam-packed with innovation, HomePod mini delivers unexpectedly rich sound.</p>
        <div className="mt-5 flex items-center justify-between gap-4">
          <PrimaryButton>Shop now</PrimaryButton>
          <Image src="/clicon/image/add/soundbox.png" alt="Homepod" width={190} height={150} className="h-28 w-auto object-contain" />
        </div>
      </article>

      <article className="relative rounded-md bg-[#F2F4F5] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-clicon-darkBlue">Introducing</p>
        <h3 className="mt-3 text-3xl font-semibold leading-tight text-clicon-slate">Xiaomi Mi 11 Ultra 12GB+256GB</h3>
        <p className="mt-3 text-sm text-clicon-muted">Data provided by internal laboratories. Industry measurement in controlled setup.</p>
        <div className="mt-5 flex items-center justify-between gap-4">
          <PrimaryButton variant="secondary">Shop now</PrimaryButton>
          <div className="relative">
            <Image src="/clicon/image/add/mobile.png" alt="Xiaomi phone" width={168} height={140} className="h-28 w-auto object-contain" />
            <span className="absolute -right-3 -top-3 rounded-full bg-clicon-secondary px-3 py-1 text-xs font-semibold text-white">
              $299
            </span>
          </div>
        </div>
      </article>
    </section>
  );
}

function FeaturedProductsSectionTwo() {
  return (
    <section className="app-container grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="rounded-md border border-clicon-border bg-white p-4 sm:p-6">
        <SectionHeading title="Featured Products" tabs={featuredTabLabelsTwo} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featuredProductsTwo.map((product) => (
            <GridProductCard key={`${product.title}-${product.image}`} {...product} sold={`${product.sold} sold`} />
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <article className="rounded-md bg-clicon-slate p-6 text-white">
          <Image src="/clicon/image/add/airpod-02.png" alt="Xiaomi earbuds" width={180} height={124} className="h-28 w-auto object-contain" />
          <h3 className="mt-4 text-xl font-semibold">Xiaomi True Wireless Earbuds</h3>
          <p className="mt-2 text-sm text-white/80">Escape the noise, hear the magic.</p>
          <p className="mt-3 text-sm text-clicon-warning">Only for $299 USD</p>
          <div className="mt-4">
            <PrimaryButton>Shop now</PrimaryButton>
          </div>
        </article>

        <article className="rounded-md bg-clicon-warning p-6 text-clicon-slate">
          <p className="text-xs font-semibold uppercase tracking-[0.12em]">Summer Sales</p>
          <h3 className="mt-2 text-3xl font-semibold">37% Discount</h3>
          <p className="mt-2 text-sm">only for SmartPhone product.</p>
          <div className="mt-4">
            <PrimaryButton variant="secondary">Shop now</PrimaryButton>
          </div>
        </article>
      </div>
    </section>
  );
}

function MiniColumnsSection() {
  return (
    <section className="app-container grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {miniColumns.map((column) => (
        <article key={column.title} className="rounded-md border border-clicon-border bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-clicon-slate">{column.title}</h3>
          <div className="mt-4 space-y-3">
            {column.items.map((item) => (
              <MiniProductCard key={`${column.title}-${item.image}`} {...item} />
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function CtaSection() {
  return (
    <section className="app-container overflow-hidden rounded-md bg-clicon-slate px-6 py-10 text-white sm:px-10">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-clicon-warning">Save up to $200.00</p>
          <h2 className="mt-3 text-4xl font-semibold">Macbook Pro</h2>
          <p className="mt-3 text-base text-white/80">Apple M1 Max Chip. 32GB Unified Memory, 1TB SSD Storage.</p>
          <div className="mt-6">
            <PrimaryButton>Shop now</PrimaryButton>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[350px]">
          <Image src="/clicon/image/product/apple.png" alt="Macbook Pro" width={312} height={296} className="h-auto w-full object-contain" />
          <span className="absolute -left-2 top-3 rounded-full bg-clicon-secondary px-4 py-2 text-lg font-semibold text-white">
            $1999
          </span>
        </div>
      </div>
    </section>
  );
}

function NewsSection() {
  return (
    <section className="bg-clicon-surface py-10">
      <div className="app-container">
        <h2 className="text-center text-3xl font-semibold text-clicon-slate">Latest News</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {latestNews.map((item) => (
            <NewsCard key={`${item.title}-${item.date}`} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection() {
  return (
    <section className="bg-clicon-darkBlue py-12 text-white">
      <div className="app-container text-center">
        <h2 className="text-3xl font-semibold">Subscribe to our newsletter</h2>
        <p className="mx-auto mt-3 max-w-2xl text-white/80">
          Praesent fringilla erat a lacinia egestas. Donec vehicula tempor libero et cursus.
        </p>

        <form className="mx-auto mt-6 flex w-full max-w-xl flex-col gap-3 rounded-md bg-white p-3 sm:flex-row" action="#" method="post">
          <input
            type="email"
            name="email"
            placeholder="Email address"
            className="h-11 flex-1 rounded border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded bg-clicon-primary px-5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-clicon-primary/90"
          >
            Subscribe
          </button>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 opacity-85">
          {['googel', 'amaazon', 'philips', 'toshiba', 'samsung'].map((brand) => (
            <Image
              key={brand}
              src={`/clicon/image/logo/${brand}.png`}
              alt={brand}
              width={96}
              height={32}
              className="h-7 w-auto object-contain"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="bg-clicon-slate py-6 text-center text-sm text-white/70">
      <div className="app-container">
        <p>
          Crafted in React + Tailwind. Visit your existing pages: <Link href="/auth" className="text-white">Auth</Link>,{' '}
          <Link href="/feed" className="text-white">Feed</Link>, <Link href="/post" className="text-white">Post</Link>.
        </p>
      </div>
    </footer>
  );
}

export default function MarketplaceHome() {
  return (
    <div className="space-y-6 pb-0">
      {/* <HeroSection /> */}
      {/* <FeatureSection /> */}
      <BestDealsSection />
      <CategoriesSection />
      <FeaturedProductsSectionOne />
      <BannersSection />
      <FeaturedProductsSectionTwo />
      <MiniColumnsSection />
      {/* <CtaSection /> */}
      {/* <NewsSection /> */}
      {/* <NewsletterSection /> */}
      <FooterSection />
    </div>
  );
}
