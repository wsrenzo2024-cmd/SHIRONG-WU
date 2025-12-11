import React from 'react';
import { SceneData, PromptSet } from '../types';
import { Copy, RefreshCw, Image as ImageIcon, Video, Layers, Check, Globe } from 'lucide-react';

interface SceneCardProps {
  scene: SceneData;
  index: number;
  onRegenerate: (id: string, currentCount: number) => void;
  onUpdateImageCount: (id: string, count: number) => void;
}

const PromptBox: React.FC<{ label: string; text: string; icon: React.ReactNode; lang: 'EN' | 'ZH' }> = ({ label, text, icon, lang }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group h-full">
      <div className="absolute -top-3 left-3 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs font-bold text-slate-500 dark:text-slate-300 uppercase flex items-center gap-1 border border-slate-200 dark:border-slate-600 z-10">
        {icon} {label} <span className="text-indigo-500 dark:text-indigo-400">[{lang}]</span>
      </div>
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 pt-5 mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-mono h-full flex flex-col justify-center min-h-[100px]">
        {text}
      </div>
      <button
        onClick={handleCopy}
        className="absolute top-4 right-2 p-1.5 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors bg-white/50 dark:bg-black/20 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100"
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
};

const SceneCard: React.FC<SceneCardProps> = ({ scene, index, onRegenerate, onUpdateImageCount }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden mb-8 transition-all hover:shadow-xl">
      {/* Header / Original Script */}
      <div className="bg-slate-100 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded mb-2">
            Scene {index + 1}
          </span>
          <p className="text-lg font-medium text-slate-800 dark:text-white italic">
            "{scene.originalScript}"
          </p>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
           <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
             <Layers className="w-4 h-4 text-slate-500" />
             <span className="text-xs text-slate-500 font-medium">Qty:</span>
             <select 
               className="bg-transparent text-sm font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
               value={scene.imageCount}
               onChange={(e) => onUpdateImageCount(scene.id, Number(e.target.value))}
             >
               {[1, 2, 3, 4, 8].map(n => <option key={n} value={n}>{n}</option>)}
             </select>
           </div>
           
           <button
             onClick={() => onRegenerate(scene.id, scene.imageCount)}
             disabled={scene.isRegenerating}
             className={`p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${scene.isRegenerating ? 'animate-spin opacity-50' : ''}`}
             title="Regenerate prompts for this scene"
           >
             <RefreshCw className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Reasoning Section - Bilingual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800/50">
             <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1">
               <Globe className="w-3 h-3" /> Visual Reasoning (EN)
             </h4>
             <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
               {scene.reasoningEn}
             </p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-800/50">
             <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2 flex items-center gap-1">
               <Globe className="w-3 h-3" /> Visual Reasoning (ZH)
             </h4>
             <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
               {scene.reasoningZh}
             </p>
          </div>
        </div>

        {/* Dynamic Prompts Rendering */}
        {Array.from({ length: scene.imageCount }).map((_, i) => {
          // If we have distinct generated prompts for this index, use them.
          // Otherwise, fallback to the first one (or last available) to ensure UI doesn't break
          // This happens if user increases Qty manually without regenerating.
          const promptData = scene.prompts[i] || scene.prompts[scene.prompts.length - 1] || scene.prompts[0];
          
          return (
            <div key={i} className="space-y-4 border-t border-dashed border-slate-200 dark:border-slate-700 pt-6 first:border-0 first:pt-0">
               {scene.imageCount > 1 && (
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                   <span>Image #{i + 1}</span>
                   <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                 </div>
               )}
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PromptBox 
                    label={`T2I Prompt #${i+1}`} 
                    text={promptData.t2iEn} 
                    lang="EN" 
                    icon={<ImageIcon className="w-3 h-3" />} 
                  />
                  <PromptBox 
                    label={`T2I Prompt #${i+1}`} 
                    text={promptData.t2iZh} 
                    lang="ZH" 
                    icon={<ImageIcon className="w-3 h-3" />} 
                  />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PromptBox 
                    label={`I2V Prompt #${i+1}`} 
                    text={promptData.i2vEn} 
                    lang="EN" 
                    icon={<Video className="w-3 h-3" />} 
                  />
                  <PromptBox 
                    label={`I2V Prompt #${i+1}`} 
                    text={promptData.i2vZh} 
                    lang="ZH" 
                    icon={<Video className="w-3 h-3" />} 
                  />
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SceneCard;