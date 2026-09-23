import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AnalysisResult } from '../types';
import { Card, CardHeader, Overline, SevBadge, Mono, sev } from './ui';

interface Props {
  results: AnalysisResult;
}

export const ReportExport: React.FC<Props> = ({ results }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const execRef = useRef<HTMLDivElement>(null);
  const techRef = useRef<HTMLDivElement>(null);

  const exportPDF = async (type: 'executive' | 'technical') => {
    setIsExporting(true);
    setShowOptions(false);
    
    try {
      const el = type === 'executive' ? execRef.current : techRef.current;
      if (!el) return;
      
      // Briefly show the element to capture it
      el.style.display = 'block';
      const canvas = await html2canvas(el, { scale: 2 });
      el.style.display = 'none';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`IPsec_Sentinel_${type}_Report.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const s = sev(results.risk.risk_label);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="transition-default"
        disabled={isExporting}
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          color: 'var(--color-text-1)',
          backgroundColor: 'transparent',
          padding: '8px 16px',
          border: '1px solid var(--color-border)',
          cursor: isExporting ? 'wait' : 'pointer',
          opacity: isExporting ? 0.5 : 1,
        }}
      >
        {isExporting ? 'Generating PDF...' : 'Export Report'}
      </button>

      {showOptions && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: '8px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          zIndex: 100,
          minWidth: '200px'
        }}>
          <button 
            onClick={() => exportPDF('executive')}
            style={{ textAlign: 'left', padding: '8px', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-1)', fontSize: 'var(--text-sm)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-well)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
          >
            <strong>Executive Report</strong>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>1-page high-level summary</div>
          </button>
          <button 
            onClick={() => exportPDF('technical')}
            style={{ textAlign: 'left', padding: '8px', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-1)', fontSize: 'var(--text-sm)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-well)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
          >
            <strong>Technical Report</strong>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>Detailed parameters & SHAP values</div>
          </button>
        </div>
      )}

      {/* Hidden Render Areas for PDF Generation */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '210mm', opacity: 0, pointerEvents: 'none' }}>
        
        {/* Executive Report */}
        <div ref={execRef} style={{ display: 'none', padding: '40px', backgroundColor: '#000', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>IPsec Sentinel - Executive Summary</h1>
            <div style={{ color: '#888', fontSize: '12px' }}>Generated securely via local audit node.</div>
          </div>
          
          <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
            <div style={{ flex: 1, backgroundColor: '#111', padding: '24px', border: '1px solid #222' }}>
              <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Risk Assessment</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '48px', fontWeight: 700, color: s.fg }}>{results.risk.risk_score.toFixed(1)}</span>
                <span style={{ fontSize: '18px', color: '#888' }}>/100</span>
              </div>
              <div style={{ marginTop: '8px', color: s.fg, fontWeight: 500, padding: '4px 8px', border: `1px solid ${s.border}`, display: 'inline-block' }}>
                {results.risk.risk_label.toUpperCase()}
              </div>
            </div>
            
            <div style={{ flex: 1, backgroundColor: '#111', padding: '24px', border: '1px solid #222' }}>
              <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Post-Quantum Status</div>
              <div style={{ fontSize: '24px', fontWeight: 500, color: results.pqc.pqc_score > 60 ? '#22c55e' : (results.pqc.pqc_score > 30 ? '#eab308' : '#ef4444'), marginBottom: '8px' }}>
                {results.pqc.pqc_status}
              </div>
              <div style={{ fontSize: '14px', color: '#ccc' }}>Readiness Score: {results.pqc.pqc_score.toFixed(1)}/100</div>
            </div>
          </div>
          
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Verdict summary</div>
            <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#ccc' }}>
              {results.risk.flagged_issues.length > 0 ? results.risk.flagged_issues[0] : 'The tunnel configuration meets baseline security expectations with no critical immediate vulnerabilities identified.'}
            </p>
            {results.risk.metadata_exposure && (
              <p style={{ fontSize: '14px', color: results.risk.metadata_exposure.includes('Public') ? '#ef4444' : '#888', marginTop: '12px' }}>
                Metadata Exposure: {results.risk.metadata_exposure}
              </p>
            )}
          </div>
          
          <div style={{ borderTop: '1px solid #333', paddingTop: '20px', color: '#666', fontSize: '10px' }}>
            Report Hash: {results.audit.report_hash}
          </div>
        </div>
        
        {/* Technical Report */}
        <div ref={techRef} style={{ display: 'none', padding: '40px', backgroundColor: '#000', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>IPsec Sentinel - Technical Audit Report</h1>
            <div style={{ color: '#888', fontSize: '12px', wordBreak: 'break-all' }}>Hash: {results.audit.report_hash}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
             <div style={{ backgroundColor: '#111', padding: '16px', border: '1px solid #222' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Risk Verdict</div>
                <div style={{ fontSize: '24px', color: s.fg }}>{results.risk.risk_score.toFixed(1)} - {results.risk.risk_label}</div>
                {results.risk.risk_confidence !== undefined && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>AI Confidence: {results.risk.risk_confidence}%</div>
                )}
             </div>
             <div style={{ backgroundColor: '#111', padding: '16px', border: '1px solid #222' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>ESP Traffic Analysis</div>
                <div style={{ fontSize: '16px', color: '#ccc' }}>Predicted: {results.risk.traffic_type || 'N/A'}</div>
                {results.risk.traffic_confidence !== undefined && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>AI Confidence: {results.risk.traffic_confidence}%</div>
                )}
                <div style={{ fontSize: '14px', color: results.risk.is_esp_anomaly ? '#ef4444' : '#22c55e', marginTop: '8px' }}>
                  {results.risk.esp_anomaly_status} (Score: {results.risk.esp_anomaly_score})
                </div>
             </div>
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>Extracted Parameters</div>
            <pre style={{ margin: 0, padding: '16px', backgroundColor: '#111', border: '1px solid #222', fontSize: '12px', color: '#ccc', overflow: 'hidden' }}>
              {JSON.stringify(results.ipsec_request, null, 2)}
            </pre>
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>SHAP Explainability (Top Factors)</div>
            <ul style={{ paddingLeft: '20px', color: '#ccc', fontSize: '14px', lineHeight: '1.6' }}>
              {Object.entries(results.risk.top_contributing_factors).map(([k, v]) => (
                <li key={k}>{k}: <span style={{ color: v > 0 ? s.fg : '#ef4444' }}>{v > 0 ? '+' : ''}{v.toFixed(3)}</span></li>
              ))}
            </ul>
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>PQC Breakdown</div>
            <ul style={{ paddingLeft: '20px', color: '#ccc', fontSize: '14px', lineHeight: '1.6' }}>
              {Object.entries(results.pqc.details).map(([k, v]) => (
                <li key={k}>{k}: {v.status} - {v.reason}</li>
              ))}
            </ul>
          </div>

          <div>
             <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>Raw Config Recommendations</div>
             <pre style={{ margin: 0, padding: '16px', backgroundColor: '#111', border: '1px solid #222', fontSize: '12px', color: '#ccc', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
               {results.remediation.config_diff || 'No specific config remediation provided.'}
             </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
