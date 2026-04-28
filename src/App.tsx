import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, SlidersHorizontal, Wand2, X, Maximize, Frame, Camera, ImageIcon, Info, Trash2 } from 'lucide-react';
import { STYLE_PRESETS, MOODS, LIGHTING, COLOR_TONES, ASPECT_RATIOS } from './constants';
import { generateImages, enhancePrompt } from './apiService';
import { cn } from './lib/utils';
import confetti from 'canvas-confetti';
import { get, set } from 'idb-keyval';

interface VaultImage {
  url: string;
  prompt: string;
  style: string;
  mood: string;
  lighting: string;
  aspectRatio: string;
}

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [images, setImages] = useState<VaultImage[]>([]);
  const [vaultedImages, setVaultedImages] = useState<VaultImage[]>([]);
  const [error, setError] = useState('');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'STUDIO' | 'VAULT'>('STUDIO');
  const [infoModalImage, setInfoModalImage] = useState<VaultImage | null>(null);

  useEffect(() => {
    get('dreamgen-vault').then((saved) => {
      if (saved && Array.isArray(saved)) {
        const migrated = saved.map(item => {
          if (typeof item === 'string') {
            return {
              url: item,
              prompt: 'Recovered from vault',
              style: 'none',
              mood: 'Default',
              lighting: 'Default',
              aspectRatio: '1:1'
            };
          }
          return item;
        });
        setVaultedImages(migrated);
      }
    });
  }, []);

  const [settings, setSettings] = useState({
    processor: 'STANDARD',
    style: 'none',
    mood: 'Default',
    lighting: 'Default',
    aspectRatio: '1:1',
    numImages: 1,
    angleBurst: false,
  });

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const stylePre = STYLE_PRESETS.find(s => s.id === settings.style);
      const enhanced = await enhancePrompt(
        prompt,
        stylePre?.promptSuffix || '',
        settings.mood,
        settings.lighting,
        'Default',
        settings.aspectRatio
      );
      setPrompt(enhanced);
    } catch (e) {
       console.error(e);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }
    
    setIsGenerating(true);
    setError('');
    setImages([]);
    
    try {
      const stylePre = STYLE_PRESETS.find(s => s.id === settings.style);
      
      const generated = await generateImages(
        prompt,
        stylePre?.promptSuffix || '',
        settings.mood,
        settings.lighting,
        'Default',
        settings.aspectRatio,
        settings.numImages
      );
      
      const newImages = generated.map(url => ({
        url,
        prompt,
        style: stylePre?.name || 'Standard',
        mood: settings.mood,
        lighting: settings.lighting,
        aspectRatio: settings.aspectRatio
      }));
      
      setImages(newImages);
      const newVault = [...newImages, ...vaultedImages];
      setVaultedImages(newVault);
      set('dreamgen-vault', newVault).catch(console.error);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setIsSidebarOpen(false); // Close sidebar on generate mostly
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `dreamgen-image-${Date.now()}-${index}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteVaultImage = (urlToRemove: string) => {
    const updatedVault = vaultedImages.filter(img => img.url !== urlToRemove);
    setVaultedImages(updatedVault);
    set('dreamgen-vault', updatedVault).catch(console.error);
    if (infoModalImage && infoModalImage.url === urlToRemove) {
      setInfoModalImage(null);
    }
  };

  return (
    <div className="h-[100dvh] w-full fixed inset-0 overflow-hidden bg-[#0b0f19] text-slate-200 font-sans flex flex-col font-medium">
      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-[#0b0f19] flex items-center justify-between px-4 sm:px-6 z-50 shrink-0">
        <div className="flex items-center gap-4 sm:gap-6 w-full justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 uppercase block">
              DreamGen AI
            </h1>
          </div>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={cn("p-2 rounded-lg transition-colors", isSidebarOpen ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white")}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className={cn(
            "flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto transition-all duration-300 custom-scrollbar",
            isSidebarOpen ? "lg:mr-80" : ""
          )}
        >
          {activeTab === 'STUDIO' ? (
            <div className="w-full max-w-5xl mx-auto space-y-6 flex-1 flex flex-col">
              
              {/* Prompt Input Area */}
              <div className="relative group bg-[#111624] border border-white/5 rounded-2xl transition-all focus-within:border-blue-500/50 focus-within:shadow-[0_0_20px_rgba(37,99,235,0.1)] pb-12 shrink-0">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A defiant angel with obsidian wings, standing atop a floating ruin, dramatic lightning, 8k..."
                  className="w-full h-32 bg-transparent text-slate-200 placeholder:text-slate-600 p-6 resize-none focus:outline-none focus:ring-0 text-lg"
                />

                <button 
                  onClick={handleEnhance}
                  disabled={isEnhancing || !prompt.trim() || isGenerating}
                  className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                  title="Enhance Prompt"
                >
                  <Wand2 className={cn("w-5 h-5", isEnhancing && "animate-spin")} />
                </button>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm shrink-0">
                  {error}
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold tracking-widest text-sm shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-3 uppercase cursor-pointer shrink-0"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    Ignite Creation
                  </>
                )}
              </button>

              {/* Canvas Area */}
              <div className="flex items-center gap-4 mt-8 mb-4 px-2 shrink-0">
                <button 
                  onClick={() => setActiveTab('VAULT')}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors flex items-center gap-2 border border-white/10"
                >
                  <Frame className="w-4 h-4 text-blue-500" />
                  Image Vault
                  {vaultedImages.length > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-md leading-none">
                      {vaultedImages.length}
                    </span>
                  )}
                </button>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-auto">
                  <Camera className="w-3 h-3" />
                  Preview Canvas
                </h3>
              </div>
              <div className={cn(
                "flex-1 w-full relative",
                images.length === 0 ? "border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] text-slate-600 bg-transparent" : "min-h-[300px] sm:min-h-[400px]"
              )}>
                {images.length > 0 ? (
                  <div className="w-full flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-6 custom-scrollbar px-2">
                    {images.map((img, idx) => {
                      const aspectClass = img.aspectRatio === '16:9' ? 'aspect-video' :
                                          img.aspectRatio === '9:16' ? 'aspect-[9/16]' :
                                          img.aspectRatio === '4:3' ? 'aspect-[4/3]' :
                                          img.aspectRatio === '3:4' ? 'aspect-[3/4]' :
                                          'aspect-square';
                      return (
                      <div key={idx} className={cn("shrink-0 h-[50vh] min-h-[300px] max-h-[500px] snap-center relative group rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-transform hover:scale-[1.02] duration-300", aspectClass)}>
                        <img 
                          src={img.url} 
                          alt={`Generated ${idx}`} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <button 
                          onClick={() => downloadImage(img.url, idx)}
                          className="absolute right-4 bottom-4 p-3 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur text-white opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </div>
                    )})}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-20">
                    <div className="w-16 h-16 rounded-3xl flex flex-col items-center justify-center text-white/5 relative">
                      <Maximize className="w-12 h-12 absolute stroke-1 text-slate-800" />
                    </div>
                    <p className="text-sm font-bold tracking-widest text-slate-800 uppercase">Awaiting Inspiration</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
             <div className="w-full max-w-7xl mx-auto space-y-8 flex-1 overflow-visible">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <button 
                     onClick={() => setActiveTab('STUDIO')}
                     className="bg-white/5 hover:bg-white/10 p-2 rounded-xl text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                   >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                   </button>
                   <h2 className="text-2xl font-bold flex items-center gap-3 tracking-wide">
                     <Frame className="w-6 h-6 text-blue-500" />
                     Image Vault
                   </h2>
                 </div>
                 {vaultedImages.length > 0 && (
                   <span className="text-sm font-bold text-slate-500 bg-white/5 px-3 py-1 rounded-full">{vaultedImages.length} Saved</span>
                 )}
               </div>
               
               {vaultedImages.length > 0 ? (
                 <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                   {vaultedImages.map((img, idx) => (
                      <div key={idx} className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-black/40 border border-white/5 shadow-xl flex flex-col">
                        <img src={img.url} className="w-full h-auto object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm pointer-events-none" />
                        
                        <button 
                          onClick={() => setInfoModalImage(img)}
                          className="absolute left-3 top-3 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 z-10 shadow-lg"
                          title="Image Details"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={() => downloadImage(img.url, idx)}
                          className="absolute right-3 top-3 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 z-10 shadow-lg"
                          title="Download Image"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVaultImage(img.url);
                          }}
                          className="absolute right-3 bottom-3 p-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 backdrop-blur text-white opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 z-10 shadow-lg"
                          title="Delete Image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-slate-500 py-32 text-center flex flex-col items-center gap-4">
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                     <ImageIcon className="w-10 h-10 text-slate-600" />
                   </div>
                   <p className="font-medium">Your vault is empty. Ignite creation to save some magic!</p>
                 </div>
               )}
             </div>
          )}
        </main>

        {/* Right Sidebar */}
        <div className={cn(
          "w-80 bg-[#111520] border-l border-white/5 absolute top-0 bottom-0 right-0 z-30 transition-transform duration-300 flex flex-col shadow-2xl lg:shadow-none",
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}>
          {/* Sidebar Header */}
          <div className="h-[60px] flex items-center justify-between px-6 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2 text-slate-300">
              <SlidersHorizontal className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold tracking-widest uppercase">Studio Engine</span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-slate-500 hover:text-slate-300 rounded lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            
            {/* AI PROCESSOR */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">AI Processor</h3>
              <div className="grid grid-cols-2 gap-3 pb-2 pt-1">
                <button 
                  onClick={() => setSettings({...settings, processor: 'STANDARD'})}
                  className={cn("py-3 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-1 relative overflow-hidden tracking-wide text-center",
                  settings.processor === 'STANDARD' 
                    ? "bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400 translate-y-[2px]" 
                    : "bg-gradient-to-b from-[#252d43] to-[#181d2a] text-slate-300 hover:text-white border border-t-white/10 border-b-black/50 border-x-black/30 shadow-[0_4px_0_#0a0c12,0_5px_10px_rgba(0,0,0,0.5)] hover:shadow-[0_2px_0_#0a0c12,0_3px_10px_rgba(0,0,0,0.6)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  STANDARD
                </button>
                <button 
                  onClick={() => setSettings({...settings, processor: 'MASTER PRO'})}
                  className={cn("py-3 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-1 relative overflow-hidden tracking-wide text-center",
                  settings.processor === 'MASTER PRO' 
                    ? "bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),0_0_15px_rgba(37,99,235,0.3)] border border-blue-400 translate-y-[2px]" 
                    : "bg-gradient-to-b from-[#252d43] to-[#181d2a] text-slate-300 hover:text-white border border-t-white/10 border-b-black/50 border-x-black/30 shadow-[0_4px_0_#0a0c12,0_5px_10px_rgba(0,0,0,0.5)] hover:shadow-[0_2px_0_#0a0c12,0_3px_10px_rgba(0,0,0,0.6)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
                  )}
                >
                  <Sparkles className="w-4 h-4 opacity-50" />
                  MASTER PRO
                </button>
              </div>
            </div>

            {/* ASPECT RATIO SCALE */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Aspect Ratio Scale</h3>
              <div className="grid grid-cols-3 gap-3">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.label}
                    onClick={() => setSettings({...settings, aspectRatio: ar.value})}
                    className={cn(
                      "py-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-all",
                      settings.aspectRatio === ar.value 
                        ? "bg-blue-600/20 shadow-[0_0_20px_rgba(37,99,235,0.1)] border border-blue-500/50 text-blue-400" 
                        : "bg-[#181d2a] hover:bg-[#1f2536] border border-transparent text-slate-400"
                    )}
                  >
                    <div className={cn("border-2 rounded-sm", 
                      settings.aspectRatio === ar.value ? "border-blue-400" : "border-slate-500",
                      ar.value === '1:1' ? 'w-5 h-5' : 
                      ar.value === '4:3' ? 'w-6 h-4' : 
                      ar.value === '3:4' ? 'w-4 h-6' : 
                      ar.value === '16:9' ? 'w-7 h-4' : 
                      'w-4 h-7'
                    )} />
                    <span className="text-xs font-bold">{ar.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* BATCH & PERSPECTIVE */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Batch & Perspective</h3>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 4, 6].map(num => {
                  const isLocked = num === 4 || num === 6;
                  return (
                  <button
                    key={num}
                    onClick={() => !isLocked && setSettings({...settings, numImages: num})}
                    disabled={isLocked}
                    className={cn(
                      "py-2 rounded-xl text-xs font-black transition-all relative group flex flex-col items-center justify-center min-h-[48px] overflow-hidden", 
                      settings.numImages === num 
                        ? "bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),0_0_15px_rgba(37,99,235,0.3)] border border-blue-400 translate-y-[2px]" 
                        : isLocked 
                          ? "bg-[#131720] text-slate-700 cursor-not-allowed border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]" 
                          : "bg-gradient-to-b from-[#252d43] to-[#181d2a] text-slate-300 hover:text-white border border-t-white/10 border-b-black/50 border-x-black/30 shadow-[0_4px_0_#0a0c12,0_5px_10px_rgba(0,0,0,0.5)] hover:shadow-[0_2px_0_#0a0c12,0_3px_10px_rgba(0,0,0,0.6)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
                    )}
                  >
                    {isLocked ? (
                      <>
                        <span className="opacity-40">{num}</span>
                        <span className="text-[7px] xl:text-[8px] uppercase tracking-widest text-amber-500/80 absolute bottom-1.5 font-black bg-amber-500/10 px-1.5 rounded-sm">Soon</span>
                      </>
                    ) : (
                      num
                    )}
                  </button>
                )})}
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#181d2a]">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-300 uppercase">Angle Burst</span>
                    <span className="text-[10px] text-slate-500">Diverse Views</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSettings({...settings, angleBurst: !settings.angleBurst})}
                  className={cn("w-10 h-6 flex items-center rounded-full p-1 transition-colors relative", settings.angleBurst ? "bg-blue-600" : "bg-white/10")}
                >
                  <div className={cn("w-4 h-4 rounded-full bg-white shadow-md transition-transform", settings.angleBurst ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>
            </div>

            {/* ARTISTIC AESTHETIC */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Artistic Aesthetic</h3>
              <div className="grid grid-cols-2 gap-3">
                {STYLE_PRESETS.map(style => {
                  // Simulate image backgrounds using gradients for demo, ideally we want the actual look.
                  const bgStyles = {
                    'none': 'bg-gradient-to-br from-teal-500 to-indigo-600',
                    'photo': 'bg-[url(https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=200&h=100&fit=crop)]',
                    'anime': 'bg-[url(https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=200&h=100&fit=crop)]',
                    'cinematic': 'bg-[url(https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&h=100&fit=crop)]',
                    '3d': 'bg-[url(https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=200&h=100&fit=crop)]',
                    'oil': 'bg-[url(https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=200&h=100&fit=crop)]',
                    'watercolor': 'bg-[url(https://images.unsplash.com/photo-1541167760496-1628856ab772?w=200&h=100&fit=crop)]',
                    'cyberpunk': 'bg-[url(https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=200&h=100&fit=crop)]',
                  };
                  return (
                    <button
                      key={style.id}
                      onClick={() => setSettings({...settings, style: style.id})}
                      className={cn(
                        "h-16 rounded-xl flex items-center justify-center relative overflow-hidden transition-all bg-cover bg-center border-2",
                        settings.style === style.id ? "border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      <div className={cn("absolute inset-0 z-0", bgStyles[style.id as keyof typeof bgStyles] || "bg-[#181d2a]")} />
                      <div className="absolute inset-0 bg-black/40 z-10" />
                      <span className="relative z-20 text-[10px] font-bold text-white tracking-widest uppercase drop-shadow-md">
                        {style.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SCENE ATMOSPHERE */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Scene Atmosphere</h3>
              
              <div className="space-y-3">
                <span className="text-[10px] text-slate-600 font-bold uppercase">Vibe / Mood</span>
                <div className="grid grid-cols-2 gap-3 pb-2 pt-1">
                  {MOODS.map(mood => (
                    <button
                      key={mood}
                      onClick={() => setSettings({...settings, mood})}
                      className={cn("py-2.5 px-3 rounded-xl text-xs font-black transition-all relative overflow-hidden tracking-wide text-center",
                        settings.mood === mood 
                        ? "bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),0_0_15px_rgba(37,99,235,0.3)] border border-blue-400 translate-y-[2px]" 
                        : "bg-gradient-to-b from-[#252d43] to-[#181d2a] text-slate-300 hover:text-white border border-t-white/10 border-b-black/50 border-x-black/30 shadow-[0_4px_0_#0a0c12,0_5px_10px_rgba(0,0,0,0.5)] hover:shadow-[0_2px_0_#0a0c12,0_3px_10px_rgba(0,0,0,0.6)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
                      )}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] text-slate-600 font-bold uppercase">Illumination</span>
                <div className="grid grid-cols-2 gap-3 pb-2 pt-1">
                  {LIGHTING.map(light => (
                    <button
                      key={light}
                      onClick={() => setSettings({...settings, lighting: light})}
                      className={cn("py-2.5 px-3 rounded-xl text-xs font-black transition-all relative overflow-hidden tracking-wide text-center",
                        settings.lighting === light 
                        ? "bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),0_0_15px_rgba(37,99,235,0.3)] border border-blue-400 translate-y-[2px]" 
                        : "bg-gradient-to-b from-[#252d43] to-[#181d2a] text-slate-300 hover:text-white border border-t-white/10 border-b-black/50 border-x-black/30 shadow-[0_4px_0_#0a0c12,0_5px_10px_rgba(0,0,0,0.5)] hover:shadow-[0_2px_0_#0a0c12,0_3px_10px_rgba(0,0,0,0.6)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
                      )}
                    >
                      {light}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Info Modal */}
        {infoModalImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm" onClick={() => setInfoModalImage(null)}>
            <div 
              className="bg-[#111624] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Image Preview Side */}
              <div className="w-full md:w-1/2 bg-black/50 p-4 sm:p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/10 relative min-h-[30vh] shrink-0 md:shrink">
                 <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
                 <img src={infoModalImage.url} className="max-w-full max-h-[35vh] md:max-h-[70vh] object-contain rounded-xl relative z-10 shadow-2xl" />
              </div>

              {/* Data Side */}
              <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex items-center justify-between shrink-0">
                   <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-wide">
                     <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                       <Info className="w-5 h-5 text-blue-500" />
                     </div>
                     Creation Details
                   </h3>
                   <button onClick={() => setInfoModalImage(null)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors shrink-0">
                     <X className="w-5 h-5" />
                   </button>
                </div>
                
                <div className="space-y-6 flex-1">
                   <div>
                     <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
                       <Wand2 className="w-4 h-4" /> Original Prompt
                     </span>
                     <p className="text-base text-slate-200 leading-relaxed font-medium bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
                        {infoModalImage.prompt}
                     </p>
                   </div>

                   <div>
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
                         <SlidersHorizontal className="w-4 h-4" /> Parameters
                      </span>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 relative z-10">Size & Ratio</span>
                          <p className="text-sm font-bold text-slate-200 relative z-10">{infoModalImage.aspectRatio}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 relative z-10">Art Style</span>
                          <p className="text-sm font-bold text-slate-200 relative z-10 line-clamp-1" title={infoModalImage.style}>{infoModalImage.style}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
                           <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 relative z-10">Mood</span>
                           <p className="text-sm font-bold text-slate-200 relative z-10 line-clamp-1" title={infoModalImage.mood}>{infoModalImage.mood}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
                           <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 relative z-10">Lighting</span>
                           <p className="text-sm font-bold text-slate-200 relative z-10 line-clamp-1" title={infoModalImage.lighting}>{infoModalImage.lighting}</p>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3 shrink-0">
                  <button 
                     onClick={() => handleDeleteVaultImage(infoModalImage.url)}
                     className="sm:w-auto w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold px-6 py-4 rounded-xl transition-colors text-sm tracking-widest flex items-center justify-center gap-2 border border-red-500/20"
                     title="Delete this image"
                  >
                     <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                     onClick={() => {
                        const idx = vaultedImages.findIndex(i => i.url === infoModalImage.url);
                        downloadImage(infoModalImage.url, idx !== -1 ? idx : Date.now());
                     }}
                     className="flex-1 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-colors text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.3)] shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                     </svg>
                     Download Image
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

