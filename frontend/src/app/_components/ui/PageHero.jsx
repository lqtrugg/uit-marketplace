import Link from 'next/link';

export default function PageHero({
  iconSrc = '/clicon/image/svg/portfolio.svg',
  title,
  subtitle = '',
  pill = '',
  actions = []
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#eaf5ff] via-[#f6fbff] to-[#fff6ee] p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-10 h-32 w-32 rounded-full bg-[#2da5f3]/10" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-[#fa8232]/10" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-12 shrink-0 place-content-center rounded-2xl border border-clicon-border bg-white shadow-sm">
            <img src={iconSrc} alt="" className="size-6 object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-bold text-clicon-slate">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-clicon-muted">{subtitle}</p> : null}
          </div>
        </div>
        {pill ? (
          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-clicon-slate shadow-sm">
            {pill}
          </span>
        ) : null}
      </div>

      {actions.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) =>
            action.href ? (
              <Link
                key={`${action.label}-${action.href}`}
                href={action.href}
                className={`inline-flex rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  action.primary
                    ? 'bg-clicon-primary text-white hover:bg-clicon-secondary'
                    : 'border border-clicon-border bg-white text-clicon-darkBlue hover:bg-clicon-surface'
                }`}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={`${action.label}-button`}
                type="button"
                onClick={action.onClick}
                className={`inline-flex rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  action.primary
                    ? 'bg-clicon-primary text-white hover:bg-clicon-secondary'
                    : 'border border-clicon-border bg-white text-clicon-darkBlue hover:bg-clicon-surface'
                }`}
              >
                {action.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
