export default function PageTransition({ children, pageKey }) {
  return (
    <div key={pageKey} className="page-transition">
      {children}
    </div>
  );
}
