/* Small line icons, drawn at the stroke weight of the type. */

export const Arrow = ({ back = false }: { back?: boolean }) => (
  <svg width="16" height="8" viewBox="0 0 16 8" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
    <path d={back ? "M16 4H1M4 1 1 4l3 3" : "M0 4h15M12 1l3 3-3 3"} />
  </svg>
);

export const Cross = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <path d="M1 1l8 8M9 1 1 9" />
  </svg>
);

export const Search = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <circle cx="5.5" cy="5.5" r="4.5" />
    <path d="m9 9 3.5 3.5" />
  </svg>
);

export const Sun = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <circle cx="8" cy="8" r="3.2" />
    <path d="M8 1v1.8M8 13.2V15M1 8h1.8M13.2 8H15M3.05 3.05l1.27 1.27M11.68 11.68l1.27 1.27M3.05 12.95l1.27-1.27M11.68 4.32l1.27-1.27" />
  </svg>
);

export const Moon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <path d="M13.5 9.8A5.8 5.8 0 0 1 6.2 2.5a5.8 5.8 0 1 0 7.3 7.3Z" />
  </svg>
);
