import { useState } from 'react';
import { Plus } from 'lucide-react';

/**
 * A select dropdown that shows existing options + "Add as new" at the bottom.
 * When "Add as new" is clicked, it switches to a text input to type a new value.
 *
 * Props:
 *  - value: current selected value
 *  - options: array of strings
 *  - onChange: (newValue) => void
 *  - onAddNew: (newOption) => void — called when a new option is confirmed
 *  - placeholder: placeholder text
 *  - label: field label
 */
export default function SelectWithAdd({ value, options, onChange, onAddNew, placeholder = 'Select...', label }) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    onAddNew(trimmed);
    onChange(trimmed);
    setNewValue('');
    setAdding(false);
  };

  if (adding) {
    return (
      <div>
        {label && <label className="block text-xs text-textSecondary mb-1.5">{label}</label>}
        <div className="flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={`Enter new ${(label || placeholder).toLowerCase()}...`}
            autoFocus
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-2 text-xs bg-primary/10 border border-primary/30 rounded-md text-primary hover:bg-primary/20 transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewValue(''); }}
            className="px-3 py-2 text-xs bg-surface border border-border rounded-md text-textSecondary hover:text-textPrimary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && <label className="block text-xs text-textSecondary mb-1.5">{label}</label>}
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === '__add_new__') {
              setAdding(true);
            } else {
              onChange(e.target.value);
            }
          }}
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <option value="__add_new__">+ Add as new</option>
        </select>
      </div>
    </div>
  );
}
