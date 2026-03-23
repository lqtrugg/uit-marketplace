import Link from 'next/link';

export default async function PostSuccessPage({ searchParams }) {
  const params = await searchParams;
  const itemId = Number.parseInt(String(params?.itemId || ''), 10);
  const hasItemId = Number.isInteger(itemId) && itemId > 0;

  return (
    <section className="app-container py-10">
      <article className="mx-auto w-full max-w-2xl rounded-2xl border border-clicon-border bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-3xl font-bold text-clicon-slate">Post Created Successfully</h1>
        <p className="mt-2 text-sm text-clicon-muted">
          Your item has been posted.
          {hasItemId ? ` Item ID: #${itemId}.` : ''}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/home"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-clicon-primary px-5 text-sm font-semibold text-white transition hover:bg-clicon-secondary"
          >
            Go To Home
          </Link>
          <Link
            href="/settings/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-clicon-border px-5 text-sm font-semibold text-clicon-darkBlue transition hover:bg-clicon-surface"
          >
            Go To Item Dashboard
          </Link>
        </div>
      </article>
    </section>
  );
}
