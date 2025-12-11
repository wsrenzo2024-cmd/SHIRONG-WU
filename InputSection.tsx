import React, { useState } from 'react';
import { GenerationSettings, GenerationStatus, ScriptRow } from '../types';
import { Sparkles, Play, Settings2, Plus, Trash2, Clock, AlignLeft, ListOrdered, Save } from 'lucide-react';

interface InputSectionProps {
  onGenerate: (script: string, settings: GenerationSettings) => void;
  onSave: () => void;
  status: GenerationStatus;
  rows: ScriptRow[];
  setRows: React.Dispatch<React.SetStateAction<ScriptRow[]>>;
  settings: GenerationSettings;
  setSettings: React.Dispatch<React.SetStateAction<GenerationSettings>>;
}

const ART_STYLES = [
  "Cinematic Realistic",
  "Anime / Manga Style",
  "3D Animation (Pixar/Disney)",
  "Cyberpunk / Sci-Fi",
  "Vintage / Retro Film",
  "Oil Painting / Artistic",
  "Dark Fantasy",
  "Minimalist",
  "Documentary / News Style",
  "Surrealist"
];

const DEFAULT_SETTINGS: GenerationSettings = {
  defaultImageCount: 0,
  artStyle: 'Cinematic Realistic',
  aspectRatio: '16:9'
};

// Helper to parse time string (00:00 or 15s) to seconds
const parseTime = (str: string): number => {
  if (!str) return 0;
  const cleanStr = str.replace(/[sS]/g, '').trim();
  if (cleanStr.includes(':')) {
    const parts = cleanStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }
  return parseFloat(cleanStr) || 0;
};

// Helper to format seconds to MM:SS
const formatTime = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const InputSection: React.FC<InputSectionProps> = ({ 
    onGenerate, 
    onSave, 
    status, 
    rows, 
    setRows,
    settings,
    setSettings
}) => {
  const [rowsToAdd, setRowsToAdd] = useState(1);
  const [totalRowsInput, setTotalRowsInput] = useState(rows.length.toString());

  const updateRowsList = (newCount: number) => {
     setRows(currentRows => {
      const currentCount = currentRows.length;
      if (newCount > currentCount) {
        // Add new rows
        const toAdd = newCount - currentCount;
        const newItems = Array.from({ length: toAdd }).map((_, i) => ({
          id: `${Date.now()}-${currentCount + i}`,
          timestamp: '',
          content: '',
          duration: ''
        }));
        return [...currentRows, ...newItems];
      } else if (newCount < currentCount) {
        // Remove rows from the end
        return currentRows.slice(0, newCount);
      }
      return currentRows;
    });
    setTotalRowsInput(newCount.toString());
  };

  const handleAddRows = () => {
    updateRowsList(rows.length + rowsToAdd);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length > 1) {
      const newRows = rows.filter(row => row.id !== id);
      setRows(newRows);
      setTotalRowsInput(newRows.length.toString());
    }
  };

  const updateRow = (id: string, field: keyof ScriptRow, value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleDurationChange = (index: number, durationValue: string) => {
    const updatedRows = [...rows];
    
    // 1. Update current row's duration
    updatedRows[index] = { ...updatedRows[index], duration: durationValue };
    
    // 2. Calculate next timestamp if we have a valid duration and a next row exists
    if (durationValue && index < updatedRows.length - 1) {
       const currentTimestamp = parseTime(updatedRows[index].timestamp);
       const durationSec = parseTime(durationValue);
       const nextTimestampSec = currentTimestamp + durationSec;
       
       updatedRows[index + 1] = {
         ...updatedRows[index + 1],
         timestamp: formatTime(nextTimestampSec)
       };
    }
    
    setRows(updatedRows);
  };

  const handleTotalRowsBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      updateRowsList(val);
    } else {
      setTotalRowsInput(rows.length.toString());
    }
  };

  const handleTotalRowsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(val) && val > 0) {
        updateRowsList(val);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Combine rows into a single script string
    const scriptText = rows
      .filter(r => r.content.trim() !== '')
      .map(r => {
        const time = r.timestamp.trim() ? `[${r.timestamp}] ` : '';
        return `${time}${r.content}`;
      })
      .join('\n');

    if (scriptText.trim() && status !== GenerationStatus.GENERATING) {
      onGenerate(scriptText, settings);
    }
  };

  const isGenerating = status === GenerationStatus.GENERATING;

  // Sync total input if props change externally (e.g. history load)
  React.useEffect(() => {
    setTotalRowsInput(rows.length.toString());
  }, [rows.length]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8 border border-slate-200 dark:border-slate-700">
      <form onSubmit={handleSubmit}>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Script Input
          </h2>

          <div className="flex items-center gap-3">
             <button
                type="button"
                onClick={onSave}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors border border-slate-200 dark:border-slate-600"
                title="Save current script to History"
             >
                <Save className="w-4 h-4" />
                Save Script
             </button>
          
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <ListOrdered className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Rows:</span>
                
                {/* Direct Input for Total Rows */}
                <input 
                  type="number" 
                  min="1"
                  value={totalRowsInput}
                  onChange={(e) => setTotalRowsInput(e.target.value)}
                  onBlur={handleTotalRowsBlur}
                  onKeyDown={handleTotalRowsKeyDown}
                  disabled={isGenerating}
                  className="w-16 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                
                {/* Quick Select for Total Rows */}
                <select
                  onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if(val) updateRowsList(val);
                      e.target.value = ""; // Reset to allow re-selecting same value
                  }}
                  disabled={isGenerating}
                  className="bg-transparent text-sm text-slate-500 dark:text-slate-400 focus:outline-none cursor-pointer w-4"
                  title="Quick Select Total Rows"
                >
                  <option value="">Select...</option>
                  {[1, 5, 10, 15, 20, 30].map(num => (
                    <option key={num} value={num}>{num} Rows</option>
                  ))}
                </select>
              </div>
          </div>
        </div>

        {/* Script Input Grid */}
        <div className="mb-8 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
           {/* Header */}
           <div className="grid grid-cols-12 gap-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400">
              <div className="col-span-3 sm:col-span-2 px-4 py-3 border-r border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Time / Dur.
              </div>
              <div className="col-span-8 sm:col-span-9 px-4 py-3 flex items-center gap-2">
                <AlignLeft className="w-4 h-4" /> Script / Dialogue
              </div>
              <div className="col-span-1 px-4 py-3 text-center"></div>
           </div>

           {/* Rows */}
           <div className="max-h-[400px] overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
             {rows.map((row, index) => (
               <div key={row.id} className="grid grid-cols-12 gap-0 border-b border-slate-200 dark:border-slate-700 last:border-0 group transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50">
                  <div className="col-span-3 sm:col-span-2 border-r border-slate-200 dark:border-slate-700 relative group/time">
                    <input
                      type="text"
                      placeholder="00:00"
                      value={row.timestamp}
                      onChange={(e) => updateRow(row.id, 'timestamp', e.target.value)}
                      disabled={isGenerating}
                      className="w-full h-full pl-4 pr-10 py-3 bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-inset focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-slate-700 dark:text-slate-300"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <div className="relative w-5 h-5">
                             <select
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                value={row.duration || ""}
                                onChange={(e) => handleDurationChange(index, e.target.value)}
                                disabled={isGenerating}
                                title="Select Duration"
                             >
                                 <option value="">Dur.</option>
                                 <option value="2s">2s</option>
                                 <option value="3s">3s</option>
                                 <option value="4s">4s</option>
                                 <option value="5s">5s</option>
                                 <option value="6s">6s</option>
                                 <option value="8s">8s</option>
                                 <option value="10s">10s</option>
                                 <option value="12s">12s</option>
                                 <option value="15s">15s</option>
                                 <option value="20s">20s</option>
                                 <option value="30s">30s</option>
                             </select>
                             <Clock className={`w-4 h-4 transition-colors ${row.duration ? 'text-indigo-500' : 'text-slate-400 group-hover/time:text-indigo-500'}`} />
                        </div>
                    </div>
                  </div>
                  <div className="col-span-8 sm:col-span-9 border-r border-slate-200 dark:border-slate-700">
                    <textarea
                      placeholder="Enter dialogue or scene description..."
                      value={row.content}
                      onChange={(e) => updateRow(row.id, 'content', e.target.value)}
                      disabled={isGenerating}
                      rows={1}
                      onInput={(e) => {
                         // Auto-grow height
                         const target = e.target as HTMLTextAreaElement;
                         target.style.height = 'auto';
                         target.style.height = target.scrollHeight + 'px';
                      }}
                      className="w-full h-full min-h-[48px] px-4 py-3 bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-inset focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 dark:text-white resize-none overflow-hidden leading-relaxed"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      disabled={rows.length === 1 || isGenerating}
                      className={`p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ${rows.length === 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title="Remove Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
               </div>
             ))}
           </div>
           
           {/* Footer Action */}
           <div className="bg-slate-50 dark:bg-slate-900/50 p-2 border-t border-slate-200 dark:border-slate-700 flex justify-center">
             <div className="flex items-center gap-0 shadow-sm rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
               {/* Dropdown for Add Quantity */}
               <div className="relative border-r border-slate-300 dark:border-slate-600">
                   <select 
                      value={rowsToAdd}
                      onChange={(e) => setRowsToAdd(Number(e.target.value))}
                      className="appearance-none bg-transparent pl-3 pr-8 py-2 text-sm font-medium focus:outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                   >
                       <option value={1}>+1</option>
                       <option value={5}>+5</option>
                       <option value={10}>+10</option>
                   </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                     <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                   </div>
               </div>
               
               {/* Input for Add Quantity */}
               <input 
                  type="number" 
                  min="1" 
                  value={rowsToAdd} 
                  onChange={(e) => setRowsToAdd(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-2 text-center text-sm border-r border-slate-300 dark:border-slate-600 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-700"
               />

               {/* Add Button */}
               <button
                 type="button"
                 onClick={handleAddRows}
                 disabled={isGenerating}
                 className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
               >
                 <Plus className="w-4 h-4" /> Add
               </button>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Images per Scene
            </label>
            <select
              value={settings.defaultImageCount}
              onChange={(e) => setSettings({ ...settings, defaultImageCount: Number(e.target.value) })}
              disabled={isGenerating}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value={0}>✨ AI Auto-Recommend</option>
              {[1, 2, 3, 4, 8].map(num => (
                <option key={num} value={num}>{num} Image{num > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Art Style
            </label>
            <select
              value={settings.artStyle}
              onChange={(e) => setSettings({ ...settings, artStyle: e.target.value })}
              disabled={isGenerating}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {ART_STYLES.map(style => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Aspect Ratio
            </label>
            <select
              value={settings.aspectRatio}
              onChange={(e) => setSettings({ ...settings, aspectRatio: e.target.value })}
              disabled={isGenerating}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="2.35:1">2.35:1 (Cinema)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={rows.every(r => !r.content.trim()) || isGenerating}
          className={`w-full py-3.5 px-6 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]
            ${isGenerating 
              ? 'bg-indigo-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30'}`}
        >
          {isGenerating ? (
            <>
              <Settings2 className="w-5 h-5 animate-spin" />
              Analyzing Script & Generating...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              Generate Prompts
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default InputSection;