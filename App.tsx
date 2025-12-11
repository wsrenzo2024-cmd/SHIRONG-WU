import React, { useState, useRef, useEffect } from 'react';
import { SceneData, GenerationSettings, GenerationStatus, ScriptRow, HistoryItem } from './types';
import { generateFullScriptAnalysis, regenerateScene } from './services/geminiService';
import InputSection from './components/InputSection';
import SceneCard from './components/SceneCard';
import { exportToTxt, exportToDocx, exportToPdf } from './utils/exportService';
import { Clapperboard, Github, Info, Download, FileText, FileType, Printer, History, Clock, Trash2, ChevronRight, Save, FileEdit, LayoutTemplate, RotateCcw, CheckCircle, Sparkles, FolderArchive, Image as ImageIcon } from 'lucide-react';

const DEFAULT_SETTINGS: GenerationSettings = {
  defaultImageCount: 0,
  artStyle: 'Cinematic Realistic',
  aspectRatio: '16:9'
};

const App: React.FC = () => {
  const [rows, setRows] = useState<ScriptRow[]>([
    { id: '1', timestamp: '00:00', content: '', duration: '' }
  ]);
  // Lifted settings state
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [activeSettings, setActiveSettings] = useState<GenerationSettings | null>(null);
  
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showBottomExportMenu, setShowBottomExportMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Ref for auto-scrolling to results
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('script2prompt_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (
      generatedScenes: SceneData[], 
      currentRows: ScriptRow[], 
      currentSettings: GenerationSettings, 
      source: 'script' | 'prompt' | 'all' | 'auto'
  ) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      source: source,
      timestamp: Date.now(),
      rows: currentRows,
      settings: currentSettings,
      scenes: generatedScenes
    };
    
    const updatedHistory = [newItem, ...history].slice(0, 30); // Keep last 30 items
    setHistory(updatedHistory);
    localStorage.setItem('script2prompt_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('script2prompt_history', JSON.stringify(updated));
  };

  const loadHistoryItem = (item: HistoryItem) => {
    if (window.confirm("Load this history item? Current unsaved work will be replaced.")) {
      setRows(item.rows);
      setSettings(item.settings); // Restore dropdowns in InputSection
      setActiveSettings(item.settings);
      setScenes(item.scenes);
      
      if (item.scenes.length > 0) {
        setStatus(GenerationStatus.COMPLETE);
        // Wait for render then scroll
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setStatus(GenerationStatus.IDLE);
      }
      setShowHistory(false);
    }
  };

  const handleGenerate = async (scriptText: string, genSettings: GenerationSettings) => {
    try {
      setStatus(GenerationStatus.GENERATING);
      setError(null);
      setActiveSettings(genSettings);
      
      const newScenes = await generateFullScriptAnalysis(scriptText, genSettings);
      setScenes(newScenes);
      setStatus(GenerationStatus.COMPLETE);
      
      // Auto save to history as 'auto' (Generated Scenes)
      saveToHistory(newScenes, rows, genSettings, 'auto');

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate prompts. Please check your API key and try again.");
      setStatus(GenerationStatus.ERROR);
    }
  };

  // Called from InputSection
  const handleSaveScript = () => {
      saveToHistory([], rows, settings, 'script');
      alert("Script Only saved to History!");
  };

  // Called from Results area header
  const handleSavePrompt = () => {
      if (activeSettings) {
          saveToHistory(scenes, rows, activeSettings, 'prompt');
          alert("Generated Prompts saved to History!");
      }
  };

  // Called from Results area bottom
  const handleSaveAll = () => {
      if (activeSettings) {
          saveToHistory(scenes, rows, activeSettings, 'all');
          alert("Full Project (Script + Results) saved to History!");
      }
  };

  const handleRegenerateScene = async (id: string, currentCount: number) => {
    if (!activeSettings) return;

    setScenes(prev => prev.map(s => s.id === id ? { ...s, isRegenerating: true } : s));
    
    try {
      const sceneToRegen = scenes.find(s => s.id === id);
      if (!sceneToRegen) return;

      const updatedData = await regenerateScene(
        sceneToRegen.originalScript, 
        activeSettings, 
        currentCount
      );
      
      setScenes(prev => prev.map(s => 
        s.id === id ? { ...s, ...updatedData, isRegenerating: false } : s
      ));
    } catch (err) {
      console.error(err);
      // Revert loading state on error
      setScenes(prev => prev.map(s => s.id === id ? { ...s, isRegenerating: false } : s));
    }
  };

  const handleUpdateImageCount = (id: string, count: number) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, imageCount: count } : s));
  };

  // Helper to render history item label/icon
  const getHistoryTypeInfo = (source: HistoryItem['source']) => {
    switch(source) {
        case 'script': 
            return { 
                label: 'Saved Script', 
                icon: <FileText className="w-3 h-3" />, 
                color: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
                border: 'border-dashed border-slate-300 dark:border-slate-700'
            };
        case 'prompt': 
            return { 
                label: 'Saved Prompt', 
                icon: <ImageIcon className="w-3 h-3" />, 
                color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                border: 'border-blue-200 dark:border-blue-800'
            };
        case 'all': 
            return { 
                label: 'All Saved', 
                icon: <FolderArchive className="w-3 h-3" />, 
                color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
                border: 'border-emerald-200 dark:border-emerald-800'
            };
        case 'auto': 
            return { 
                label: 'Auto-Generated', 
                icon: <Sparkles className="w-3 h-3" />, 
                color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
                border: 'border-indigo-100 dark:border-indigo-900/30'
            };
        default: return { label: 'Unknown', icon: <Info />, color: '', border: '' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
              Script2Prompt
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
             <button
               onClick={() => setShowHistory(true)}
               className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
               title="View History"
             >
               <History className="w-5 h-5" />
               <span className="hidden sm:inline">History</span>
             </button>
             
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

             <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
               <Github className="w-5 h-5" />
             </a>
          </div>
        </div>
      </header>

      {/* History Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl p-6 overflow-y-auto border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-bold flex items-center gap-2">
                 <History className="w-5 h-5 text-indigo-500" /> History
               </h2>
               <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Close</button>
             </div>
             
             {history.length === 0 ? (
               <div className="text-center py-10 text-slate-500">No history found. Generate something first!</div>
             ) : (
               <div className="space-y-4">
                 {history.map((item) => {
                   const typeInfo = getHistoryTypeInfo(item.source);
                   return (
                     <div key={item.id} 
                          className={`group border rounded-xl p-4 transition-all relative hover:shadow-md bg-white dark:bg-slate-900 ${typeInfo.border}`}
                     >
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                             <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${typeInfo.color}`}>
                               {typeInfo.icon}
                               {typeInfo.label}
                             </span>
                             <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                               <Clock className="w-3 h-3" /> {new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                             </span>
                         </div>
                         <button 
                           onClick={(e) => deleteHistoryItem(e, item.id)}
                           className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                           title="Delete from history"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                       
                       {/* Preview Content */}
                       <div className="mb-3">
                           <p className="font-medium text-slate-800 dark:text-white line-clamp-2 text-sm">
                             {item.rows[0]?.content || "Empty Script"}...
                           </p>
                           {item.scenes.length > 0 && (
                               <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                                   Generated: {item.scenes.length} Scenes
                               </p>
                           )}
                       </div>
                       
                       <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                           <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{item.rows.length} Rows</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{item.settings.artStyle}</span>
                           </div>

                           <button
                             onClick={() => loadHistoryItem(item)}
                             className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800"
                           >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                           </button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
        
        {/* Intro Text */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            Turn Your Scripts into <span className="text-indigo-600 dark:text-indigo-400">Visual Masterpieces</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Generate consistent, high-quality Text-to-Image and Image-to-Video prompts automatically. Includes dual-language support and AI visual reasoning.
          </p>
        </div>

        {/* Input Section */}
        <InputSection 
            onGenerate={handleGenerate} 
            onSave={handleSaveScript}
            status={status} 
            rows={rows} 
            setRows={setRows}
            settings={settings}
            setSettings={setSettings}
        />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-6 py-4 rounded-xl mb-8 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             {error}
          </div>
        )}

        {/* Results List */}
        <div ref={resultsRef} className="space-y-8">
          {scenes.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded-full">{scenes.length}</span>
                Generated Scenes
              </h3>
              
              <div className="flex items-center gap-3">
                 <button
                    onClick={handleSavePrompt}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
                    title="Save Results to History"
                 >
                    <Save className="w-4 h-4" /> Save Prompts
                 </button>

                 <div className="relative">
                   <button 
                     onClick={() => setShowExportMenu(!showExportMenu)}
                     className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                   >
                     <Download className="w-4 h-4" /> Export
                   </button>
                   
                   {showExportMenu && (
                     <>
                       <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                       <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                         <button onClick={() => { exportToTxt(scenes, activeSettings); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                           <FileText className="w-4 h-4 text-slate-400" /> Text (.txt)
                         </button>
                         <button onClick={() => { exportToDocx(scenes, activeSettings); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                           <FileType className="w-4 h-4 text-blue-500" /> Word (.docx)
                         </button>
                         <button onClick={() => { exportToPdf(scenes, activeSettings); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                           <Printer className="w-4 h-4 text-red-500" /> PDF (Print View)
                         </button>
                       </div>
                     </>
                   )}
                 </div>

                 <button 
                   onClick={() => setScenes([])}
                   className="text-sm text-slate-500 hover:text-red-500 transition-colors px-2"
                 >
                   Clear All
                 </button>
              </div>
            </div>
          )}

          {scenes.map((scene, index) => (
            <SceneCard 
              key={scene.id} 
              scene={scene} 
              index={index}
              onRegenerate={handleRegenerateScene}
              onUpdateImageCount={handleUpdateImageCount}
            />
          ))}
          
          {/* Bottom Action Bar */}
          {scenes.length > 0 && (
             <div className="mt-12 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                     <CheckCircle className="w-6 h-6 text-emerald-500" />
                     <div>
                         <h3 className="font-bold text-slate-800 dark:text-white">All Scenes Generated</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400">Save or export your complete vision plan.</p>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-3 w-full md:w-auto">
                     <button
                        onClick={handleSaveAll}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800 shadow-sm"
                     >
                        <Save className="w-4 h-4" /> Save All to History
                     </button>
                     
                     <div className="relative flex-1 md:flex-none">
                       <button 
                         onClick={() => setShowBottomExportMenu(!showBottomExportMenu)}
                         className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                       >
                         <Download className="w-4 h-4" /> Export All
                       </button>
                       
                       {showBottomExportMenu && (
                         <>
                           <div className="fixed inset-0 z-10" onClick={() => setShowBottomExportMenu(false)} />
                           <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-20 py-1 animate-in fade-in zoom-in-95 duration-100 origin-bottom-right">
                             <button onClick={() => { exportToTxt(scenes, activeSettings); setShowBottomExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                               <FileText className="w-4 h-4 text-slate-400" /> Text (.txt)
                             </button>
                             <button onClick={() => { exportToDocx(scenes, activeSettings); setShowBottomExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                               <FileType className="w-4 h-4 text-blue-500" /> Word (.docx)
                             </button>
                             <button onClick={() => { exportToPdf(scenes, activeSettings); setShowBottomExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                               <Printer className="w-4 h-4 text-red-500" /> PDF (Print View)
                             </button>
                           </div>
                         </>
                       )}
                     </div>
                 </div>
             </div>
          )}

          {scenes.length === 0 && status === GenerationStatus.COMPLETE && (
            <div className="text-center py-20 bg-slate-100 dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800">
               <p className="text-slate-500">No scenes generated. Try a different script.</p>
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-12 bg-white dark:bg-slate-900">
         <div className="max-w-5xl mx-auto px-4 text-center text-slate-500 text-sm">
           &copy; {new Date().getFullYear()} Script2Prompt AI. All rights reserved.
         </div>
      </footer>
    </div>
  );
};

export default App;