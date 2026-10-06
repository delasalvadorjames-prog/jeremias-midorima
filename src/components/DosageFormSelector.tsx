import React, { useState, useEffect } from 'react';

type Props = {
  selectedForm: string;
  onFormChange: (form: string) => void;
  selectedClassification: string;
  onClassificationChange: (classification: string) => void;
  strength: string;
  onStrengthChange: (strength: string) => void;
  volume: string;
  onVolumeChange: (volume: string) => void;
  medicineName?: string;
  onUnitTypeChange?: (unitType: string) => void;
};

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injectable', 'Cream', 'Ointment', 'Drops', 'Other'];
const CLASSIFICATIONS = ['Generic', 'Branded'];

const DOSAGE_PRESETS: Record<string, string[]> = {
  'Tablet': ['100mg', '200mg', '250mg', '500mg', '650mg', '1g'],
  'Capsule': ['100mg', '200mg', '250mg', '500mg', '650mg', '1g'],
  'Syrup': ['30mL', '60mL', '120mL', '250mL', '125mg/5mL', '250mg/5mL'],
  'Suspension': ['30mL', '60mL', '120mL', '250mL', '125mg/5mL', '250mg/5mL'],
  'Injectable': ['1mL', '2mL', '5mL', '10mL'],
  'Cream': ['5g', '10g', '15g', '30g'],
  'Ointment': ['5g', '10g', '15g', '30g'],
  'Drops': ['5mL', '10mL', '15mL'],
};

const UNIT_TYPE_DEFAULTS: Record<string, string> = {
  'Tablet': 'pcs',
  'Capsule': 'pcs',
  'Syrup': 'bottle',
  'Suspension': 'bottle',
  'Injectable': 'vial',
  'Cream': 'tube',
  'Ointment': 'tube',
  'Drops': 'bottle',
  'Other': 'units',
};

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const FIELD_LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500';

export default function DosageFormSelector({
  selectedForm,
  onFormChange,
  selectedClassification,
  onClassificationChange,
  strength,
  onStrengthChange,
  volume,
  onVolumeChange,
  medicineName = '',
  onUnitTypeChange,
}: Props) {
  const [useCustomDosage, setUseCustomDosage] = useState(false);

  // Auto-set unit type when form changes
  useEffect(() => {
    if (selectedForm && onUnitTypeChange) {
      onUnitTypeChange(UNIT_TYPE_DEFAULTS[selectedForm] || 'units');
    }
  }, [selectedForm, onUnitTypeChange]);

  // Reset custom dosage when form changes
  useEffect(() => {
    setUseCustomDosage(false);
  }, [selectedForm]);

  const getPresets = () => DOSAGE_PRESETS[selectedForm] || [];
  const showPresets = selectedForm && DOSAGE_PRESETS[selectedForm];
  const isTabletOrCapsule = selectedForm === 'Tablet' || selectedForm === 'Capsule';
  const isSyrupOrSuspension = selectedForm === 'Syrup' || selectedForm === 'Suspension';

  const handlePresetSelect = (preset: string) => {
    setUseCustomDosage(false);
    if (isTabletOrCapsule || selectedForm === 'Injectable' || selectedForm === 'Cream' || selectedForm === 'Ointment') {
      onStrengthChange(preset);
      onVolumeChange('');
    } else if (isSyrupOrSuspension || selectedForm === 'Drops') {
      onVolumeChange(preset);
      onStrengthChange('');
    }
  };

  const generateDisplayName = () => {
    const parts = [medicineName];
    if (strength) parts.push(strength);
    if (volume && !isSyrupOrSuspension && selectedForm !== 'Drops') parts.push(volume);
    if (selectedForm) parts.push(selectedForm);
    return parts.filter(Boolean).join(' - ');
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-4">
      {/* Select Medicine Form Section */}
      <div>
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Select Medicine Form</p>
          <h5 className="mt-0.5 text-base font-semibold text-slate-900">Choose the dosage form</h5>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {DOSAGE_FORMS.map((form) => (
            <button
              key={form}
              type="button"
              onClick={() => {
                onFormChange(form);
                onStrengthChange('');
                onVolumeChange('');
              }}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                selectedForm === form
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {form}
            </button>
          ))}
        </div>
      </div>

      {/* Medicine Classification Section */}
      {selectedForm && (
        <div>
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">Medicine Classification</p>
            <h5 className="mt-0.5 text-base font-semibold text-slate-900">Select medicine type</h5>
          </div>

          <div className="flex gap-2">
            {CLASSIFICATIONS.map((classification) => (
              <button
                key={classification}
                type="button"
                onClick={() => onClassificationChange(classification)}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                  selectedClassification === classification
                    ? 'border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-200'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {classification}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Dosage Selection */}
      {selectedForm && showPresets && !useCustomDosage && (
        <div>
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700">Select Dosage / Strength</p>
            <h5 className="mt-0.5 text-base font-semibold text-slate-900">
              {isTabletOrCapsule ? 'Choose strength' : isSyrupOrSuspension || selectedForm === 'Drops' ? 'Choose volume' : 'Choose size'}
            </h5>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {getPresets().map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                  (isTabletOrCapsule || selectedForm === 'Injectable' || selectedForm === 'Cream' || selectedForm === 'Ointment') && strength === preset
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : (isSyrupOrSuspension || selectedForm === 'Drops') && volume === preset
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {preset}
              </button>
            ))}

            {/* Custom Option */}
            <button
              type="button"
              onClick={() => setUseCustomDosage(true)}
              className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-95"
            >
              Custom
            </button>
          </div>
        </div>
      )}

      {/* Custom Dosage Input */}
      {selectedForm && useCustomDosage && (
        <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">Custom Dosage / Strength</p>
            <h5 className="mt-0.5 text-base font-semibold text-slate-900">Enter custom specifications</h5>
          </div>

          <label className="grid gap-1">
            <span className={FIELD_LABEL_CLASS}>
              {isTabletOrCapsule || selectedForm === 'Injectable' || selectedForm === 'Cream' || selectedForm === 'Ointment'
                ? 'Strength / Concentration'
                : isSyrupOrSuspension || selectedForm === 'Drops'
                ? 'Volume / Size'
                : 'Custom Specification'}
            </span>
            <input
              type="text"
              className={INPUT_CLASS}
              placeholder={
                isTabletOrCapsule
                  ? 'e.g., 500mg'
                  : selectedForm === 'Injectable'
                  ? 'e.g., 100mg/mL'
                  : isSyrupOrSuspension || selectedForm === 'Drops'
                  ? 'e.g., 120mL'
                  : 'e.g., 25g'
              }
              value={isTabletOrCapsule || selectedForm === 'Injectable' || selectedForm === 'Cream' || selectedForm === 'Ointment' ? strength : volume}
              onChange={(e) => {
                if (isTabletOrCapsule || selectedForm === 'Injectable' || selectedForm === 'Cream' || selectedForm === 'Ointment') {
                  onStrengthChange(e.target.value);
                } else {
                  onVolumeChange(e.target.value);
                }
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => setUseCustomDosage(false)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Back to Presets
          </button>
        </div>
      )}

      {/* Display Name Preview */}
      {selectedForm && (strength || volume) && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Generated Display Name</p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {generateDisplayName() || `[Medicine Name] - ${strength || volume} ${selectedForm}`}
          </p>
          <p className="mt-2 text-[10px] text-slate-600">
            Format: <span className="font-mono">[Medicine Name] - [Strength/Volume] [Form]</span>
          </p>
          <p className="mt-1 text-[9px] text-slate-500">Example: Paracetamol - 500mg Tablet</p>
        </div>
      )}

      {!selectedForm && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-600">Select a medicine form to begin</p>
        </div>
      )}
    </section>
  );
}
