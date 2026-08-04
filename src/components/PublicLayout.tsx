import { ReactNode, useState } from 'react';
import { Truck, Users, LogIn, Car, Tag, MessageSquare, Siren, Menu, X } from 'lucide-react';

export type PublicPage =
  | 'home'
  | 'citizen'
  | 'vehicles'
  | 'rates'
  | 'complaint'
  | 'emergency'
  | 'login';

interface Props {
  children: ReactNode;
  currentPage: PublicPage;
  onNavigate: (page: PublicPage) => void;
}

const navLinks: { id: PublicPage; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'หน้าแรก', icon: <Truck size={15} /> },
  { id: 'citizen', label: 'ระบบประชาชน', icon: <Users size={15} /> },
  { id: 'vehicles', label: 'ตรวจสอบยานพาหนะ', icon: <Car size={15} /> },
  { id: 'rates', label: 'อัตราค่าบริการ', icon: <Tag size={15} /> },
  { id: 'complaint', label: 'ร้องเรียน', icon: <MessageSquare size={15} /> },
  { id: 'emergency', label: 'แจ้งเหตุฉุกเฉิน', icon: <Siren size={15} /> },
];

export function PublicLayout({ children, currentPage, onNavigate }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-navy-800/95 backdrop-blur border-b border-blue-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button onClick={() => onNavigate('home')} className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg group-hover:bg-amber-400 transition-colors">
                <Truck size={20} className="text-navy-900" />
              </div>
              <div className="text-left">
                <div className="text-xs text-amber-500 font-medium leading-none">BIT CITIES</div>
                <div className="text-base font-bold text-white leading-tight">DOT</div>
              </div>
            </button>

            {/* Desktop Nav Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink key={link.id} active={currentPage === link.id} onClick={() => onNavigate(link.id)} icon={link.icon}>
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Login Button */}
            <button
              onClick={() => onNavigate('login')}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all flex-shrink-0"
            >
              <LogIn size={15} />
              <span className="hidden sm:inline">เข้าสู่ระบบเจ้าหน้าที่</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-gray-400 hover:text-white ml-1"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-blue-900/40 bg-navy-800">
            <nav className="max-w-7xl mx-auto px-4 py-2 flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => { onNavigate(link.id); setMobileOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentPage === link.id
                      ? 'bg-blue-900/60 text-amber-400'
                      : 'text-gray-300 hover:text-white hover:bg-navy-700'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Mobile horizontal scroll nav (always visible on mobile) */}
      <div className="lg:hidden bg-navy-800 border-b border-blue-900/50 px-4 py-2 flex gap-1.5 overflow-x-auto">
        {navLinks.map((link) => (
          <MobileNavLink key={link.id} active={currentPage === link.id} onClick={() => onNavigate(link.id)}>
            {link.label}
          </MobileNavLink>
        ))}
      </div>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-navy-800/50 border-t border-blue-900/30 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center">
              <Truck size={13} className="text-navy-900" />
            </div>
            <span className="text-amber-500 font-bold text-sm">Bit Cities Department of Transportation</span>
          </div>
          <p className="text-gray-500 text-xs">ระบบบริหารจัดการกรมขนส่ง — สงวนสิทธิ์สำหรับเจ้าหน้าที่ DOT เท่านั้น</p>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ children, active, onClick, icon }: { children: ReactNode; active: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-blue-900/60 text-amber-400' : 'text-gray-300 hover:text-white hover:bg-navy-700'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function MobileNavLink({ children, active, onClick }: { children: ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
        active ? 'bg-blue-900/60 text-amber-400' : 'text-gray-400'
      }`}
    >
      {children}
    </button>
  );
}
