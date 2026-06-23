export const criticalStyles = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f7f4ee;
    color: #1f2933;
    font-family: Arial, Helvetica, sans-serif;
  }
  a { color: inherit; text-decoration: none; }
  button, input, select, textarea { font: inherit; }
  button { cursor: pointer; }
  .min-h-screen { min-height: 100vh; }
  .sticky { position: sticky; }
  .fixed { position: fixed; }
  .top-0 { top: 0; }
  .bottom-0 { bottom: 0; }
  .inset-x-0 { left: 0; right: 0; }
  .z-20 { z-index: 20; }
  .z-30 { z-index: 30; }
  .z-40 { z-index: 40; }
  .z-50 { z-index: 50; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .mt-1 { margin-top: .25rem; }
  .mt-2 { margin-top: .5rem; }
  .mt-3 { margin-top: .75rem; }
  .mt-4 { margin-top: 1rem; }
  .mt-5 { margin-top: 1.25rem; }
  .mb-5 { margin-bottom: 1.25rem; }
  .block { display: block; }
  .inline-flex { display: inline-flex; }
  .flex { display: flex; }
  .grid { display: grid; }
  .hidden { display: none; }
  .flex-col { flex-direction: column; }
  .flex-wrap { flex-wrap: wrap; }
  .items-center { align-items: center; }
  .items-start { align-items: flex-start; }
  .justify-center { justify-content: center; }
  .justify-between { justify-content: space-between; }
  .place-items-center { place-items: center; }
  .gap-1 { gap: .25rem; }
  .gap-2 { gap: .5rem; }
  .gap-3 { gap: .75rem; }
  .gap-4 { gap: 1rem; }
  .gap-5 { gap: 1.25rem; }
  .space-y-2 > * + * { margin-top: .5rem; }
  .space-y-3 > * + * { margin-top: .75rem; }
  .space-y-4 > * + * { margin-top: 1rem; }
  .w-full { width: 100%; }
  .max-w-2xl { max-width: 42rem; }
  .max-w-3xl { max-width: 48rem; }
  .max-w-5xl { max-width: 64rem; }
  .max-w-sm { max-width: 24rem; }
  .max-w-xs { max-width: 20rem; }
  .h-5 { height: 1.25rem; }
  .h-9 { height: 2.25rem; }
  .h-10 { height: 2.5rem; }
  .h-11 { height: 2.75rem; }
  .h-12 { height: 3rem; }
  .h-14 { height: 3.5rem; }
  .h-16 { height: 4rem; }
  .w-5 { width: 1.25rem; }
  .w-12 { width: 3rem; }
  .w-16 { width: 4rem; }
  .min-h-32 { min-height: 8rem; }
  .rounded-full { border-radius: 9999px; }
  .rounded-md { border-radius: .375rem; }
  .border { border-width: 1px; border-style: solid; }
  .border-b { border-bottom: 1px solid rgba(0,0,0,.06); }
  .border-t { border-top: 1px solid rgba(0,0,0,.1); }
  [class*="border-black"] { border-color: rgba(0,0,0,.1); }
  .bg-white { background: #fff; }
  .bg-leaf { background: #2f6f5e; }
  .bg-coral { background: #d96d5b; }
  .bg-ink { background: #1f2933; }
  [class*="bg-[#f7f4ee]"] { background: #f7f4ee; }
  [class*="bg-[#eef5ef]"] { background: #eef5ef; }
  [class*="bg-skysoft"] { background: rgba(216,236,243,.75); }
  [class*="bg-warm"] { background: rgba(246,198,111,.55); }
  .p-3 { padding: .75rem; }
  .p-4 { padding: 1rem; }
  .p-5 { padding: 1.25rem; }
  .p-6 { padding: 1.5rem; }
  .px-3 { padding-left: .75rem; padding-right: .75rem; }
  .px-4 { padding-left: 1rem; padding-right: 1rem; }
  .px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
  .py-1 { padding-top: .25rem; padding-bottom: .25rem; }
  .py-2 { padding-top: .5rem; padding-bottom: .5rem; }
  .pt-5 { padding-top: 1.25rem; }
  .pb-28 { padding-bottom: 7rem; }
  .pl-6 { padding-left: 1.5rem; }
  .text-left { text-align: left; }
  .text-xs { font-size: .75rem; }
  .text-sm { font-size: .875rem; }
  .text-xl { font-size: 1.25rem; }
  .text-2xl { font-size: 1.5rem; }
  .text-3xl { font-size: 1.875rem; }
  .text-4xl { font-size: 2.25rem; }
  [class*="text-[10px]"] { font-size: 10px; }
  [class*="text-[11px]"] { font-size: 11px; }
  .font-medium { font-weight: 500; }
  .font-semibold { font-weight: 600; }
  .font-bold { font-weight: 700; }
  .uppercase { text-transform: uppercase; }
  .leading-6 { line-height: 1.5rem; }
  .leading-7 { line-height: 1.75rem; }
  .leading-8 { line-height: 2rem; }
  .leading-9 { line-height: 2.25rem; }
  .tracking-wide { letter-spacing: .025em; }
  .text-white { color: #fff; }
  .text-leaf { color: #2f6f5e; }
  .text-coral { color: #d96d5b; }
  .text-ink { color: #1f2933; }
  [class*="text-ink/"] { color: rgba(31,41,51,.72); }
  .shadow-soft { box-shadow: 0 12px 30px rgba(31, 41, 51, .08); }
  .backdrop-blur { backdrop-filter: blur(10px); }
  .animate-spin { animation: spin 1s linear infinite; }
  .list-decimal { list-style: decimal; }
  .disabled\\:opacity-60:disabled { opacity: .6; }
  @keyframes spin { to { transform: rotate(360deg); } }
  header { background: rgba(247,244,238,.96); }
  main { max-width: 64rem; margin: 0 auto; padding: 1.25rem 1rem 7rem; }
  section, aside > div, nav, .shadow-soft {
    border-radius: .375rem;
  }
  input, select, textarea {
    background: #fff;
    border: 1px solid rgba(0,0,0,.1);
    border-radius: .375rem;
  }
  .grid-cols-7 { grid-template-columns: repeat(7, minmax(0, 1fr)); }
  .grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  @media (min-width: 640px) {
    .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .sm\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .sm\\:flex-row { flex-direction: row; }
    .sm\\:items-center { align-items: center; }
  }
  @media (min-width: 768px) {
    .md\\:hidden { display: none; }
    .md\\:block { display: block; }
    .md\\:ml-52 { margin-left: 13rem; }
    .md\\:pb-10 { padding-bottom: 2.5rem; }
    .md\\:grid-cols-\\[1fr_130px_140px\\] {
      grid-template-columns: 1fr 130px 140px;
    }
  }
  @media (min-width: 1024px) {
    .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .lg\\:grid-cols-\\[280px_1fr\\] { grid-template-columns: 280px 1fr; }
  }
`;
