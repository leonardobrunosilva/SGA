import React, { useState, useEffect } from 'react';

export interface FieldConfig {
    name: string;
    label: string;
    type?: 'text' | 'select' | 'textarea' | 'date';
    options?: string[];
    readOnly?: boolean;
}

interface EditModalProps {
    isOpen: boolean;
    title: string;
    data: any;
    fields: FieldConfig[];
    onClose: () => void;
    onSave: (updatedData: any) => void;
}

const EditModal: React.FC<EditModalProps> = ({ isOpen, title, data, fields, onClose, onSave }) => {
    const [formData, setFormData] = useState<any>(data || {});

    useEffect(() => {
        if (isOpen && data) {
            setFormData({ ...data });
        }
    }, [isOpen, data]);

    if (!isOpen) return null;

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-black text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="flex flex-col gap-4">
                        {fields.map((field) => (
                            <div key={field.name} className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">{field.label}</label>
                                {field.type === 'select' ? (
                                    <select
                                        value={formData[field.name] || ''}
                                        disabled={field.readOnly}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        {field.options?.map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt}
                                            </option>
                                        ))}
                                    </select>
                                ) : field.type === 'textarea' ? (
                                    <textarea
                                        value={formData[field.name] || ''}
                                        disabled={field.readOnly}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-100 disabled:text-gray-400 resize-none"
                                    />
                                ) : (
                                    <input
                                        type={field.type || 'text'}
                                        value={formData[field.name] || ''}
                                        disabled={field.readOnly}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-100 disabled:text-gray-400 font-medium text-slate-800"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditModal;
