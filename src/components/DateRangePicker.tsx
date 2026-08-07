import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  onChange: (from: string, to: string) => void;
  maxDate?: string; // YYYY-MM-DD
}

const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function fmtBR(s: string): string {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

export function DateRangePicker({ from, to, onChange, maxDate }: Props) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => fromISO(from));
  const [pendingFrom, setPendingFrom] = useState(from);
  const [pendingTo, setPendingTo] = useState(to);
  const [selecting, setSelecting] = useState<'from' | 'to'>('from');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const openPicker = () => {
    setPendingFrom(from);
    setPendingTo(to);
    setSelecting('from');
    setViewDate(fromISO(from));
    setOpen(true);
  };

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay        = new Date(year, month, 1);
  const startWeekday    = firstDay.getDay();
  const daysInMonth     = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  const handleDayClick = (d: Date) => {
    const iso = toISO(d);
    if (maxDate && iso > maxDate) return;

    if (selecting === 'from') {
      setPendingFrom(iso);
      setPendingTo(iso);
      setSelecting('to');
    } else {
      if (iso < pendingFrom) {
        setPendingTo(pendingFrom);
        setPendingFrom(iso);
      } else {
        setPendingTo(iso);
      }
      setSelecting('from');
    }
  };

  const confirm = () => {
    const finalFrom = pendingFrom <= pendingTo ? pendingFrom : pendingTo;
    const finalTo   = pendingFrom <= pendingTo ? pendingTo : pendingFrom;
    onChange(finalFrom, finalTo);
    setOpen(false);
  };

  const isInRange = (d: Date) => {
    const iso = toISO(d);
    return iso >= pendingFrom && iso <= pendingTo;
  };
  const isEdge = (d: Date) => {
    const iso = toISO(d);
    return iso === pendingFrom || iso === pendingTo;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openPicker}
        className="flex items-center gap-2 bg-brand-dark border border-brand-light rounded-lg px-3 py-2.5 text-sm text-white hover:border-brand-purple transition-all"
      >
        <CalendarIcon className="w-4 h-4 text-gray-500" />
        <span>{fmtBR(from)}</span>
        <span className="text-gray-600">até</span>
        <span>{fmtBR(to)}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 bg-brand-medium border border-brand-light rounded-xl p-4 shadow-xl w-[320px]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex-1 bg-brand-dark border border-brand-light rounded-lg px-2 py-1.5 text-xs text-white text-center">
              {fmtBR(pendingFrom)}
            </div>
            <span className="text-gray-600 text-xs">até</span>
            <div className="flex-1 bg-brand-dark border border-brand-light rounded-lg px-2 py-1.5 text-xs text-white text-center">
              {fmtBR(pendingTo)}
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-brand-light text-gray-400">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-white">{MONTHS[month]} {year}</span>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-brand-light text-gray-400">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-[10px] text-gray-600 font-bold text-center py-1">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map(({ date, inMonth }, i) => {
              const iso = toISO(date);
              const disabled = maxDate ? iso > maxDate : false;
              const inRange = isInRange(date);
              const edge = isEdge(date);
              return (
                <button
                  key={i}
                  disabled={disabled}
                  onClick={() => handleDayClick(date)}
                  className={`text-xs py-1.5 rounded-lg transition-all ${
                    disabled ? 'text-gray-700 cursor-not-allowed' :
                    edge ? 'bg-brand-purple text-white font-bold' :
                    inRange ? 'bg-brand-purple/20 text-white' :
                    inMonth ? 'text-gray-300 hover:bg-brand-light' : 'text-gray-700 hover:bg-brand-light/40'
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <button
            onClick={confirm}
            className="w-full mt-3 py-2 rounded-lg bg-brand-purple hover:bg-brand-purple/80 text-white text-xs font-bold transition-all"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
