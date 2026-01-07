import React, { useState } from 'react';

const EntitySEOChecker = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    websiteUrl: '',
    leaders: [{ name: '', role: '' }, { name: '', role: '' }, { name: '', role: '' }],
    keywords: ['', '', ''],
    competitors: [
      { url: '', leaderName: '', leaderRole: '' },
      { url: '', leaderName: '', leaderRole: '' },
      { url: '', leaderName: '', leaderRole: '' }
    ]
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState(null);
  const [selectedLLMs, setSelectedLLMs] = useState(['chatgpt', 'gemini']); // Default to just 2
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [strategyForm, setStrategyForm] = useState({
    name: '', email: '', phone: '', company: '', website: '',
    goals: '', budget: '', timeline: '', currentChallenges: '', competitors: ''
  });
  const [strategySubmitted, setStrategySubmitted] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });

  const llmOptions = [
    { id: 'chatgpt', name: 'ChatGPT (OpenAI)', icon: '🟢', color: '#10a37f' },
    { id: 'gemini', name: 'Gemini (Google)', icon: '🔴', color: '#ea4335' },
    { id: 'claude', name: 'Claude (Anthropic)', icon: '🟣', color: '#7c3aed' },
    { id: 'perplexity', name: 'Perplexity AI', icon: '🔵', color: '#1fb8cd' },
    { id: 'copilot', name: 'Copilot (Microsoft)', icon: '🟡', color: '#f59e0b' }
  ];

  // Abstrakt brand colors
  const brand = {
    primary: '#E85D04', // Orange
    secondary: '#1B1B1B', // Dark
    accent: '#F48C06', // Light orange
    dark: '#0D0D0D',
    light: '#FFFFFF',
    gray: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444'
  };

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

  const handleCompetitorChange = (index, field, value) => {
    setFormData(prev => {
      const newCompetitors = [...prev.competitors];
      newCompetitors[index] = { ...newCompetitors[index], [field]: value };
      return { ...prev, competitors: newCompetitors };
    });
  };

  const toggleLLM = (llmId) => {
    setSelectedLLMs(prev => prev.includes(llmId) ? prev.filter(id => id !== llmId) : [...prev, llmId]);
  };

  const runAnalysis = async () => {
    if (selectedLLMs.length === 0) { setError('Please select at least one AI search engine.'); return; }
    setIsAnalyzing(true); setError(null); setResults(null);

    const queries = [];
    
    // Company queries
    if (formData.companyName) {
      queries.push({ type: 'company', label: `Company: ${formData.companyName}`, query: `What is ${formData.companyName}? Tell me about this company, their reputation, services, and online presence.`, analysisType: 'entity' });
    }
    if (formData.websiteUrl) {
      queries.push({ type: 'website', label: `Website: ${formData.websiteUrl}`, query: `Analyze the website ${formData.websiteUrl}. What backlinks does it have? What is its domain authority?`, analysisType: 'backlinks' });
    }
    
    // Leadership queries
    formData.leaders.forEach(l => {
      if (l.name && l.role) {
        queries.push({ 
          type: 'leader', 
          label: `${l.name} (${l.role})`, 
          query: `Who is ${l.name}, ${l.role}${formData.companyName ? ` at ${formData.companyName}` : ''}? What is their online reputation, thought leadership presence, podcast appearances, and media coverage?`,
          analysisType: 'leadership'
        });
      }
    });
    
    // Keyword queries
    formData.keywords.forEach(k => {
      if (k) queries.push({ type: 'keyword', label: `Keyword: ${k}`, query: `${k} - what are the best companies or solutions for this? Who ranks for this term?`, analysisType: 'entity' });
    });

    // Competitor queries
    formData.competitors.forEach((c, i) => {
      if (c.url) {
        queries.push({ 
          type: 'competitor', 
          label: `Competitor ${i + 1}: ${c.url}`, 
          query: `Analyze ${c.url}. What are their top backlinks? What press coverage do they have? What is their domain authority?`,
          analysisType: 'competitor'
        });
        if (c.leaderName && c.leaderRole) {
          queries.push({ 
            type: 'competitor_leader', 
            label: `Competitor Leader: ${c.leaderName}`, 
            query: `Who is ${c.leaderName}, ${c.leaderRole}? What is their online presence, podcast appearances, and thought leadership?`,
            analysisType: 'leadership'
          });
        }
      }
    });

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
              body: JSON.stringify({ query: q.query, llmName, analysisType: q.analysisType })
            });

            if (!response.ok) throw new Error(`API returned ${response.status}`);
            const data = await response.json();
            allResults[q.label].llmResults[llmId] = data;
          } catch (e) {
            allResults[q.label].llmResults[llmId] = { error: true, summary: `Error: ${e.message}`, confidenceScore: 0, sentimentScore: 5 };
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

  // Scoring functions
  const calculateOverallScore = () => {
    if (!results) return 0;
    let total = 0, count = 0;
    Object.values(results).forEach(r => {
      if (r.type !== 'competitor' && r.type !== 'competitor_leader') {
        Object.values(r.llmResults).forEach(lr => {
          if (lr.confidenceScore && !lr.error) { total += lr.confidenceScore; count++; }
        });
      }
    });
    return count > 0 ? Math.round(total / count * 10) / 10 : 0;
  };

  const calculateCategoryScores = () => {
    if (!results) return { company: 0, leadership: 0, keywords: 0 };
    const s = { company: [], leadership: [], keywords: [] };
    Object.values(results).forEach(r => {
      if (r.type !== 'competitor' && r.type !== 'competitor_leader') {
        Object.values(r.llmResults).forEach(lr => {
          if (lr.confidenceScore && !lr.error) {
            if (r.type === 'company' || r.type === 'website') s.company.push(lr.confidenceScore);
            else if (r.type === 'leader') s.leadership.push(lr.confidenceScore);
            else if (r.type === 'keyword') s.keywords.push(lr.confidenceScore);
          }
        });
      }
    });
    const avg = arr => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : 0;
    return { company: avg(s.company), leadership: avg(s.leadership), keywords: avg(s.keywords) };
  };

  const getLeadershipScores = () => {
    if (!results) return [];
    const leaderScores = [];
    Object.entries(results).forEach(([label, r]) => {
      if (r.type === 'leader') {
        let totalSentiment = 0, count = 0;
        Object.values(r.llmResults).forEach(lr => {
          if (lr.sentimentScore && !lr.error) { totalSentiment += lr.sentimentScore; count++; }
        });
        const avgSentiment = count > 0 ? Math.round(totalSentiment / count * 10) / 10 : 5;
        leaderScores.push({ name: label.replace(':', ' -'), score: avgSentiment });
      }
    });
    return leaderScores;
  };

  const getBacklinkComparison = () => {
    if (!results) return { userBacklinks: [], competitorBacklinks: [], missingBacklinks: [] };
    
    const userBacklinks = new Set();
    const competitorBacklinks = [];
    
    Object.entries(results).forEach(([label, r]) => {
      if (r.type === 'website') {
        Object.values(r.llmResults).forEach(lr => {
          lr.backlinks?.forEach(bl => userBacklinks.add(bl.url));
        });
      }
      if (r.type === 'competitor') {
        Object.values(r.llmResults).forEach(lr => {
          lr.backlinks?.forEach(bl => {
            if (!userBacklinks.has(bl.url)) {
              competitorBacklinks.push({ ...bl, competitor: label });
            }
          });
        });
      }
    });
    
    // Sort by domain authority and get top 3
    const sorted = competitorBacklinks.sort((a, b) => (b.domainAuthority || 0) - (a.domainAuthority || 0));
    return { missingBacklinks: sorted.slice(0, 3) };
  };

  const getRecommendations = () => {
    if (!results) return { press: [], podcasts: [], backlinks: [] };
    
    const press = [], podcasts = [], backlinks = [];
    
    Object.values(results).forEach(r => {
      Object.values(r.llmResults).forEach(lr => {
        lr.pressOpportunities?.forEach(p => {
          if (!press.find(x => x.outlet === p.outlet)) press.push(p);
        });
        lr.podcastOpportunities?.forEach(p => {
          if (!podcasts.find(x => x.name === p.name)) podcasts.push(p);
        });
        lr.backlinks?.forEach(b => {
          if (r.type === 'competitor' && !backlinks.find(x => x.url === b.url)) {
            backlinks.push(b);
          }
        });
      });
    });
    
    return { press: press.slice(0, 5), podcasts: podcasts.slice(0, 5), backlinks: backlinks.slice(0, 5) };
  };

  const getOverallStatus = () => {
    const score = calculateOverallScore();
    if (score >= 8) return { color: '#10B981', bg: '#10B98122', label: 'Excellent', description: 'Your entity presence is strong across AI search engines.' };
    if (score >= 6) return { color: '#3B82F6', bg: '#3B82F622', label: 'Good', description: 'Solid foundation with room for optimization.' };
    if (score >= 4) return { color: '#F59E0B', bg: '#F59E0B22', label: 'Needs Work', description: 'Moderate visibility - focused effort required.' };
    if (score >= 2) return { color: '#F97316', bg: '#F9731622', label: 'Poor', description: 'Limited AI visibility - significant action needed.' };
    return { color: '#EF4444', bg: '#EF444422', label: 'Critical', description: 'Your entity is not being recognized by AI search engines.' };
  };

  const getLLMScores = () => {
    if (!results) return {};
    const scores = {};
    selectedLLMs.forEach(id => {
      const arr = [];
      Object.values(results).forEach(r => {
        if (r.type !== 'competitor' && r.type !== 'competitor_leader') {
          if (r.llmResults[id]?.confidenceScore && !r.llmResults[id]?.error) arr.push(r.llmResults[id].confidenceScore);
        }
      });
      scores[id] = arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : 0;
    });
    return scores;
  };

  const getScoreColor = (s) => s >= 7 ? '#10B981' : s >= 4 ? '#F59E0B' : '#EF4444';
  const getResultsByType = (type) => results ? Object.entries(results).filter(([_, v]) => v.type === type) : [];

  const exportToCSV = () => {
    if (!results) return;
    let csv = 'Entity,Type,LLM,Score,Sentiment,Found,Summary\n';
    Object.entries(results).forEach(([label, r]) => {
      Object.entries(r.llmResults).forEach(([llmId, lr]) => {
        csv += `"${label}","${r.type}","${llmOptions.find(l => l.id === llmId)?.name}",${lr.confidenceScore || 0},${lr.sentimentScore || 0},${lr.entityFound || false},"${(lr.summary || '').replace(/"/g, '""')}"\n`;
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
    const status = getOverallStatus();
    const recommendations = getRecommendations();
    const leaderScores = getLeadershipScores();
    
    const html = `<!DOCTYPE html><html><head><title>Entity SEO Report - ${formData.companyName}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:40px;max-width:900px;margin:auto;color:#1B1B1B;line-height:1.6}
      .header{background:linear-gradient(135deg,#E85D04,#F48C06);color:white;padding:40px;border-radius:16px;margin-bottom:30px;text-align:center}
      .header h1{font-size:28px;margin-bottom:8px}
      .header p{opacity:0.9}
      .status-banner{background:${status.bg};border:2px solid ${status.color};border-radius:12px;padding:24px;margin-bottom:30px;text-align:center}
      .status-banner h2{color:${status.color};font-size:24px;margin-bottom:8px}
      .scores{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:30px}
      .score-box{background:#f8f9fa;padding:24px;border-radius:12px;text-align:center}
      .score-box .num{font-size:36px;font-weight:700}
      .score-box .label{font-size:12px;color:#666;margin-top:4px;text-transform:uppercase}
      .section{margin:30px 0}
      .section h2{font-size:20px;border-bottom:3px solid #E85D04;padding-bottom:8px;margin-bottom:20px}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px}
      .card h3{font-size:16px;margin-bottom:12px;color:#1B1B1B}
      .recommendation{background:#FFF7ED;border-left:4px solid #E85D04;padding:16px;margin-bottom:12px;border-radius:0 8px 8px 0}
      .leader-score{display:flex;justify-content:space-between;align-items:center;padding:12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px}
      .footer{text-align:center;margin-top:40px;padding-top:20px;border-top:2px solid #e5e7eb;color:#666}
      .footer img{height:40px;margin-bottom:12px}
      @media print{body{padding:20px}.header{break-inside:avoid}}
    </style></head><body>
    <div class="header">
      <h1>Entity-Based SEO Report</h1>
      <p>${formData.companyName || 'Company Analysis'} | Generated ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="status-banner">
      <h2>${status.label}</h2>
      <p>${status.description}</p>
    </div>
    
    <div class="scores">
      <div class="score-box"><div class="num" style="color:${getScoreColor(overall)}">${overall}</div><div class="label">Overall Score</div></div>
      <div class="score-box"><div class="num" style="color:${getScoreColor(scores.company)}">${scores.company}</div><div class="label">Company</div></div>
      <div class="score-box"><div class="num" style="color:${getScoreColor(scores.leadership)}">${scores.leadership}</div><div class="label">Leadership</div></div>
      <div class="score-box"><div class="num" style="color:${getScoreColor(scores.keywords)}">${scores.keywords}</div><div class="label">Keywords</div></div>
    </div>

    ${leaderScores.length > 0 ? `
    <div class="section">
      <h2>Leadership Sentiment Scores</h2>
      ${leaderScores.map(l => `<div class="leader-score"><span>${l.name}</span><span style="color:${getScoreColor(l.score)};font-weight:700">${l.score}/10</span></div>`).join('')}
    </div>` : ''}

    <div class="section">
      <h2>Recommended Actions</h2>
      ${recommendations.press.length > 0 ? `<div class="card"><h3>🎯 Press Opportunities</h3>${recommendations.press.map(p => `<div class="recommendation"><strong>${p.outlet}</strong> - ${p.type} (${p.relevance} relevance)</div>`).join('')}</div>` : ''}
      ${recommendations.podcasts.length > 0 ? `<div class="card"><h3>🎙️ Podcast Opportunities</h3>${recommendations.podcasts.map(p => `<div class="recommendation"><strong>${p.name}</strong> - ${p.topic}</div>`).join('')}</div>` : ''}
      ${recommendations.backlinks.length > 0 ? `<div class="card"><h3>🔗 Backlink Opportunities</h3>${recommendations.backlinks.map(b => `<div class="recommendation"><strong>${b.url}</strong> - DA: ${b.domainAuthority || 'N/A'}</div>`).join('')}</div>` : ''}
    </div>

    <div class="footer">
      <p><strong>Abstrakt Marketing Group</strong></p>
      <p>Entity SEO Checker | AI Search Visibility Analysis</p>
      <p style="margin-top:12px;font-size:12px">Ready to improve your AI visibility? Contact us at abstraktmg.com</p>
    </div>
    </body></html>`;
    
    const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.print();
  };

  const submitStrategyRequest = async () => {
    const data = { 
      timestamp: new Date().toISOString(), 
      ...strategyForm, 
      scores: results ? { overall: calculateOverallScore(), ...calculateCategoryScores() } : null 
    };
    console.log('Strategy Request:', data);
    setStrategySubmitted(true);
    setTimeout(() => { 
      setShowStrategyModal(false); 
      setStrategySubmitted(false); 
      setStrategyForm({ name: '', email: '', phone: '', company: '', website: '', goals: '', budget: '', timeline: '', currentChallenges: '', competitors: '' }); 
    }, 3000);
  };

  // Styles
  const inputStyle = { 
    width: '100%', 
    padding: '14px 18px', 
    background: '#FFFFFF', 
    border: '2px solid #E5E7EB', 
    borderRadius: '10px', 
    color: '#1B1B1B', 
    fontSize: '15px', 
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease'
  };
  const labelStyle = { 
    display: 'block', 
    fontSize: '13px', 
    fontWeight: '600', 
    color: '#4B5563', 
    marginBottom: '8px', 
    textTransform: 'uppercase', 
    letterSpacing: '0.5px' 
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1B1B1B' }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        input:focus,textarea:focus,select:focus{outline:none;border-color:#E85D04!important;box-shadow:0 0 0 3px rgba(232,93,4,0.15)!important}
        .hover-lift:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,0.1)}
      `}</style>
      
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #1B1B1B 0%, #2D2D2D 100%)', padding: '20px 48px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #E85D04 0%, #F48C06 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '24px', fontWeight: '800', color: '#FFF' }}>A</span>
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>Entity SEO Checker</h1>
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>by Abstrakt Marketing Group</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {results && (
              <>
                <button onClick={exportToCSV} className="hover-lift" style={{ padding: '10px 20px', background: 'transparent', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: '#FFF', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }}>📊 Export CSV</button>
                <button onClick={exportToPDF} className="hover-lift" style={{ padding: '10px 20px', background: 'transparent', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: '#FFF', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }}>📄 Export PDF</button>
              </>
            )}
            <button onClick={() => setShowStrategyModal(true)} className="hover-lift" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #E85D04 0%, #F48C06 100%)', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}>🚀 Get AI Strategy</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 48px' }}>
        {/* Input Form */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E5E7EB', padding: '40px', marginBottom: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          
          {/* LLM Selection */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#1B1B1B' }}>🤖 Select AI Search Engines to Test</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {llmOptions.map(llm => (
                <button key={llm.id} onClick={() => toggleLLM(llm.id)} className="hover-lift" style={{ 
                  padding: '12px 20px', 
                  background: selectedLLMs.includes(llm.id) ? `${llm.color}15` : '#F9FAFB', 
                  border: `2px solid ${selectedLLMs.includes(llm.id) ? llm.color : '#E5E7EB'}`, 
                  borderRadius: '10px', 
                  color: selectedLLMs.includes(llm.id) ? llm.color : '#6B7280', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}>
                  <span>{llm.icon}</span>{llm.name}
                  {selectedLLMs.includes(llm.id) && <span style={{ width: '20px', height: '20px', background: llm.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff' }}>✓</span>}
                </button>
              ))}
            </div>
            <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#6B7280' }}>💡 Start with 2 engines to minimize API costs. Add more for comprehensive analysis.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            {/* Left Column */}
            <div>
              <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #E85D04, #F48C06)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '14px' }}>1</span>
                Your Company
              </h2>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Company Name *</label>
                <input type="text" value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} placeholder="e.g., Abstrakt Marketing Group" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Website URL</label>
                <input type="url" value={formData.websiteUrl} onChange={(e) => handleInputChange('websiteUrl', e.target.value)} placeholder="e.g., https://www.abstraktmg.com" style={inputStyle} />
              </div>

              <h3 style={{ margin: '32px 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1B1B1B' }}>👥 Leadership Team (up to 3)</h3>
              {formData.leaders.map((leader, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <input type="text" value={leader.name} onChange={(e) => handleLeaderChange(i, 'name', e.target.value)} placeholder={`Leader ${i + 1} Name`} style={{ ...inputStyle, padding: '12px 14px' }} />
                  <input type="text" value={leader.role} onChange={(e) => handleLeaderChange(i, 'role', e.target.value)} placeholder="Role (CEO, CMO...)" style={{ ...inputStyle, padding: '12px 14px' }} />
                </div>
              ))}

              <h3 style={{ margin: '32px 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1B1B1B' }}>🔍 Target Keywords (up to 3)</h3>
              {formData.keywords.map((keyword, i) => (
                <input key={i} type="text" value={keyword} onChange={(e) => handleKeywordChange(i, e.target.value)} placeholder={`Keyword ${i + 1}`} style={{ ...inputStyle, marginBottom: '12px' }} />
              ))}
            </div>

            {/* Right Column - Competitors */}
            <div>
              <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #6B7280, #9CA3AF)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '14px' }}>2</span>
                Competitors (Optional)
              </h2>

              {formData.competitors.map((comp, i) => (
                <div key={i} style={{ background: '#F9FAFB', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
                  <label style={{ ...labelStyle, fontSize: '12px' }}>Competitor {i + 1} Website</label>
                  <input type="url" value={comp.url} onChange={(e) => handleCompetitorChange(i, 'url', e.target.value)} placeholder="https://competitor.com" style={{ ...inputStyle, marginBottom: '12px', background: '#FFF' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input type="text" value={comp.leaderName} onChange={(e) => handleCompetitorChange(i, 'leaderName', e.target.value)} placeholder="Leader Name (optional)" style={{ ...inputStyle, padding: '10px 12px', fontSize: '13px', background: '#FFF' }} />
                    <input type="text" value={comp.leaderRole} onChange={(e) => handleCompetitorChange(i, 'leaderRole', e.target.value)} placeholder="Role" style={{ ...inputStyle, padding: '10px 12px', fontSize: '13px', background: '#FFF' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={runAnalysis} disabled={isAnalyzing} className="hover-lift" style={{ 
            width: '100%', 
            padding: '18px 32px', 
            background: isAnalyzing ? '#9CA3AF' : 'linear-gradient(135deg, #E85D04 0%, #F48C06 100%)', 
            border: 'none', 
            borderRadius: '12px', 
            color: '#FFF', 
            fontSize: '16px', 
            fontWeight: '700', 
            cursor: isAnalyzing ? 'not-allowed' : 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            marginTop: '32px',
            boxShadow: isAnalyzing ? 'none' : '0 4px 15px rgba(232,93,4,0.35)',
            transition: 'all 0.2s ease'
          }}>
            {isAnalyzing ? <><div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>Analyzing...</> : <>🚀 Run Entity Analysis</>}
          </button>

          {/* Progress Bar */}
          {isAnalyzing && progress.total > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#6B7280' }}>
                <span>{progress.message}</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #E85D04 0%, #F48C06 100%)', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>
          )}

          {error && <div style={{ marginTop: '16px', padding: '16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', color: '#DC2626', fontSize: '14px' }}>{error}</div>}
        </div>

        {/* Results */}
        {results && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#FFFFFF', padding: '8px', borderRadius: '12px', border: '1px solid #E5E7EB', width: 'fit-content' }}>
              {[
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'company', label: 'Company', icon: '🏢' },
                { id: 'leader', label: 'Leadership', icon: '👥' },
                { id: 'keyword', label: 'Keywords', icon: '🔍' },
                { id: 'competitors', label: 'Competitors', icon: '⚔️' },
                { id: 'recommendations', label: 'Recommendations', icon: '💡' }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ 
                  padding: '12px 20px', 
                  background: activeTab === tab.id ? 'linear-gradient(135deg, #E85D04 0%, #F48C06 100%)' : 'transparent', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: activeTab === tab.id ? '#FFF' : '#6B7280', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}><span>{tab.icon}</span>{tab.label}</button>
              ))}
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div>
                {/* Status Banner */}
                {(() => {
                  const status = getOverallStatus();
                  return (
                    <div style={{ background: status.bg, border: `2px solid ${status.color}`, borderRadius: '16px', padding: '32px', marginBottom: '24px', textAlign: 'center' }}>
                      <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: status.color }}>{status.label}</h2>
                      <p style={{ margin: 0, fontSize: '16px', color: '#4B5563' }}>{status.description}</p>
                    </div>
                  );
                })()}

                {/* Score Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
                  {[
                    { label: 'Overall Score', score: calculateOverallScore(), icon: '📈' },
                    { label: 'Company', score: calculateCategoryScores().company, icon: '🏢' },
                    { label: 'Leadership', score: calculateCategoryScores().leadership, icon: '👥' },
                    { label: 'Keywords', score: calculateCategoryScores().keywords, icon: '🔍' }
                  ].map(item => (
                    <div key={item.label} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                      <div style={{ fontSize: '42px', fontWeight: '700', color: getScoreColor(item.score) }}>{item.score}</div>
                      <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* Leadership Sentiment Scores */}
                {getLeadershipScores().length > 0 && (
                  <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B' }}>👤 Leadership Sentiment Scores</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {getLeadershipScores().map((leader, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#F9FAFB', borderRadius: '10px' }}>
                          <span style={{ fontWeight: '500' }}>{leader.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '120px', height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${leader.score * 10}%`, height: '100%', background: getScoreColor(leader.score), borderRadius: '4px' }}></div>
                            </div>
                            <span style={{ fontWeight: '700', color: getScoreColor(leader.score), minWidth: '45px' }}>{leader.score}/10</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LLM Comparison */}
                <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B' }}>🤖 AI Engine Comparison</h3>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {Object.entries(getLLMScores()).map(([llmId, score]) => {
                      const llm = llmOptions.find(l => l.id === llmId);
                      return (
                        <div key={llmId} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '150px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>{llm?.icon}</span>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{llm?.name?.split(' ')[0]}</span>
                          </div>
                          <div style={{ flex: 1, height: '24px', background: '#F3F4F6', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ width: `${score * 10}%`, height: '100%', background: llm?.color, borderRadius: '12px', transition: 'width 0.5s ease' }}></div>
                          </div>
                          <div style={{ width: '50px', textAlign: 'right', fontSize: '16px', fontWeight: '700', color: llm?.color }}>{score}/10</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Backlink Gap Analysis */}
                {(() => {
                  const { missingBacklinks } = getBacklinkComparison();
                  return missingBacklinks.length > 0 ? (
                    <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px' }}>
                      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B' }}>🔗 Backlinks You're Missing (vs Competitors)</h3>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {missingBacklinks.map((bl, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#FFF7ED', borderRadius: '10px', border: '1px solid #FDBA74' }}>
                            <div>
                              <a href={bl.url} target="_blank" rel="noopener noreferrer" style={{ color: '#E85D04', fontWeight: '500', textDecoration: 'none' }}>{bl.url}</a>
                              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>Found on: {bl.competitor}</p>
                            </div>
                            <span style={{ background: '#E85D04', color: '#FFF', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>DA: {bl.domainAuthority || 'N/A'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Recommendations Tab */}
            {activeTab === 'recommendations' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                {(() => {
                  const recs = getRecommendations();
                  return (
                    <>
                      {/* Press Opportunities */}
                      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>📰</span> Suggested Press Sources
                        </h3>
                        {recs.press.length > 0 ? (
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {recs.press.map((p, i) => (
                              <div key={i} style={{ padding: '16px', background: '#F0FDF4', borderLeft: '4px solid #10B981', borderRadius: '0 10px 10px 0' }}>
                                <strong style={{ color: '#1B1B1B' }}>{p.outlet}</strong>
                                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6B7280' }}>{p.type} • {p.relevance} relevance</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#6B7280', fontStyle: 'italic' }}>Run analysis with competitor data to get press recommendations.</p>
                        )}
                      </div>

                      {/* Podcast Opportunities */}
                      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🎙️</span> Podcast Guest Opportunities
                        </h3>
                        {recs.podcasts.length > 0 ? (
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {recs.podcasts.map((p, i) => (
                              <div key={i} style={{ padding: '16px', background: '#EFF6FF', borderLeft: '4px solid #3B82F6', borderRadius: '0 10px 10px 0' }}>
                                <strong style={{ color: '#1B1B1B' }}>{p.name}</strong>
                                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6B7280' }}>Topic: {p.topic} • Audience: {p.audienceSize}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#6B7280', fontStyle: 'italic' }}>Add leadership information to get podcast recommendations.</p>
                        )}
                      </div>

                      {/* Backlink Opportunities */}
                      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🔗</span> Backlinks to Acquire (From Competitor Analysis)
                        </h3>
                        {recs.backlinks.length > 0 ? (
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {recs.backlinks.map((b, i) => (
                              <div key={i} style={{ padding: '16px', background: '#FFF7ED', borderLeft: '4px solid #E85D04', borderRadius: '0 10px 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <a href={b.url} target="_blank" rel="noopener noreferrer" style={{ color: '#E85D04', fontWeight: '500', textDecoration: 'none' }}>{b.url}</a>
                                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6B7280' }}>Type: {b.type || 'Unknown'}</p>
                                </div>
                                <span style={{ background: '#E85D04', color: '#FFF', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>DA: {b.domainAuthority || 'N/A'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#6B7280', fontStyle: 'italic' }}>Add competitor URLs to discover backlink opportunities.</p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Company Tab */}
            {activeTab === 'company' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                {[...getResultsByType('company'), ...getResultsByType('website')].map(([label, result], idx) => (
                  <div key={label} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', animation: `fadeIn 0.5s ease ${idx * 0.1}s both` }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B' }}>{label}</h3>
                    <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#6B7280' }}>Query: "{result.query}"</p>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(selectedLLMs.length, 3)}, 1fr)`, gap: '16px' }}>
                      {Object.entries(result.llmResults).map(([llmId, lr]) => {
                        const llm = llmOptions.find(l => l.id === llmId);
                        return (
                          <div key={llmId} style={{ background: '#F9FAFB', borderRadius: '12px', padding: '20px', border: `1px solid ${llm?.color}33` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '18px' }}>{llm?.icon}</span>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: llm?.color }}>{llm?.name?.split(' ')[0]}</span>
                              </div>
                              <span style={{ background: `${getScoreColor(lr.confidenceScore)}22`, color: getScoreColor(lr.confidenceScore), padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: '700' }}>{lr.confidenceScore || 0}/10</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#4B5563' }}>{lr.summary}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Leadership Tab */}
            {activeTab === 'leader' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                {getResultsByType('leader').map(([label, result], idx) => (
                  <div key={label} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', animation: `fadeIn 0.5s ease ${idx * 0.1}s both` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B' }}>{label}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Sentiment Analysis</p>
                      </div>
                      {(() => {
                        const avgSentiment = Object.values(result.llmResults).reduce((sum, lr) => sum + (lr.sentimentScore || 5), 0) / Object.values(result.llmResults).length;
                        return (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: getScoreColor(avgSentiment) }}>{Math.round(avgSentiment * 10) / 10}</div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>Sentiment</div>
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(selectedLLMs.length, 3)}, 1fr)`, gap: '16px' }}>
                      {Object.entries(result.llmResults).map(([llmId, lr]) => {
                        const llm = llmOptions.find(l => l.id === llmId);
                        return (
                          <div key={llmId} style={{ background: '#F9FAFB', borderRadius: '12px', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                              <span>{llm?.icon}</span>
                              <span style={{ fontWeight: '600', color: llm?.color }}>{llm?.name?.split(' ')[0]}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: '#4B5563' }}>{lr.summary}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Keywords Tab */}
            {activeTab === 'keyword' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                {getResultsByType('keyword').map(([label, result], idx) => (
                  <div key={label} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', animation: `fadeIn 0.5s ease ${idx * 0.1}s both` }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B' }}>{label}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(selectedLLMs.length, 3)}, 1fr)`, gap: '16px' }}>
                      {Object.entries(result.llmResults).map(([llmId, lr]) => {
                        const llm = llmOptions.find(l => l.id === llmId);
                        return (
                          <div key={llmId} style={{ background: '#F9FAFB', borderRadius: '12px', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{llm?.icon} <strong style={{ color: llm?.color }}>{llm?.name?.split(' ')[0]}</strong></span>
                              <span style={{ background: lr.entityFound ? '#10B98122' : '#EF444422', color: lr.entityFound ? '#10B981' : '#EF4444', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{lr.entityFound ? 'Found' : 'Not Found'}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: '#4B5563' }}>{lr.summary}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Competitors Tab */}
            {activeTab === 'competitors' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                {[...getResultsByType('competitor'), ...getResultsByType('competitor_leader')].map(([label, result], idx) => (
                  <div key={label} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', animation: `fadeIn 0.5s ease ${idx * 0.1}s both` }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1B1B1B' }}>{label}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(selectedLLMs.length, 2)}, 1fr)`, gap: '16px' }}>
                      {Object.entries(result.llmResults).map(([llmId, lr]) => {
                        const llm = llmOptions.find(l => l.id === llmId);
                        return (
                          <div key={llmId} style={{ background: '#F9FAFB', borderRadius: '12px', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                              {llm?.icon} <strong style={{ color: llm?.color }}>{llm?.name?.split(' ')[0]}</strong>
                              <span style={{ marginLeft: 'auto', fontWeight: '700', color: getScoreColor(lr.confidenceScore) }}>{lr.confidenceScore}/10</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: '#4B5563' }}>{lr.summary}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {getResultsByType('competitor').length === 0 && (
                  <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px dashed #E5E7EB', padding: '60px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚔️</div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1B1B1B' }}>No Competitors Added</h3>
                    <p style={{ margin: 0, color: '#6B7280' }}>Add competitor URLs above to compare your entity visibility.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!results && !isAnalyzing && (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: '#FFFFFF', borderRadius: '20px', border: '1px dashed #E5E7EB' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔍</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: '700', color: '#1B1B1B' }}>Ready to Analyze Your Entity Visibility</h3>
            <p style={{ margin: 0, fontSize: '16px', color: '#6B7280', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
              Enter your company information and see how AI search engines perceive your brand.
            </p>
          </div>
        )}
      </main>

      {/* Strategy Modal */}
      {showStrategyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={(e) => e.target === e.currentTarget && setShowStrategyModal(false)}>
          <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '40px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            {!strategySubmitted ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1B1B1B' }}>Get Your AI Search Strategy</h2>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>Our team will create a custom strategy to improve your visibility.</p>
                  </div>
                  <button onClick={() => setShowStrategyModal(false)} style={{ width: '36px', height: '36px', background: '#F3F4F6', border: 'none', borderRadius: '8px', color: '#6B7280', fontSize: '18px', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>Name *</label><input type="text" value={strategyForm.name} onChange={(e) => setStrategyForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Email *</label><input type="email" value={strategyForm.email} onChange={(e) => setStrategyForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>Phone</label><input type="tel" value={strategyForm.phone} onChange={(e) => setStrategyForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Company</label><input type="text" value={strategyForm.company || formData.companyName} onChange={(e) => setStrategyForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} /></div>
                  </div>
                  <div><label style={labelStyle}>AI Visibility Goals *</label><textarea value={strategyForm.goals} onChange={(e) => setStrategyForm(p => ({ ...p, goals: e.target.value }))} rows={3} placeholder="What do you want to achieve with AI search?" style={{ ...inputStyle, resize: 'vertical' }} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>Budget Range</label><select value={strategyForm.budget} onChange={(e) => setStrategyForm(p => ({ ...p, budget: e.target.value }))} style={inputStyle}><option value="">Select...</option><option value="under-5k">Under $5k/mo</option><option value="5k-10k">$5k-$10k/mo</option><option value="10k-25k">$10k-$25k/mo</option><option value="25k+">$25k+/mo</option></select></div>
                    <div><label style={labelStyle}>Timeline</label><select value={strategyForm.timeline} onChange={(e) => setStrategyForm(p => ({ ...p, timeline: e.target.value }))} style={inputStyle}><option value="">Select...</option><option value="asap">ASAP</option><option value="1-month">Within 1 month</option><option value="1-3-months">1-3 months</option></select></div>
                  </div>
                  {results && (
                    <div style={{ padding: '16px', background: '#FFF7ED', borderRadius: '10px', border: '1px solid #FDBA74' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#E85D04', marginBottom: '8px' }}>YOUR CURRENT SCORES</div>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                        <span>Overall: <strong>{calculateOverallScore()}</strong></span>
                        <span>Company: <strong>{calculateCategoryScores().company}</strong></span>
                        <span>Leadership: <strong>{calculateCategoryScores().leadership}</strong></span>
                      </div>
                    </div>
                  )}
                  <button onClick={submitStrategyRequest} disabled={!strategyForm.name || !strategyForm.email || !strategyForm.goals} style={{ width: '100%', padding: '16px', background: (!strategyForm.name || !strategyForm.email || !strategyForm.goals) ? '#E5E7EB' : 'linear-gradient(135deg, #E85D04 0%, #F48C06 100%)', border: 'none', borderRadius: '10px', color: (!strategyForm.name || !strategyForm.email || !strategyForm.goals) ? '#9CA3AF' : '#FFF', fontSize: '16px', fontWeight: '600', cursor: (!strategyForm.name || !strategyForm.email || !strategyForm.goals) ? 'not-allowed' : 'pointer', marginTop: '8px' }}>Submit Request</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #10B981, #34D399)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '40px', color: '#FFF' }}>✓</div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: '700', color: '#1B1B1B' }}>Request Submitted!</h3>
                <p style={{ margin: 0, fontSize: '16px', color: '#6B7280' }}>Our team will reach out within 24-48 hours.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '40px', borderTop: '1px solid #E5E7EB', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #E85D04, #F48C06)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#FFF', fontWeight: '800', fontSize: '16px' }}>A</span>
          </div>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#1B1B1B' }}>Abstrakt Marketing Group</span>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>Entity SEO Checker • AI Search Visibility Analysis</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#9CA3AF' }}>
          <a href="https://www.abstraktmg.com" target="_blank" rel="noopener noreferrer" style={{ color: '#E85D04', textDecoration: 'none' }}>abstraktmg.com</a> • (314) 338-8865
        </p>
      </footer>
    </div>
  );
};

export default EntitySEOChecker;
