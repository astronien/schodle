import { useState } from 'react';
import { Plus, Trash2, Edit2, Users, Save, X } from 'lucide-react';
import { useToast } from '../../lib/toast';
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">กลุ่มตำแหน่ง (Position Groups)</h2>
          <p className="text-sm text-text-tertiary">
            จัดการกลุ่มตำแหน่งเพื่อช่วยให้ AI จัดตารางงานได้อย่างสมดุล
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn btn-primary text-xs py-2 shadow-raised"
        >
          <Plus className="w-4 h-4" />
          เพิ่มกลุ่มใหม่
        </button>
      </div>

      {isAdding && (
        <div className="card p-4 rounded-xl flex gap-4 items-end animate-fade-in">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-text-tertiary">ชื่อกลุ่ม</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="เช่น กลุ่ม Manager, กลุ่ม Cashier"
              className="w-full input"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="btn btn-ghost text-xs"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleCreate}
              className="btn btn-primary text-xs"
            >
              บันทึก
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => {
          const members = employees.filter((e) => e.groupId === group.id);
          return (
            <div key={group.id} className="card rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
                {editingId === group.id ? (
                  <div className="flex gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 input"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdate(group.id)}
                      className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 text-text-quaternary hover:bg-white/[0.05] rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-text-primary">{group.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingId(group.id);
                          setEditName(group.name);
                        }}
                        className="p-1.5 text-text-quaternary hover:text-brand-accent hover:bg-brand/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่มนี้?')) {
                            deleteGroup(group.id)
                              .then(() => toast.success('ลบกลุ่มสำเร็จ', group.name))
                              .catch((err: unknown) => showError(err, 'ลบกลุ่มไม่สำเร็จ'));
                          }
                        }}
                        className="p-1.5 text-text-quaternary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 flex-1 overflow-y-auto max-h-[300px]">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-text-tertiary">
                  <Users className="w-4 h-4" />
                  พนักงานในกลุ่ม ({members.length})
                </div>
                <div className="space-y-2">
                  {members.length === 0 && (
                    <div className="text-center py-6 text-xs text-text-quaternary">
                      ยังไม่มีสมาชิก
                    </div>
                  )}
                  {members.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between p-2 bg-bg-panel rounded-lg border border-white/[0.04]"
                    >
                      <span className="text-sm text-text-primary">{emp.fullName}</span>
                      <button
                        onClick={() => toggleEmployeeGroup(emp, undefined)}
                        className="text-xs text-danger hover:underline"
                      >
                        นำออก
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-white/[0.04] bg-bg-panel/30">
                <label className="block text-[10px] font-bold text-text-quaternary uppercase tracking-wider mb-2">
                  เพิ่มพนักงานเข้ากลุ่ม
                </label>
                <select
                  className="w-full input"
                  onChange={(e) => {
                    const empId = e.target.value;
                    if (!empId) return;
                    const emp = employees.find((x) => x.id === empId);
                    if (emp) toggleEmployeeGroup(emp, group.id);
                    e.target.value = '';
                  }}
                >
                  <option value="">-- เลือกพนักงาน --</option>
                  {employees
                    .filter((e) => e.groupId !== group.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} {emp.groupId ? '(ย้ายกลุ่ม)' : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="col-span-full py-12 text-center card border-2 border-dashed border-white/[0.08]">
            <Users className="mx-auto text-text-quaternary mb-4 w-12 h-12" />
            <p className="text-text-tertiary font-medium">ยังไม่มีกลุ่มตำแหน่ง</p>
            <p className="text-sm text-text-quaternary mt-1">กดปุ่ม "เพิ่มกลุ่มใหม่" เพื่อเริ่มสร้างกลุ่ม</p>
          </div>
        )}
      </div>
    </div>
  );
}
