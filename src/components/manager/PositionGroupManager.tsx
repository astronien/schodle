import { useState } from 'react';
import type { PositionGroup, Employee } from '../../types/index';


import { Plus, Trash2, Edit2, Users, Save, X } from 'lucide-react';

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

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createGroup({ name: newName });
      setNewName('');
      setIsAdding(false);
    } catch (err) {
      alert('Failed to create group');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateGroup({ id, name: editName });
      setEditingId(null);
    } catch (err) {
      alert('Failed to update group');
    }
  };

  const toggleEmployeeGroup = async (emp: Employee, groupId: string | undefined) => {
    try {
      await updateEmployee({ ...emp, groupId });
    } catch (err) {
      alert('Failed to update employee group');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">กลุ่มตำแหน่ง (Position Groups)</h2>
          <p className="text-sm text-slate-500">จัดการกลุ่มตำแหน่งเพื่อช่วยให้ AI จัดตารางงานได้อย่างสมดุล</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          เพิ่มกลุ่มใหม่
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-end animate-in zoom-in-95 duration-200">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-slate-700">ชื่อกลุ่ม</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="เช่น กลุ่ม Manager, กลุ่ม Cashier"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              บันทึก
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              {editingId === group.id ? (
                <div className="flex gap-2 flex-1 mr-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-indigo-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(group.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Save size={18} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-slate-800">{group.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingId(group.id);
                        setEditName(group.name);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่มนี้?')) {
                          deleteGroup(group.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 flex-1 overflow-y-auto max-h-[300px]">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-600">
                <Users size={16} />
                พนักงานในกลุ่ม ({employees.filter(e => e.groupId === group.id).length})
              </div>
              <div className="space-y-2">
                {employees.filter(e => e.groupId === group.id).map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-sm text-slate-700">{emp.fullName}</span>
                    <button
                      onClick={() => toggleEmployeeGroup(emp, undefined)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      นำออก
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">เพิ่มพนักงานเข้ากลุ่ม</label>
              <select
                className="w-full text-sm border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => {
                  const empId = e.target.value;
                  if (!empId) return;
                  const emp = employees.find(x => x.id === empId);
                  if (emp) toggleEmployeeGroup(emp, group.id);
                  e.target.value = '';
                }}
              >
                <option value="">-- เลือกพนักงาน --</option>
                {employees
                  .filter(e => e.groupId !== group.id)
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} {emp.groupId ? '(ย้ายกลุ่ม)' : ''}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">ยังไม่มีกลุ่มตำแหน่ง</p>
            <p className="text-sm text-slate-400 mt-1">กดปุ่ม "เพิ่มกลุ่มใหม่" เพื่อเริ่มสร้างกลุ่ม</p>
          </div>
        )}
      </div>
    </div>
  );
}
