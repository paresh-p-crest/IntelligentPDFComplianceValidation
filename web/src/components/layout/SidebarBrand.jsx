const APP_NAME = 'Quality Assurance Check';

export default function SidebarBrand() {
  return (
    <div>
      <p
        className="text-[1.35rem] font-black italic leading-none tracking-tight text-white"
        style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
      >
        CROSSTOWN
      </p>
      <p className="mt-0.5 text-[1.35rem] font-black italic leading-none tracking-tight text-cp-lime">
        PARTNERS
      </p>
      <div className="mt-2.5 h-px w-full bg-gradient-to-r from-cp-lime via-cp-lime/50 to-transparent" />
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-cp-lime">
        {APP_NAME}
      </p>
      <p className="mt-1 text-xs leading-snug text-slate-300">
        DQR compliance &amp; audit platform
      </p>
    </div>
  );
}
