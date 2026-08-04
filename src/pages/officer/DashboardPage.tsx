import { useEffect, useState, ReactNode } from 'react';
import {
  Users, DollarSign, FileText, TrendingUp, Clock, AlertCircle, Pin,
  Phone, Power, Image as ImageIcon, Lock, Unlock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Announcement, Officer, ServiceRecord, DEPARTMENT_LABELS } from '../../lib/types';
import { useAuth } from '../../lib/AuthContext';
import { Badge } from '../../components/Badge';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { IdCard } from '../../components/IdCard';

export function DashboardPage() {
  const { officer, isCommissioner } = useAuth();
  const [onDutyCount, setOnDutyCount] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [todayRecords, setTodayRecords] = useState(0);
  const [recentServices, setRecentServices] = useState<ServiceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [onDutyOfficers, setOnDutyOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceTarget, setForceTarget] = useState<Officer | null>(null);
  const [idCardOfficer, setIdCardOfficer] = useState<{ officer: Officer; clockIn: string | null } | null>(null);
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [togglingLogin, setTogglingLogin] = useState(false);

  useEffect(() => {
    Promise.all([fetchStats(), fetchAnnouncements(), fetchOnDuty(), fetchRecentServices(), fetchLoginStatus()]).finally(() => setLoading(false));
  }, []);

  async function fetchStats() {
    const [duty, unpaid, today] = await Promise.all([
      supabase.from('officers').select('id', { count: 'exact', head: true }).eq('is_on_duty', true).eq('status', 'active'),
      supabase.from('service_records').select('amount').eq('status', 'unpaid'),
      supabase.from('service_records').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().slice(0, 10)),
    ]);
    setOnDutyCount(duty.count ?? 0);
    if (unpaid.data) {
      setUnpaidCount(unpaid.data.length);
      setUnpaidTotal(unpaid.data.reduce((s, r) => s + r.amount, 0));
    }
    setTodayRecords(today.count ?? 0);
  }

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4);
    setAnnouncements(data ?? []);
  }

  async function fetchOnDuty() {
    const { data } = await supabase
      .from('officers')
      .select('*')
      .eq('is_on_duty', true)
      .eq('status', 'active')
      .order('name');
    setOnDutyOfficers(data ?? []);
  }

  async function fetchRecentServices() {
    const { data } = await supabase
      .from('service_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentServices(data ?? []);
  }

  async function fetchLoginStatus() {
    const { data } = await supabase
      .from('system_settings')
      .select('login_enabled')
      .eq('id', 1)
      .maybeSingle();
    if (data) setLoginEnabled(data.login_enabled);
  }

  async function toggleLogin() {
    if (!officer) return;
    setTogglingLogin(true);
    const newVal = !loginEnabled;
    await supabase.from('system_settings').update({
      login_enabled: newVal,
      updated_at: new Date().toISOString(),
      updated_by: officer.id,
      updated_by_name: officer.name,
    }).eq('id', 1);
    await supabase.from('audit_logs').insert({
      action: newVal ? 'ENABLE_LOGIN' : 'DISABLE_LOGIN',
      target_type: 'system',
      target_id: 'system_settings',
      performed_by: officer.id,
      performed_by_name: officer.name,
      details: { login_enabled: newVal },
    });
    setLoginEnabled(newVal);
    setTogglingLogin(false);
  }

  async function showIdCard(o: Officer) {
    const { data: activeLog } = await supabase
      .from('duty_logs')
      .select('clock_in')
      .eq('officer_id', o.id)
      .is('clock_out', null)
      .is('deleted_at', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();
    setIdCardOfficer({ officer: o, clockIn: activeLog?.clock_in ?? null });
  }

  async function handleForceCheckout() {
    if (!forceTarget || !officer) return;
    const { data: activeLog } = await supabase
      .from('duty_logs')
      .select('*')
      .eq('officer_id', forceTarget.id)
      .is('clock_out', null)
      .is('deleted_at', null)
      .maybeSingle();

    if (activeLog) {
      const now = new Date();
      const dur = Math.round((now.getTime() - new Date(activeLog.clock_in).getTime()) / 60000);
      await supabase.from('duty_logs').update({
        clock_out: now.toISOString(),
        duration_minutes: dur,
        forced_by: officer.id,
        forced_by_name: officer.name,
        checkout_method: 'forced',
      }).eq('id', activeLog.id);
    }
    await supabase.from('officers').update({ is_on_duty: false, updated_at: new Date().toISOString() }).eq('id', forceTarget.id);
    await supabase.from('audit_logs').insert({
      action: 'FORCE_CHECKOUT',
      target_type: 'officer',
      target_id: forceTarget.id,
      performed_by: officer.id,
      performed_by_name: officer.name,
      details: { target_name: forceTarget.name },
    });
    setForceTarget(null);
    await Promise.all([fetchStats(), fetchOnDuty()]);
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'อรุณสวัสดิ์';
    if (h < 18) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

  const formatMoney = (n: number) => n.toLocaleString('th-TH') + ' BC';
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatServiceDate = (iso: string) =>
    new Date(iso).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-400 text-sm">{greeting()},</p>
        <h1 className="text-2xl font-bold text-white">{officer?.name}</h1>
        <p className="text-amber-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="เจ้าหน้าที่ปฏิบัติหน้าที่" value={onDutyCount.toString()} icon={<Users size={20} />} color="emerald" loading={loading} />
        <StatCard label="รายการค้างชำระ" value={unpaidCount.toString()} icon={<AlertCircle size={20} />} color="red" loading={loading} />
        <StatCard label="ยอดค้างชำระทั้งหมด" value={formatMoney(unpaidTotal)} icon={<DollarSign size={20} />} color="amber" loading={loading} small />
        <StatCard label="บริการวันนี้" value={todayRecords.toString()} icon={<TrendingUp size={20} />} color="blue" loading={loading} />
      </div>

      {/* On-Duty Officers Grid */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">เจ้าหน้าที่ที่กำลังปฏิบัติหน้าที่ ({onDutyOfficers.length})</h2>
        </div>
        {onDutyOfficers.length === 0 ? (
          <div className="card p-8 text-center">
            <Users size={32} className="text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">ยังไม่มีเจ้าหน้าที่ปฏิบัติหน้าที่ในขณะนี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {onDutyOfficers.map((o) => (
              <div key={o.id} className="card p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-blue-900 flex items-center justify-center flex-shrink-0">
                    {o.photo_url ? (
                      <img src={o.photo_url} alt={o.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-amber-400 font-bold text-lg">{o.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{o.name}</div>
                    <div className="text-amber-400 text-xs">{DEPARTMENT_LABELS[o.department]}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-emerald-400">กำลังปฏิบัติหน้าที่</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => showIdCard(o)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-colors text-[11px] font-medium"
                  >
                    <ImageIcon size={12} /> บัตร
                  </button>
                  <button
                    onClick={() => showIdCard(o)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors text-[11px] font-medium"
                  >
                    <Phone size={12} /> ติดต่อด่วน
                  </button>
                  {isCommissioner && (
                    <button
                      onClick={() => setForceTarget(o)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-colors text-[11px] font-medium"
                    >
                      <Power size={12} /> ออกเวร
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Announcements */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">ประกาศล่าสุด</h2>
          </div>
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-3 bg-navy-600 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-navy-600 rounded w-1/2" />
                </div>
              ))
            ) : announcements.length === 0 ? (
              <div className="card p-8 text-center text-gray-500 text-sm">ยังไม่มีประกาศ</div>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className={`card overflow-hidden ${ann.is_pinned ? 'border-amber-500/30' : ''}`}>
                  {ann.image_url && (
                    <div className="w-full bg-navy-900">
                      <img src={ann.image_url} alt={ann.title} className="w-full h-auto object-contain max-h-56" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        ann.is_pinned ? 'bg-amber-500/20' : 'bg-blue-900/40'
                      }`}>
                        {ann.is_pinned ? <Pin size={14} className="text-amber-400" /> : <FileText size={14} className="text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {ann.is_pinned && (
                            <span className="text-[9px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">ปักหมุด</span>
                          )}
                          <span className="text-xs text-gray-500">{formatDate(ann.created_at)}</span>
                        </div>
                        <div className="text-white text-sm font-medium truncate">{ann.title}</div>
                        <div className="text-gray-400 text-xs mt-0.5 whitespace-pre-wrap break-words">{ann.content}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Info + Recent Services */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-white">สถานะปัจจุบัน</h2>
            </div>
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">สถานะ</span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                  officer?.is_on_duty ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {officer?.is_on_duty ? '● ปฏิบัติหน้าที่' : '○ ไม่ได้ปฏิบัติหน้าที่'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">ตำแหน่ง</span>
                <span className="text-white text-sm">{officer?.rank === 'commissioner' ? 'หัวหน้ากรม' : officer?.rank === 'inspector' ? 'ผู้คุมสอบ' : 'พนักงาน'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Username</span>
                <span className="text-amber-400 text-sm font-mono">{officer?.username}</span>
              </div>
              <div className="pt-3 border-t border-blue-900/40 text-xs text-gray-500">
                ไปที่เมนู "ปฏิบัติการ" เพื่อลงชื่อเข้า-ออกเวร
              </div>
              {isCommissioner && (
                <div className="pt-3 border-t border-blue-900/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm flex items-center gap-1.5">
                      {loginEnabled ? <Unlock size={14} className="text-emerald-400" /> : <Lock size={14} className="text-red-400" />}
                      ระบบเข้าสู่ระบบเจ้าหน้าที่
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      loginEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {loginEnabled ? 'เปิดอยู่' : 'ปิดอยู่'}
                    </span>
                  </div>
                  <button
                    onClick={toggleLogin}
                    disabled={togglingLogin}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                      loginEnabled
                        ? 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25'
                    }`}
                  >
                    {togglingLogin ? 'กำลังบันทึก...' : loginEnabled ? 'ปิดระบบเข้าสู่ระบบ' : 'เปิดระบบเข้าสู่ระบบ'}
                  </button>
                  <p className="text-[10px] text-gray-600 mt-1.5">หัวหน้าสามารถปิด/เปิด ระบบล็อกอินได้</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Services */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-white">บริการล่าสุด</h2>
            </div>
            <div className="card p-4 space-y-2">
              {recentServices.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-3">ยังไม่มีบริการ</p>
              ) : (
                recentServices.map((rec) => (
                  <div key={rec.id} className="flex items-center gap-2 py-1.5 border-b border-blue-900/30 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{rec.service_name}</div>
                      <div className="text-gray-500 text-[10px]">{rec.officer_name} • {formatServiceDate(rec.service_date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-xs font-semibold">{rec.amount.toLocaleString('th-TH')} BC</div>
                      <Badge variant={rec.status === 'paid' ? 'success' : 'danger'}>
                        {rec.status === 'paid' ? 'ชำระ' : 'ค้าง'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ID Card Modal */}
      {idCardOfficer && (
        <Modal title="บัตรประจำตัวดิจิทัลเจ้าหน้าที่" onClose={() => setIdCardOfficer(null)} size="sm">
          <div className="flex justify-center">
            <IdCard
              officer={idCardOfficer.officer}
              clockInTime={idCardOfficer.clockIn}
              showActions
              onForceCheckout={(o) => { setIdCardOfficer(null); setForceTarget(o); }}
              onContact={() => setIdCardOfficer(null)}
            />
          </div>
        </Modal>
      )}

      {/* Force Checkout Confirm */}
      {forceTarget && (
        <ConfirmDialog
          title="บังคับออกเวร"
          message={`ต้องการสั่งให้ "${forceTarget.name}" ออกจากเวรทันทีใช่หรือไม่? ระบบจะบันทึกว่าหัวหน้าเป็นคนสั่งออก`}
          confirmLabel="บังคับออกเวร"
          danger
          onConfirm={handleForceCheckout}
          onCancel={() => setForceTarget(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  label, value, icon, color, loading, small,
}: {
  label: string; value: string; icon: ReactNode; color: string; loading: boolean; small?: boolean;
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return (
    <div className="card p-5">
      {loading ? (
        <div className="animate-pulse">
          <div className="h-3 bg-navy-600 rounded w-3/4 mb-3" />
          <div className="h-7 bg-navy-600 rounded w-1/2" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs">{label}</span>
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colors[color]}`}>{icon}</div>
          </div>
          <div className={`font-bold text-white ${small ? 'text-base' : 'text-2xl'}`}>{value}</div>
        </>
      )}
    </div>
  );
}
