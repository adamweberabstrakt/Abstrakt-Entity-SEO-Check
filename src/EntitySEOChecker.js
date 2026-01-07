import React, { useState } from 'react';

const EntitySEOChecker = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    websiteUrl: '',
    leaders: [{ name: '', role: '' }, { name: '', role: '' }, { name: '', role: '' }],
    keywords: ['', '', '']
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState(null);
  const [selectedLLMs, setSelectedLLMs] = useState(['claude', 'chatgpt', 'perplexity']);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [strategyForm, setStrategyForm] = useState({
    name: '', email: '', phone: '', company: '', website: '',
    goals: '', budget: '', timeline: '', currentChallenges: '', competitors: ''
  });
  const [strategySubmitted, setStrategySubmitted] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });

  const llmOptions = [
    { id: 'claude', name: 'Claude (Anthropic)', icon: '🟣', color: '#7c3aed' },
    { id: 'chatgpt', name: 'ChatGPT (OpenAI)', icon: '🟢', color: '#10a37f' },
    { id: 'perplexity', name: 'Perplexity AI', icon: '🔵', color: '#1fb8cd' },
    { id: 'gemini', name: 'Gemini (Google)', icon: '🔴', color: '#ea4335' },
    { id: 'copilot', name: 'Copilot (Microsoft)', icon: '🟡', color: '#f59e0b' }
  ];

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const handleLeaderChange = (index, field, value) => {
    setFormData(prev => {
      const newLeaders = [...prev.leaders];
      newLeaders[index] = { ...newLeaders[index], [field]: value };
      return { ...prev, leaders: newLeaders };
    });
  };

  const handleKeywordChange = (index, value) => {
    setFormData(prev => {
      const newKeywords = [...prev.keywords];
      newKeywords[index] = value;
      return { ...prev, keywords: newKeywords };
    });
  };

  const toggleLLM = (llmId) => {
    setSelectedLLMs(prev => prev.includes(llmId) ? prev.filter(id => id !== llmId) : [...prev, llmId]);
  };

  const runAnalysis = async () => {
    if (selectedLLMs.length === 0) { setError('Please select at least one AI search engine.'); return; }
    setIsAnalyzing(true); setError(null); setResults(null);

    const queries = [];
    if (formData.companyName) queries.push({ type: 'company', label: `Company: ${formData.companyName}`, query: `What is ${formData.companyName}? Tell me about this company.` });
    if (formData.websiteUrl) queries.push({ type: 'website', label: `Website: ${formData.websiteUrl}`, query: `What can you tell me about ${formData.websiteUrl}?` });
    formData.leaders.forEach(l => { if (l.name && l.role) queries.push({ type: 'leader', label: `${l.name} (${l.role})`, query: `Who is ${l.name}, ${l.role}${formData.companyName ? ` at ${formData.companyName}` : ''}?` }); });
    formData.keywords.forEach(k => { if (k) queries.push({ type: 'keyword', label: `Keyword: ${k}`, query: `${k} - what are the best companies or solutions for this?` }); });

    if (queries.length === 0) { setError('Please fill in at least one field.'); setIsAnalyzing(false); return; }

    const totalCalls = queries.length * selectedLLMs.length;
    let currentCall = 0;

    try {
      const allResults = {};
      for (const q of queries) {
        allResults[q.label] = { type: q.type, query: q.query, llmResults: {} };
        for (const llmId of selectedLLMs) {
          currentCall++;
          const llmName = llmOptions.find(l => l.id === llmId)?.name || llmId;
          setProgress({ current: currentCall, total: totalCalls, message: `Analyzing ${q.label} with ${llmName}...` });
          
          try {
            const response = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: q.query,
                llmName: llmName
              })
            });

            if (!response.ok) {
              throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            allResults[q.label].llmResults[llmId] = data;
          } catch (e) {
            allResults[q.label].llmResults[llmId] = { 
              error: true, 
              summary: `Error: ${e.message}`, 
              confidenceScore: 0 
            };
          }
        }
      }
      setResults(allResults); 
      setActiveTab('dashboard');
    } catch (err) { 
      setError(`Analysis failed: ${err.message}`); 
    }
    setIsAnalyzing(false);
    setProgress({ current: 0, total: 0, message: '' });
  };

  const calculateOverallScore = () => {
    if (!results) return 0;
    let total = 0, count = 0;
    Object.values(results).forEach(r => Object.values(r.llmResults).forEach(lr => { if (lr.confidenceScore && !lr.error) { total += lr.confidenceScore; count++; } }));
    return count > 0 ? Math.round(total / count * 10) / 10 : 0;
  };

  const calculateCategoryScores = () => {
    if (!results) return { company: 0, leadership: 0, keywords: 0 };
    const s = { company: [], leadership: [], keywords: [] };
    Object.values(results).forEach(r => {
      Object.values(r.llmResults).forEach(lr => {
        if (lr.confidenceScore && !lr.error) {
          if (r.type === 'company' || r.type === 'website') s.company.push(lr.confidenceScore);
          else if (r.type === 'leader') s.leadership.push(lr.confidenceScore);
          else if (r.type === 'keyword') s.keywords.push(lr.confidenceScore);
        }
      });
    });
    const avg = arr => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : 0;
    return { company: avg(s.company), leadership: avg(s.leadership), keywords: avg(s.keywords) };
  };

  const getLLMScores = () => {
    if (!results) return {};
    const scores = {};
    selectedLLMs.forEach(id => {
      const arr = [];
      Object.values(results).forEach(r => { if (r.llmResults[id]?.confidenceScore && !r.llmResults[id]?.error) arr.push(r.llmResults[id].confidenceScore); });
      scores[id] = arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : 0;
    });
    return scores;
  };

  const getScoreColor = (s) => s >= 7 ? '#00c853' : s >= 4 ? '#ffc107' : '#ff5252';
  const getScoreLabel = (s) => s >= 8 ? 'Excellent' : s >= 6 ? 'Good' : s >= 4 ? 'Fair' : s >= 2 ? 'Poor' : 'Not Found';
  const getResultsByType = (type) => results ? Object.entries(results).filter(([_, v]) => v.type === type) : [];

  const exportToCSV = () => {
    if (!results) return;
    let csv = 'Entity,Type,LLM,Score,Found,Sentiment,Summary\n';
    Object.entries(results).forEach(([label, r]) => {
      Object.entries(r.llmResults).forEach(([llmId, lr]) => {
        csv += `"${label}","${r.type}","${llmOptions.find(l => l.id === llmId)?.name}",${lr.confidenceScore || 0},${lr.entityFound || false},"${lr.sentiment || ''}","${(lr.summary || '').replace(/"/g, '""')}"\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `entity-seo-${formData.companyName || 'report'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    const scores = calculateCategoryScores();
    const overall = calculateOverallScore();
    const llmScores = getLLMScores();
    const html = `<!DOCTYPE html><html><head><title>Entity SEO Report</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;padding:40px;max-width:900px;margin:auto;color:#1a1a2e}.header{text-align:center;border-bottom:3px solid #7c3aed;padding-bottom:20px;margin-bottom:30px}.header h1{font-size:24px;margin-bottom:8px}.scores{display:flex;justify-content:space-around;background:#f5f5f5;padding:30px;border-radius:12px;margin-bottom:30px}.score-box{text-align:center}.score-box .num{font-size:36px;font-weight:700}.score-box .label{font-size:12px;color:#666;margin-top:4px}.section{margin:24px 0}.section h2{font-size:18px;border-bottom:2px solid #eee;padding-bottom:8px;margin-bottom:16px}.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:12px}.card h3{font-size:14px;margin-bottom:8px}.llm-row{background:#f9f9f9;padding:10px;border-radius:6px;margin-top:8px;font-size:13px}.footer{text-align:center;margin-top:40px;color:#888;font-size:11px;border-top:1px solid #eee;padding-top:20px}</style></head><body><div class="header"><h1>Entity-Based SEO Report</h1><p>${formData.companyName || 'Analysis'} | ${new Date().toLocaleDateString()}</p></div><div class="scores"><div class="score-box"><div class="num" style="color:${getScoreColor(overall)}">${overall}</div><div class="label">Overall</div></div><div class="score-box"><div class="num" style="color:${getScoreColor(scores.company)}">${scores.company}</div><div class="label">Company</div></div><div class="score-box"><div class="num" style="color:${getScoreColor(scores.leadership)}">${scores.leadership}</div><div class="label">Leadership</div></div><div class="score-box"><div class="num" style="color:${getScoreColor(scores.keywords)}">${scores.keywords}</div><div class="label">Keywords</div></div></div><div class="section"><h2>AI Engine Scores</h2>${Object.entries(llmScores).map(([id, s]) => `<div class="card"><strong>${llmOptions.find(l => l.id === id)?.name}</strong>: <span style="color:${getScoreColor(s)}">${s}/10</span></div>`).join('')}</div><div class="section"><h2>Detailed Results</h2>${Object.entries(results || {}).map(([label, r]) => `<div class="card"><h3>${label}</h3>${Object.entries(r.llmResults).map(([id, lr]) => `<div class="llm-row"><strong>${llmOptions.find(l => l.id === id)?.name}</strong> (${lr.confidenceScore}/10): ${lr.summary?.substring(0, 200) || 'N/A'}...</div>`).join('')}</div>`).join('')}</div><div class="footer">Entity SEO Checker | Abstrakt Marketing Group</div></body></html>`;
    const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.print();
  };

  const submitStrategyRequest = async () => {
    const data = { timestamp: new Date().toISOString(), ...strategyForm, scores: results ? { overall: calculateOverallScore(), ...calculateCategoryScores() } : null };
    console.log('Strategy Request:', data);
    // TODO: Send to Google Sheets via Apps Script
    setStrategySubmitted(true);
    setTimeout(() => { setShowStrategyModal(false); setStrategySubmitted(false); setStrategyForm({ name: '', email: '', phone: '', company: '', website: '', goals: '', budget: '', timeline: '', currentChallenges: '', competitors: '' }); }, 3000);
  };

  const inputStyle = { width: '100%', padding: '14px 18px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)', fontFamily: '"Source Sans 3", system-ui, sans-serif', color: '#e8e8e8' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap');@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}input:focus,textarea:focus,select:focus{outline:none;border-color:#00d4ff!important;box-shadow:0 0 0 3px rgba(0,212,255,0.15)!important}`}</style>
      
      {/* Header */}
      <header style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '24px 48px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '700', color: '#fff', boxShadow: '0 4px 20px rgba(0,212,255,0.3)' }}>E</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', background: 'linear-gradient(90deg, #fff 0%, #00d4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Entity SEO Checker</h1>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Multi-LLM AI Search Visibility Analysis</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {results && (
              <>
                <button onClick={exportToCSV} style={{ padding: '10px 20px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '10px', color: '#00d4ff', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>📊 Export CSV</button>
                <button onClick={exportToPDF} style={{ padding: '10px 20px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '10px', color: '#a78bfa', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>📄 Export PDF</button>
              </>
            )}
            <button onClick={() => setShowStrategyModal(true)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,212,255,0.25)' }}>🚀 Request AI Strategy</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '48px' }}>
        {/* Input Form */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '40px', marginBottom: '40px' }}>
          
          {/* LLM Selection */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#fff' }}>🤖 Select AI Search Engines</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {llmOptions.map(llm => (
                <button key={llm.id} onClick={() => toggleLLM(llm.id)} style={{ padding: '12px 20px', background: selectedLLMs.includes(llm.id) ? `${llm.color}22` : 'rgba(0,0,0,0.2)', border: `2px solid ${selectedLLMs.includes(llm.id) ? llm.color : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px', color: selectedLLMs.includes(llm.id) ? llm.color : 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{llm.icon}</span>{llm.name}{selectedLLMs.includes(llm.id) && <span style={{ width: '20px', height: '20px', background: llm.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          <h2 style={{ margin: '0 0 32px 0', fontSize: '20px', fontWeight: '600', color: '#fff' }}>📊 Entity Information</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '32px' }}>
            <div>
              <label style={labelStyle}>Company Name *</label>
              <input type="text" value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} placeholder="e.g., Abstrakt Marketing Group" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Website URL</label>
              <input type="url" value={formData.websiteUrl} onChange={(e) => handleInputChange('websiteUrl', e.target.value)} placeholder="e.g., https://www.abstraktmg.com" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#fff' }}>👥 Leadership Team (up to 3)</h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              {formData.leaders.map((leader, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  <input type="text" value={leader.name} onChange={(e) => handleLeaderChange(i, 'name', e.target.value)} placeholder={`Leader ${i + 1} Name`} style={{ ...inputStyle, padding: '12px 16px' }} />
                  <input type="text" value={leader.role} onChange={(e) => handleLeaderChange(i, 'role', e.target.value)} placeholder="Role (e.g., CEO)" style={{ ...inputStyle, padding: '12px 16px' }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#fff' }}>🔍 Target Keywords (up to 3)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {formData.keywords.map((keyword, i) => (
                <input key={i} type="text" value={keyword} onChange={(e) => handleKeywordChange(i, e.target.value)} placeholder={`Keyword ${i + 1}`} style={inputStyle} />
              ))}
            </div>
          </div>

          <button onClick={runAnalysis} disabled={isAnalyzing} style={{ width: '100%', padding: '18px 32px', background: isAnalyzing ? 'rgba(0,212,255,0.3)' : 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: isAnalyzing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 4px 20px rgba(0,212,255,0.25)' }}>
            {isAnalyzing ? <><div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>Analyzing...</> : <>🚀 Run Multi-LLM Analysis</>}
          </button>

          {/* Progress Bar */}
          {isAnalyzing && progress.total > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                <span>{progress.message}</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #00d4ff 0%, #7c3aed 100%)', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>
          )}

          {error && <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: '12px', color: '#ff6b6b', fontSize: '14px' }}>{error}</div>}
        </div>

        {/* Results */}
        {results && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '16px', width: 'fit-content' }}>
              {[{ id: 'dashboard', label: 'Dashboard', icon: '📊' }, { id: 'company', label: 'Company', icon: '🏢' }, { id: 'leader', label: 'Leadership', icon: '👥' }, { id: 'keyword', label: 'Keywords', icon: '🔍' }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '12px 24px', background: activeTab === tab.id ? 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)' : 'transparent', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><span>{tab.icon}</span>{tab.label}</button>
              ))}
            </div>

            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div>
                {/* Overall Score */}
                <div style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.1) 0%, rgba(124,58,237,0.1) 100%)', borderRadius: '24px', border: '1px solid rgba(0,212,255,0.2)', padding: '40px', marginBottom: '24px', textAlign: 'center' }}>
                  <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '600', color: '#fff' }}>Overall Entity Visibility Score</h2>
                  <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto 24px' }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke={getScoreColor(calculateOverallScore())} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${calculateOverallScore() * 28.27} 282.7`} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <div style={{ fontSize: '42px', fontWeight: '700', color: getScoreColor(calculateOverallScore()) }}>{calculateOverallScore()}</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>out of 10</div>
                    </div>
                  </div>
                  <div style={{ padding: '10px 24px', background: `${getScoreColor(calculateOverallScore())}22`, borderRadius: '10px', display: 'inline-block' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: getScoreColor(calculateOverallScore()) }}>{getScoreLabel(calculateOverallScore())}</span>
                  </div>
                </div>

                {/* Category Scores */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
                  {[{ key: 'company', label: 'Company', icon: '🏢' }, { key: 'leadership', label: 'Leadership', icon: '👥' }, { key: 'keywords', label: 'Keywords', icon: '🔍' }].map(cat => {
                    const score = calculateCategoryScores()[cat.key];
                    return (
                      <div key={cat.key} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>{cat.icon}</div>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{cat.label} Visibility</h3>
                        <div style={{ fontSize: '36px', fontWeight: '700', color: getScoreColor(score) }}>{score}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{getScoreLabel(score)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* LLM Comparison */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '32px', marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '600', color: '#fff' }}>AI Search Engine Comparison</h3>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {Object.entries(getLLMScores()).map(([llmId, score]) => {
                      const llm = llmOptions.find(l => l.id === llmId);
                      return (
                        <div key={llmId} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '140px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '20px' }}>{llm?.icon}</span><span style={{ fontSize: '14px', color: '#fff' }}>{llm?.name?.split(' ')[0]}</span></div>
                          <div style={{ flex: 1, height: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ width: `${score * 10}%`, height: '100%', background: `linear-gradient(90deg, ${llm?.color} 0%, ${llm?.color}88 100%)`, borderRadius: '12px' }}></div>
                          </div>
                          <div style={{ width: '50px', textAlign: 'right', fontSize: '16px', fontWeight: '600', color: llm?.color }}>{score}/10</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recommendations */}
                <div style={{ background: 'linear-gradient(135deg, rgba(255,193,7,0.1) 0%, rgba(255,152,0,0.1) 100%)', borderRadius: '20px', border: '1px solid rgba(255,193,7,0.2)', padding: '32px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#ffc107' }}>💡 Recommendations</h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {calculateCategoryScores().company < 5 && <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}><strong style={{ color: '#ffc107' }}>Company:</strong> Create more authoritative content and build citations on directories.</div>}
                    {calculateCategoryScores().leadership < 5 && <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}><strong style={{ color: '#ffc107' }}>Leadership:</strong> Build personal brands through LinkedIn, thought leadership, and speaking.</div>}
                    {calculateCategoryScores().keywords < 5 && <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}><strong style={{ color: '#ffc107' }}>Keywords:</strong> Create targeted content and build topical authority in your niche.</div>}
                    {calculateOverallScore() >= 7 && <div style={{ padding: '16px', background: 'rgba(0,200,83,0.1)', borderRadius: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,200,83,0.3)' }}><strong style={{ color: '#00c853' }}>Great Job!</strong> Your entity visibility is strong. Focus on maintaining presence across AI platforms.</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Detail Views */}
            {activeTab !== 'dashboard' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                {(activeTab === 'company' ? [...getResultsByType('company'), ...getResultsByType('website')] : getResultsByType(activeTab)).map(([label, result], idx) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '32px', animation: `fadeIn 0.5s ease ${idx * 0.1}s both` }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#fff' }}>{label}</h3>
                    <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Query: "{result.query}"</p>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(selectedLLMs.length, 3)}, 1fr)`, gap: '16px' }}>
                      {Object.entries(result.llmResults).map(([llmId, lr]) => {
                        const llm = llmOptions.find(l => l.id === llmId);
                        return (
                          <div key={llmId} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '20px', border: `1px solid ${llm?.color}33` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '20px' }}>{llm?.icon}</span><span style={{ fontSize: '14px', fontWeight: '600', color: llm?.color }}>{llm?.name?.split(' ')[0]}</span></div>
                              <div style={{ padding: '4px 12px', background: `${getScoreColor(lr.confidenceScore)}22`, borderRadius: '8px', fontSize: '14px', fontWeight: '700', color: getScoreColor(lr.confidenceScore) }}>{lr.confidenceScore || 0}/10</div>
                            </div>
                            {lr.entityFound !== undefined && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: lr.entityFound ? '#00c853' : '#ff5252' }}></span><span style={{ fontSize: '12px', color: lr.entityFound ? '#00c853' : '#ff5252' }}>{lr.entityFound ? 'Entity Found' : 'Not Found'}</span></div>}
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.7)', maxHeight: '100px', overflow: 'hidden' }}>{lr.summary}</p>
                            {lr.topSources?.length > 0 && <div style={{ marginTop: '12px' }}><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Sources: {lr.topSources.length}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{lr.topSources.slice(0, 3).map((s, i) => <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ padding: '4px 8px', background: `${llm?.color}22`, borderRadius: '4px', fontSize: '11px', color: llm?.color, textDecoration: 'none', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || s.url}</a>)}</div></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!results && !isAnalyzing && (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔍</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600', color: '#fff' }}>Ready to Analyze Your Entity Visibility</h3>
            <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.5)', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>Select AI engines, enter your info, and see how visible your brand is across AI search platforms.</p>
          </div>
        )}
      </main>

      {/* Strategy Modal */}
      {showStrategyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={(e) => e.target === e.currentTarget && setShowStrategyModal(false)}>
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', padding: '40px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {!strategySubmitted ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', background: 'linear-gradient(90deg, #00d4ff 0%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Request AI Search Strategy</h2>
                    <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Get a customized strategy to improve your AI visibility</p>
                  </div>
                  <button onClick={() => setShowStrategyModal(false)} style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>Name *</label><input type="text" value={strategyForm.name} onChange={(e) => setStrategyForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Email *</label><input type="email" value={strategyForm.email} onChange={(e) => setStrategyForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>Phone</label><input type="tel" value={strategyForm.phone} onChange={(e) => setStrategyForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Company *</label><input type="text" value={strategyForm.company || formData.companyName} onChange={(e) => setStrategyForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} /></div>
                  </div>
                  <div><label style={labelStyle}>Website</label><input type="url" value={strategyForm.website || formData.websiteUrl} onChange={(e) => setStrategyForm(p => ({ ...p, website: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>AI Visibility Goals *</label><textarea value={strategyForm.goals} onChange={(e) => setStrategyForm(p => ({ ...p, goals: e.target.value }))} rows={3} placeholder="What do you want to achieve?" style={{ ...inputStyle, resize: 'vertical' }} /></div>
                  <div><label style={labelStyle}>Current Challenges</label><textarea value={strategyForm.currentChallenges} onChange={(e) => setStrategyForm(p => ({ ...p, currentChallenges: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>Budget Range</label><select value={strategyForm.budget} onChange={(e) => setStrategyForm(p => ({ ...p, budget: e.target.value }))} style={inputStyle}><option value="">Select...</option><option value="under-5k">Under $5k/mo</option><option value="5k-10k">$5k-$10k/mo</option><option value="10k-25k">$10k-$25k/mo</option><option value="25k+">$25k+/mo</option></select></div>
                    <div><label style={labelStyle}>Timeline</label><select value={strategyForm.timeline} onChange={(e) => setStrategyForm(p => ({ ...p, timeline: e.target.value }))} style={inputStyle}><option value="">Select...</option><option value="asap">ASAP</option><option value="1-month">Within 1 month</option><option value="1-3-months">1-3 months</option><option value="3-6-months">3-6 months</option></select></div>
                  </div>
                  <div><label style={labelStyle}>Competitors</label><input type="text" value={strategyForm.competitors} onChange={(e) => setStrategyForm(p => ({ ...p, competitors: e.target.value }))} placeholder="Comma-separated" style={inputStyle} /></div>
                  {results && <div style={{ padding: '16px', background: 'rgba(0,212,255,0.1)', borderRadius: '12px', border: '1px solid rgba(0,212,255,0.2)' }}><div style={{ fontSize: '12px', fontWeight: '500', color: '#00d4ff', marginBottom: '8px' }}>CURRENT SCORES</div><div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#fff' }}><span>Overall: <strong>{calculateOverallScore()}</strong></span><span>Company: <strong>{calculateCategoryScores().company}</strong></span><span>Leadership: <strong>{calculateCategoryScores().leadership}</strong></span><span>Keywords: <strong>{calculateCategoryScores().keywords}</strong></span></div></div>}
                  <button onClick={submitStrategyRequest} disabled={!strategyForm.name || !strategyForm.email || !strategyForm.goals} style={{ width: '100%', padding: '16px', background: (!strategyForm.name || !strategyForm.email || !strategyForm.goals) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: (!strategyForm.name || !strategyForm.email || !strategyForm.goals) ? 'not-allowed' : 'pointer', marginTop: '8px' }}>Submit Strategy Request</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #00c853 0%, #00e676 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '40px' }}>✓</div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: '600', color: '#fff' }}>Request Submitted!</h3>
                <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.6)' }}>We'll reach out within 24-48 hours with your strategy.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
        <p style={{ margin: '0 0 8px 0' }}>Entity SEO Checker • Multi-LLM AI Search Analysis</p>
        <p style={{ margin: 0 }}>Built for <strong style={{ color: '#00d4ff' }}>Abstrakt Marketing Group</strong></p>
      </footer>
    </div>
  );
};

export default EntitySEOChecker;
