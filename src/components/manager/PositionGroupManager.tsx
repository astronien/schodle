import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Tag, Users, UserMinus } from 'lucide-react';
import { useToast } from '../../lib/toast';
import { AdminPageHeader } from './AdminSidebar';
import { ConfirmModal } from '../ConfirmModal';
import { cn } from '../../lib/utils';
import { getDiceBearAvatar } from '../../lib/validators';
import type { Employee, PositionGroup } from '../../types';

interface PositionGroupManagerProps {
  groups: PositionGroup[];
  employees: Employee[];
  createGroup: (group: Omit<PositionGroup, 'id'>) => Promise<void>;
  updateGroup: (group: PositionGroup) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
}

export function PositionGroupManager({
  groups,
  employees,
  createGroup,
  updateGroup,
  deleteGroup,
  updateEmployee,
}: PositionGroupManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<PositionGroup | null>(null);

  const toast = useToast();
  const showError = (err: unknown, fallback: string) =>
    toast.error(fallback, err instanceof Error ? err.message : undefined);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createGroup({ name: newName });
      toast.success('สร้างกลุ่มสำเร็จ', newName);
      setNewName('');
      setIsAdding(false);
    } catch (err: unknown) {
      showError(err, 'สร้างกลุ่มไม่สำเร็จ');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateGroup({ id, name: editName });
      toast.success('อัปเดตกลุ่มสำเร็จ', editName);
      setEditingId(null);
    } catch (err: unknown) {
      showError(err, 'อัปเดตกลุ่มไม่สำเร็จ');
    }
  };

  const toggleEmployeeGroup = async (emp: Employee, groupId: string | undefined) => {
    try {
      await updateEmployee({ ...emp, groupId });
    } catch (err: unknown) {
      showError(err, 'อัปเดตพนักงานไม่สำเร็จ');
    }
  };

  const getMemberCount = (groupId: string) =>
    employees.filter((e) => e.groupId === groupId).length;

  return (
    <div className="animate-fade-in space-y-6">
      <AdminPageHeader
        icon={Tag}
        title="กลุ่มตำแหน่ง"
        description={`${groups.length} กลุ่ม · ช่วยให้ AI จัดตารางงานได้อย่างสมดุล`}
        actions={
          !isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="btn btn-primary text-xs py-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              เพิ่มกลุ่ม
            </button>
          )
        }
      />

      {/* Section A: Group list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-4 bg-brand rounded-full" />
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            รายชื่อกลุ่ม
          </h4>
        </div>

        {isAdding && (
          <div className="glass-cell rounded-2xl p-3 mb-3 flex items-center gap-2 animate-slide-down">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewName('');
                }
              }}
              placeholder="ชื่อกลุ่ม เช่น กะเช้า A"
              className="input-field flex-1"
            />
            <button
              onClick={handleCreate}
              className="p-2.5 text-white bg-brand rounded-lg hover:bg-brand-hover"
              aria-label="บันทึก"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewName('');
              }}
              className="p-2.5 text-text-tertiary bg-bg-surface rounded-lg border border-border-solid"
              aria-label="ยกเลิก"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {groups.length === 0 && !isAdding ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 bg-bg-surface rounded-full flex items-center justify-center mx-auto mb-2 text-text-quaternary">
              <Tag className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-text-primary mb-1">ยังไม่มีกลุ่ม</h4>
            <p className="text-xs text-text-tertiary">กดปุ่ม "เพิ่มกลุ่ม" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {groups.map((group) => {
              const count = getMemberCount(group.id);
              const isEditing = editingId === group.id;
              return (
                <div
                  key={group.id}
                  className="glass-cell rounded-2xl p-3.5 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-brand" />
                  </div>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(group.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="input-field flex-1 py-1.5 px-3 text-sm"
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {group.name}
                      </p>
                      <p className="text-[10px] text-text-tertiary font-semibold flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3" />
                        {count} คน
                      </p>
                    </div>
                  )}
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleUpdate(group.id)}
                        className="p-2 text-white bg-brand rounded-lg hover:bg-brand-hover"
                        aria-label="บันทึก"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 text-text-tertiary bg-bg-surface rounded-lg border border-border-solid"
                        aria-label="ยกเลิก"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(group.id);
                          setEditName(group.name);
                        }}
                        className="p-2 text-text-tertiary hover:text-text-primary hover:bg-white/60 rounded-lg"
                        aria-label="แก้ไข"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(group)}
                        className="p-2 text-danger bg-danger/10 hover:bg-danger/15 rounded-lg"
                        aria-label="ลบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section B: Member assignment */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-4 bg-warn rounded-full" />
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            กำหนดสมาชิก ({employees.length} คน)
          </h4>
        </div>

        {employees.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-text-tertiary">ยังไม่มีพนักงานในระบบ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {employees.map((emp) => {
              const currentGroup = groups.find((g) => g.id === emp.groupId);
              return (
                <div
                  key={emp.id}
                  className="glass-cell rounded-2xl p-3 flex items-center gap-2.5"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-bg-surface border border-border-solid shrink-0">
                    <img
                      src={emp.avatar || getDiceBearAvatar(emp.fullName)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-text-primary truncate">
                      {emp.fullName}
                    </p>
                    {currentGroup ? (
                      <p className="text-[10px] font-semibold text-brand-accent mt-0.5 truncate">
                        <Tag className="w-2.5 h-2.5 inline mr-0.5" />
                        {currentGroup.name}
                      </p>
                    ) : (
                      <p className="text-[10px] font-semibold text-text-quaternary mt-0.5">
                        ยังไม่ได้กำหนดกลุ่ม
                      </p>
                    )}
                  </div>
                  <select
                    value={emp.groupId || ''}
                    onChange={(e) =>
                      toggleEmployeeGroup(emp, e.target.value || undefined)
                    }
                    className={cn(
                      'text-[10px] font-semibold px-2 py-1.5 rounded-md border bg-white/60 text-text-secondary border-border-solid focus:outline-none focus:border-brand',
                      'appearance-none cursor-pointer max-w-[90px] truncate',
                    )}
                  >
                    <option value="">ไม่มีกลุ่ม</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  {emp.groupId && (
                    <button
                      onClick={() => toggleEmployeeGroup(emp, undefined)}
                      className="p-1.5 text-text-tertiary hover:text-warn hover:bg-warn/10 rounded-md"
                      aria-label="ล้างกลุ่ม"
                      title="ล้างกลุ่ม"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(deleteConfirm)}
        title="ลบกลุ่ม"
        message={`ลบกลุ่ม "${deleteConfirm?.name || ''}" ? พนักงานในกลุ่มจะถูกยกเลิกกลุ่ม`}
        confirmLabel="ลบ"
        variant="danger"
        onConfirm={async () => {
          if (!deleteConfirm) return;
          const group = deleteConfirm;
          try {
            await deleteGroup(group.id);
            toast.success('ลบกลุ่มสำเร็จ', group.name);
            const members = employees.filter((e) => e.groupId === group.id);
            const results = await Promise.allSettled(
              members.map((e) => updateEmployee({ ...e, groupId: undefined })),
            );
            const failed = results.filter((r) => r.status === 'rejected').length;
            if (failed > 0) toast.error(`ยกเลิกกลุ่มไม่สำเร็จ ${failed} คน`);
          } catch (err: unknown) {
            showError(err, 'ลบกลุ่มไม่สำเร็จ');
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
