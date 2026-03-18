import Link from 'next/link';
import { categoryLinks, searchKeywords, topQuickLinks, topSocialLinks } from '@/app/_lib/marketplaceData';

function HeaderIcon({ children, badge }) {
  return (
    <button
      type="button"
      className="relative inline-flex size-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
      aria-label="header action"
    >
      {children}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-clicon-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function MainNav() {
  return (
    <header className="sticky top-0 z-50">
      <div className="hidden bg-clicon-slate lg:block">
        <div className="app-container flex min-h-12 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-clicon-warning px-2 py-1 text-sm font-semibold uppercase text-clicon-slate">Black</span>
            <strong className="text-xl font-semibold uppercase tracking-wide text-white">Friday</strong>
            <p className="text-white/85">
              Up to <span className="text-clicon-warning">59%</span> off
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-sm bg-clicon-warning px-3 py-2 text-xs font-semibold uppercase tracking-wide text-clicon-slate transition hover:bg-clicon-warning/90"
          >
            Shop now
          </button>
        </div>
      </div>

      <div className="hidden border-b border-white/15 bg-clicon-darkBlue text-sm text-white/85 lg:block">
        <div className="app-container flex min-h-11 items-center justify-between gap-3">
          <p>Welcome to Clicon online eCommerce store.</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-white/70">Follow us:</span>
              <div className="flex items-center gap-2">
                {topSocialLinks.map((item) => (
                  <Link key={item} href="#" className="text-xs transition hover:text-white">
                    {item}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <button type="button" className="rounded border border-white/30 px-2 py-1">Eng</button>
              <button type="button" className="rounded border border-white/30 px-2 py-1">USD</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-clicon-darkBlue py-3 text-white shadow-card">
        <div className="app-container grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <Link href="/" className="text-3xl font-bold uppercase tracking-wide">
            CLICON
          </Link>

          <form action="/" method="get" role="search" className="flex items-center rounded-sm bg-white p-1">
            <input
              type="search"
              name="q"
              placeholder="Search for anything..."
              className="h-10 w-full border-0 bg-transparent px-3 text-sm text-clicon-slate outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-sm bg-clicon-primary px-4 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-clicon-primary/90"
            >
              Search
            </button>
          </form>

          <div className="flex items-center justify-end gap-1">
            <HeaderIcon badge="2">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7.5 20.25C8.32843 20.25 9 19.5784 9 18.75C9 17.9216 8.32843 17.25 7.5 17.25C6.67157 17.25 6 17.9216 6 18.75C6 19.5784 6.67157 20.25 7.5 20.25Z" fill="currentColor" />
                <path d="M17.25 20.25C18.0784 20.25 18.75 19.5784 18.75 18.75C18.75 17.9216 18.0784 17.25 17.25 17.25C16.4216 17.25 15.75 17.9216 15.75 18.75C15.75 19.5784 16.4216 20.25 17.25 20.25Z" fill="currentColor" />
                <path d="M2.25 3.75H4.01156C4.14748 3.74986 4.27973 3.79401 4.38827 3.87578C4.49682 3.95754 4.57575 4.07246 4.61313 4.20312L6.80344 11.8687C6.87694 12.1307 7.03456 12.3613 7.25192 12.525C7.46928 12.6888 7.73439 12.7766 8.0065 12.775H16.275C16.5471 12.7766 16.8122 12.6888 17.0296 12.525C17.2469 12.3613 17.4045 12.1307 17.4781 11.8687L19.5 4.875H5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </HeaderIcon>

            <HeaderIcon>
              <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 20.25C12 20.25 2.625 15 2.625 8.625C2.625 7.498 3.01546 6.40582 3.72996 5.53428C4.44445 4.66273 5.43884 4.06567 6.54393 3.84465C7.64903 3.62363 8.79657 3.79233 9.79131 4.32202C10.7861 4.85171 11.5665 5.70969 12 6.75C12.4335 5.70969 13.2139 4.85171 14.2087 4.32202C15.2034 3.79233 16.351 3.62363 17.4561 3.84465C18.5612 4.06567 19.5555 4.66273 20.27 5.53428C20.9845 6.40582 21.375 7.498 21.375 8.625C21.375 15 12 20.25 12 20.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </HeaderIcon>

            <Link
              href="/auth"
              className="inline-flex size-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
              aria-label="user account"
            >
              <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 14.25C14.4853 14.25 16.5 12.2353 16.5 9.75C16.5 7.26472 14.4853 5.25 12 5.25C9.51472 5.25 7.5 7.26472 7.5 9.75C7.5 12.2353 9.51472 14.25 12 14.25Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
                <path d="M5.25 20.25C5.93135 19.0693 6.91146 18.0892 8.09213 17.4079C9.2728 16.7265 10.612 16.3679 11.975 16.3679C13.338 16.3679 14.6772 16.7265 15.8579 17.4079C17.0385 18.0892 18.0187 19.0693 18.7 20.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="app-container mt-2 flex flex-wrap items-center gap-3 text-xs text-white/80">
          {searchKeywords.map((keyword) => (
            <Link key={keyword} href={`/?q=${encodeURIComponent(keyword)}`} className="transition hover:text-white">
              {keyword}
            </Link>
          ))}
        </div>
      </div>

      <div className="hidden border-b border-clicon-border bg-white lg:block">
        <div className="app-container flex min-h-14 items-center justify-between gap-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-sm bg-clicon-surface px-4 py-2 text-sm font-semibold text-clicon-slate"
          >
            All Category
            <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M15 7.5L10 12.5L5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <nav className="flex flex-1 items-center gap-4 overflow-x-auto text-sm text-clicon-muted">
            {topQuickLinks.map((item) => (
              <Link key={item.label} href={item.href} className="whitespace-nowrap transition hover:text-clicon-slate">
                {item.label}
              </Link>
            ))}
          </nav>

          <p className="whitespace-nowrap text-sm font-semibold text-clicon-slate">+1-202-555-0104</p>
        </div>

        <div className="app-container flex flex-wrap items-center gap-3 pb-3 text-xs text-clicon-muted">
          {categoryLinks.map((category) => (
            <Link key={category} href="#" className="rounded-full bg-clicon-surface px-3 py-1 transition hover:bg-clicon-secondary/10 hover:text-clicon-darkBlue">
              {category}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
