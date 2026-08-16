import { useEffect, useState } from 'react';
import {
  Clock, LogIn, LogOut, Users, Trash2, Power, AlertCircle, Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DutyLog, Officer, SystemSettings, DEPARTMENT_LABELS } from '../../lib/types';
import { useAuth } from '../../lib/AuthContext';
import { Badge } from '../../components/Badge';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { IdCard } from '../../components/IdCard';

export function OperationsPage() {
  const { officer, setOfficer, isCommissioner } = useAuth();
  const [onDutyOfficers, setOnDutyOfficers] = useState<Officer[]>([]);
  const [dutyLogs, setDutyLogs] = useState<DutyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DutyLog | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [forceTarget, setForceTarget] = useState<Officer | null>(null);
  const [idCardOfficer, setIdCardOfficer] = useState<{ officer: Officer; clockIn: string | null } | null>(null);

  useEffect(() => {
    fetchData();
  }, [officer?.id]);

  async function fetchData() {
    setLoading(true);
    const [duty, logs, settingsRes] = await Promise.all([
      supabase.from('officers').select('*').eq('is_on_duty', true).eq('status', 'active').order('name'),
      isCommissioner
        ? supabase.from('duty_logs').select('*').is('deleted_at', null).order('clock_in', { ascending: false }).limit(50)
        : supabase.from('duty_logs').select('*').eq('officer_id', officer?.id).is('deleted_at', null).order('clock_in', { ascending: false }).limit(30),
      supabase.from('system_settings').select('*').eq('id', 1).maybeSingle(),
    ]);
    setOnDutyOfficers(duty.data ?? []);
    setDutyLogs(logs.data ?? []);
    setSettings(settingsRes.data as SystemSettings | null);
    setLoading(false);
  }

  async function toggleDutySystem() {
    if (!officer || !settings) return;
    const newValue = !settings.duty_system_enabled;
    setSettings({ ...settings, duty_system_enabled: newValue });
    await supabase.from('system_settings').update({
      duty_system_enabled: newValue,
      updated_at: new Date().toISOString(),
      updated_by: officer.id,
      updated_by_name: officer.name,
    }).eq('id', 1);
    await supabase.from('audit_logs').insert({
      action: newValue ? 'ENABLE_DUTY_SYSTEM' : 'DISABLE_DUTY_SYSTEM',
      target_type: 'system',
      performed_by: officer.id,
      performed_by_name: officer.name,
      details: {},
    });
  }

  async function clockIn() {
    if (!officer || officer.is_on_duty) return;
    setClockLoading(true);
    const { error: logErr } = await supabase.from('duty_logs').insert({
      officer_id: officer.id,
      officer_name: officer.name,
      clock_in: new Date().toISOString(),
      checkout_method: 'self',
    });
    if (!logErr) {
      await supabase.from('officers').update({ is_on_duty: true, updated_at: new Date().toISOString() }).eq('id', officer.id);
      setOfficer({ ...officer, is_on_duty: true });
      await fetchData();
    }
    setClockLoading(false);
  }

  async function clockOut() {
    if (!officer || !officer.is_on_duty) return;
    setClockLoading(true);
    const { data: activeLog } = await supabase
      .from('duty_logs')
      .select('*')
      .eq('officer_id', officer.id)
      .is('clock_out', null)
      .is('deleted_at', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeLog) {
      const now = new Date();
      const dur = Math.round((now.getTime() - new Date(activeLog.clock_in).getTime()) / 60000);
      await supabase.from('duty_logs').update({
        clock_out: now.toISOString(),
        duration_minutes: dur,
        checkout_method: 'self',
      }).eq('id', activeLog.id);
    }
    await supabase.from('officers').update({ is_on_duty: false, updated_at: new Date().toISOString() }).eq('id', officer.id);
    setOfficer({ ...officer, is_on_duty: false });
    await fetchData();
    setClockLoading(false);
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
      details: { target_name: forceTarget.name, method: 'force_checkout' },
    });

    setForceTarget(null);
    await fetchData();
  }

  async function handleDelete() {
    if (!deleteTarget || !officer) return;
    await supabase.from('duty_logs').update({
      deleted_at: new Date().toISOString(),
      deleted_by: officer.id,
      deleted_by_name: officer.name,
      delete_reason: deleteReason || 'ไม่ระบุเหตุผล',
    }).eq('id', deleteTarget.id);

    await supabase.from('audit_logs').insert({
      action: 'DELETE_DUTY_LOG',
      target_type: 'duty_log',
      target_id: deleteTarget.id,
      performed_by: officer.id,
      performed_by_name: officer.name,
      details: { officer_name: deleteTarget.officer_name, reason: deleteReason },
    });

    setDeleteTarget(null);
    setDeleteReason('');
    await fetchData();
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

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatDuration = (mins: number | null) => {
    if (!mins) return '-';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}ชม. ${m}น.` : `${m}น.`;
  };

  const dutyEnabled = true;

  return (
    <div>
      <div className="mb-6">
        <h1 className="section-title">ปฏิบัติการ</h1>
        <p className="section-subtitle">จัดการการเข้า-ออกเวรและสถานะการปฏิบัติหน้าที่</p>
      </div>

      {/* Commissioner Duty System Toggle — prominent */}
      {isCommissioner && (
        <div className={`card p-5 mb-6 border-2 ${dutyEnabled ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                dutyEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
              }`}>
                <Power size={22} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">ระบบเข้าเวร</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {dutyEnabled ? 'เปิดใช้งาน — เจ้าหน้าที่สามารถลงชื่อเข้าเวรได้' : 'ปิดชั่วคราว — เจ้าหน้าที่ไม่สามารถเข้าเวรได้'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDutySystem}
              className={`relative w-16 h-8 rounded-full transition-colors flex-shrink-0 ${dutyEnabled ? 'bg-emerald-500' : 'bg-red-500'}`}
            >
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform ${dutyEnabled ? 'translate-x-8' : ''}`} />
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Clock In/Out Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Clock size={16} className="text-amber-400" /> การปฏิบัติหน้าที่ของฉัน
            </h2>
            <div className={`rounded-xl p-4 mb-4 text-center ${
              officer?.is_on_duty ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-navy-700 border border-blue-900/40'
            }`}>
              <div className={`text-lg font-bold mb-1 ${officer?.is_on_duty ? 'text-emerald-400' : 'text-gray-400'}`}>
                {officer?.is_on_duty ? '● กำลังปฏิบัติหน้าที่' : '○ ไม่ได้ปฏิบัติหน้าที่'}
              </div>
            </div>

            {/* Duty system disabled warning */}
            {!dutyEnabled && !officer?.is_on_duty && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-center gap-2.5">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-xs font-medium">ระบบปิดรับเวรชั่วคราว</span>
              </div>
            )}

            {!officer?.is_on_duty ? (
              <button
                onClick={clockIn}
                disabled={clockLoading || !dutyEnabled}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <LogIn size={16} /> {clockLoading ? 'กำลังดำเนินการ...' : 'ลงชื่อเข้าเวร'}
              </button>
            ) : (
              <button onClick={clockOut} disabled={clockLoading} className="w-full btn-danger py-3 flex items-center justify-center gap-2">
                <LogOut size={16} /> {clockLoading ? 'กำลังดำเนินการ...' : 'ลงชื่อออกเวร'}
              </button>
            )}

            {officer?.is_on_duty && (
              <button
                onClick={() => showIdCard(officer)}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-colors text-sm font-medium"
              >
                <ImageIcon size={16} /> ดูบัตรประจำตัว
              </button>
            )}
          </div>

          {/* On-Duty Officers */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Users size={16} className="text-emerald-400" />
              เจ้าหน้าที่ที่ปฏิบัติหน้าที่ ({onDutyOfficers.length})
            </h2>
            {onDutyOfficers.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-4">ยังไม่มีเจ้าหน้าที่ปฏิบัติหน้าที่</p>
            ) : (
              <div className="space-y-2">
                {onDutyOfficers.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => showIdCard(o)}
                    className="w-full flex items-center gap-2.5 py-1.5 rounded-lg hover:bg-navy-700 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-blue-900 flex items-center justify-center flex-shrink-0">
                      {o.photo_url ? (
                        <img src={o.photo_url} alt={o.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-amber-400 font-bold text-xs">{o.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{o.name}</div>
                      <div className="text-gray-500 text-[10px]">{DEPARTMENT_LABELS[o.department]}</div>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-blue-900/40">
              <h2 className="text-sm font-semibold text-white">
                {isCommissioner ? 'ประวัติการปฏิบัติหน้าที่ทั้งหมด' : 'ประวัติของฉัน'}
              </h2>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500 text-sm">กำลังโหลด...</div>
              ) : dutyLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock size={32} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">ยังไม่มีประวัติ</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-blue-900/40">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">เจ้าหน้าที่</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">เข้าเวร</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ออกเวร</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ระยะเวลา</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                      {isCommissioner && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {dutyLogs.map((log) => (
                      <tr key={log.id} className="table-row">
                        <td className="px-4 py-3 text-sm text-white font-medium">
                          {log.officer_name}
                          {log.checkout_method === 'forced' && (
                            <span className="ml-2 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">บังคับออก</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{formatTime(log.clock_in)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{log.clock_out ? formatTime(log.clock_out) : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{formatDuration(log.duration_minutes)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={log.clock_out ? 'neutral' : 'success'}>
                            {log.clock_out ? 'เสร็จสิ้น' : 'กำลังปฏิบัติ'}
                          </Badge>
                        </td>
                        {isCommissioner && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setDeleteTarget(log)}
                              className="text-gray-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            />
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="ลบประวัติการปฏิบัติหน้าที่"
          message={`ต้องการลบประวัติของ "${deleteTarget.officer_name}" ใช่หรือไม่?`}
          confirmLabel="ลบ"
          danger
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteReason(''); }}
          extraField={{ label: 'เหตุผลในการลบ', value: deleteReason, onChange: setDeleteReason, placeholder: 'ระบุเหตุผล...' }}
        />
      )}

      {/* Force Checkout Confirm */}
      {forceTarget && (
        <ConfirmDialog
          title="บังคับออกเวร"
          message={`ต้องการสั่งให้ "${forceTarget.name}" ออกจากเวรทันทีใช่หรือไม่? ระบบจะบันทึกประวัติว่าหัวหน้าเป็นคนสั่งออก`}
          confirmLabel="บังคับออกเวร"
          danger
          onConfirm={handleForceCheckout}
          onCancel={() => setForceTarget(null)}
        />
      )}
    </div>
  );
}
