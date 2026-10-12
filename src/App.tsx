import React, { useState, useRef, useEffect } from 'react';
import { Stethoscope, UploadCloud, FileText, ShieldAlert, ChevronRight, Loader2, X, Volume2, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './index.css';
import { generateMedicalSimplification } from './lib/gemini';

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('English');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = (newFiles: FileList | File[]) => {
    setError(null);
    setResult(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    
    const fileArray = Array.from(newFiles);
    setFiles(prev => [...prev, ...fileArray]);
    
    fileArray.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews(prev => ({
            ...prev,
            [file.name]: e.target?.result as string
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (indexToRemove: number, fileName: string) => {
    setFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    setPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[fileName];
      return newPreviews;
    });
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    
    try {
      const apiKey = customApiKey.trim() || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is not set. Please click the API Key button in the header to provide your key.");
      }
      
      const response = await generateMedicalSimplification(files, apiKey, language);
      setResult(response);
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported in your browser.");
      return;
    }
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      (window as any)._activeUtterance = null;
      return;
    }

    if (result) {
      window.speechSynthesis.cancel();
      // Clean up markdown syntax for clean audio reading
      const cleanText = result.replace(/[#*_`\[\]]/g, ' ').replace(/\n\s*\n/g, '. ');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = language === 'Hindi' ? 'hi-IN' : 'en-US';
      utterance.rate = 0.95;
      (window as any)._activeUtterance = utterance;
      utterance.onend = () => {
        setIsSpeaking(false);
        (window as any)._activeUtterance = null;
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        (window as any)._activeUtterance = null;
      };
      
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveCustomKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('gemini_api_key', key.trim());
    setShowKeyInput(false);
  };

  return (
    <div className="app-container">
      <header className="header glass print-hide">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Stethoscope size={28} color="#2563eb" />
          <div>
            <h1>MediSimplify AI</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>AI Medical Report & Scan Simplifier</p>
          </div>
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Language:</label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'white', fontWeight: 500, cursor: 'pointer', outline: 'none', fontSize: '0.85rem' }}
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी (Hindi)</option>
            </select>
          </div>
        </div>
      </header>

      {/* API Key Modal / Dropdown */}
      {showKeyInput && (
        <div style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)', padding: '1rem 2rem' }} className="print-hide">
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Gemini API Key Setting</span>
              <button onClick={() => setShowKeyInput(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Close</button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              The system uses a pre-configured free Gemini API key by default. You can also paste your own Google Gemini API key below:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="password"
                placeholder="Paste your Gemini API key (optional)"
                defaultValue={customApiKey}
                id="custom-key-input"
                style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
              />
              <button 
                className="btn"
                onClick={() => {
                  const input = document.getElementById('custom-key-input') as HTMLInputElement;
                  handleSaveCustomKey(input ? input.value : '');
                }}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        <div className="print-hide" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontWeight: 700 }}>Understand Your Medical Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Upload complex medical documents or multiple X-rays. Our AI will translate the jargon into clear {language === 'Hindi' ? 'Hindi' : 'English'}, explaining what it means and why it's important.
          </p>
        </div>

        <div className="uploader-card print-hide">
          <div 
            className={`drop-zone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ marginBottom: files.length > 0 ? '2rem' : '0' }}
          >
            <UploadCloud className="icon-large" />
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Drag & drop your files here</h3>
              <p style={{ color: 'var(--text-muted)' }}>Supports JPG, PNG, and Text files (Multiple allowed)</p>
            </div>
            <button className="btn" style={{ marginTop: '1rem' }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Browse Files</button>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
            accept="image/*,text/plain"
            multiple
          />

          {files.length > 0 && (
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Uploaded Files ({files.length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} style={{ position: 'relative', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <button 
                      onClick={() => removeFile(index, file.name)} 
                      style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', padding: '0.25rem', cursor: 'pointer', zIndex: 10, boxShadow: 'var(--shadow-sm)' }}
                      title="Remove file"
                    >
                      <X size={16} color="var(--error-color)" />
                    </button>
                    
                    {previews[file.name] ? (
                      <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>
                        <img src={previews[file.name]} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>
                        <FileText size={48} color="#94a3b8" />
                      </div>
                    )}
                    
                    <div style={{ padding: '0.75rem' }}>
                      <p style={{ fontWeight: 500, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button 
                  className="btn" 
                  onClick={handleAnalyze} 
                  disabled={isLoading}
                  style={{ width: '100%', maxWidth: '400px', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem' }}
                >
                  {isLoading ? (
                    <><Loader2 className="spin-animation" size={24} /> Analyzing Reports...</>
                  ) : (
                    <>Analyze & Simplify <ChevronRight size={24} /></>
                  )}
                </button>
              </div>
              
              {error && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>
          )}
        </div>

        {result && !isLoading && (
          <div className="results-card">
            <div className="print-hide" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
              <button onClick={handleSpeak} className="btn" style={{ backgroundColor: isSpeaking ? '#ef4444' : 'var(--primary-color)' }}>
                <Volume2 size={20} /> {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
              </button>
              <button onClick={handlePrint} className="btn" style={{ backgroundColor: '#10b981' }}>
                <Printer size={20} /> Save as PDF
              </button>
            </div>
            
            <div className="disclaimer-banner">
              <ShieldAlert size={24} color="#dc2626" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Important Medical Disclaimer</p>
                <p>This simplified explanation is generated by AI for educational purposes only. It is <strong>not</strong> medical advice. Always consult with a qualified healthcare professional regarding any medical conditions or reports.</p>
              </div>
            </div>
            
            <div className="markdown-body">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
