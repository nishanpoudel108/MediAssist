import { Link } from 'react-router-dom';

const highlights = [
  ['Records', 'Keep reports and health history in one private place.'],
  ['Medication', 'Track medicines and build a dependable routine.'],
  ['Care team', 'Share the right information with the right people.'],
];

export default function Welcome() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <Link to="/" className="text-lg font-bold tracking-tight text-primary-700">
            MediAssist AI
          </Link>
          <Link to="/login" className="btn-secondary">Sign in</Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.1fr_.9fr]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-teal-600">Personal health workspace</p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Your health information, organized around you.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Manage medical reports, medications, reminders, and trusted access from one secure dashboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className="btn-primary px-5 py-3">Create an account</Link>
              <Link to="/login" className="btn-secondary px-5 py-3">Sign in to dashboard</Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white bg-white p-6 shadow-[0_8px_30px_rgba(63,81,67,0.06)] ring-1 ring-slate-200/70 sm:p-8">
            <p className="text-sm font-medium text-slate-500">Your workspace includes</p>
            <div className="mt-5 space-y-5">
              {highlights.map(([title, description], index) => (
                <div key={title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <p className="border-t border-slate-200 pt-5 text-sm text-slate-500">
          For patients, family members, and healthcare professionals.
        </p>
      </div>
    </main>
  );
}
