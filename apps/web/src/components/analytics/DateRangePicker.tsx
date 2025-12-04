'use client';

/**
 * DateRangePicker Component
 * 日付範囲選択コンポーネント
 */
import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface PresetRange {
  label: string;
  getValue: () => DateRange;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: PresetRange[];
  placeholder?: string;
  disabled?: boolean;
}

const defaultPresets: PresetRange[] = [
  {
    label: '今日',
    getValue: () => {
      const today = new Date();
      return { start: today, end: today };
    },
  },
  {
    label: '今週',
    getValue: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { start, end: today };
    },
  },
  {
    label: '今月',
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end: today };
    },
  },
  {
    label: '先月',
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start, end };
    },
  },
  {
    label: '過去30日',
    getValue: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      return { start, end: today };
    },
  },
  {
    label: '過去90日',
    getValue: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 90);
      return { start, end: today };
    },
  },
];

export function DateRangePicker({
  value,
  onChange,
  presets = defaultPresets,
  placeholder = '期間を選択',
  disabled = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value.start || new Date());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isInRange = (date: Date) => {
    if (!value.start || !value.end) return false;
    return date >= value.start && date <= value.end;
  };

  const isSelected = (date: Date) => {
    if (value.start && date.toDateString() === value.start.toDateString()) return true;
    if (value.end && date.toDateString() === value.end.toDateString()) return true;
    return false;
  };

  const handleDateClick = (date: Date) => {
    if (selecting === 'start') {
      onChange({ start: date, end: null });
      setSelecting('end');
    } else {
      if (value.start && date < value.start) {
        onChange({ start: date, end: value.start });
      } else {
        onChange({ start: value.start, end: date });
      }
      setSelecting('start');
      setIsOpen(false);
    }
  };

  const handlePresetClick = (preset: PresetRange) => {
    onChange(preset.getValue());
    setIsOpen(false);
    setSelecting('start');
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(viewDate);
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 min-w-[200px]"
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        {value.start && value.end ? (
          <span>
            {formatDate(value.start)} - {formatDate(value.end)}
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        {value.start && (
          <X
            className="w-4 h-4 ml-auto text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ start: null, end: null });
              setSelecting('start');
            }}
          />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20 flex">
            {/* Presets */}
            <div className="w-40 border-r border-gray-200 p-2">
              <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                クイック選択
              </p>
              {presets.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handlePresetClick(preset)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevMonth}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-900">
                  {formatMonth(viewDate)}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Week days */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-500"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, i) => (
                  <div key={i}>
                    {date ? (
                      <button
                        onClick={() => handleDateClick(date)}
                        className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg transition-colors ${
                          isSelected(date)
                            ? 'bg-indigo-600 text-white'
                            : isInRange(date)
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                  </div>
                ))}
              </div>

              {/* Selection hint */}
              <div className="mt-4 text-xs text-gray-500 text-center">
                {selecting === 'start' ? '開始日を選択' : '終了日を選択'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DateRangePicker;
