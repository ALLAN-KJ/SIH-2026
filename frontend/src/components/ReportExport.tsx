import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AnalysisResult } from '../types';
import type { AnalysisMetadata } from '../App';
import { sev } from './ui';

interface Props {
  results: AnalysisResult;
  metadata: AnalysisMetadata;
}

export const ReportExport: React.FC<Props> = ({ results, metadata }) => {
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
      pdf.save(`IPsec_VPN_Protocol_Analyzer_${type}_Report.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const s = sev(results.risk.risk_label);
  
  const renderConfigTable = () => (
    <div style={{ marginBottom: '30px' }}>
      <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>Detected vs Recommended Configuration</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#ccc', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #333' }}>
            <th style={{ padding: '8px 4px', color: '#888', fontWeight: 500 }}>Parameter</th>
            <th style={{ padding: '8px 4px', color: '#888', fontWeight: 500 }}>Current Value</th>
            <th style={{ padding: '8px 4px', color: '#888', fontWeight: 500 }}>Recommended Standard</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 4px' }}>IKE Version</td>
            <td style={{ padding: '8px 4px' }}>{results.ipsec_request.ike_version}</td>
            <td style={{ padding: '8px 4px', color: '#22c55e' }}>IKEv2</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 4px' }}>Mode</td>
            <td style={{ padding: '8px 4px' }}>{results.ipsec_request.operation_mode}</td>
            <td style={{ padding: '8px 4px' }}>Tunnel</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 4px' }}>Encryption</td>
            <td style={{ padding: '8px 4px' }}>{results.ipsec_request.encryption_algorithm}</td>
            <td style={{ padding: '8px 4px', color: '#22c55e' }}>AES-256-GCM</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 4px' }}>Hash Algorithm</td>
            <td style={{ padding: '8px 4px' }}>{results.ipsec_request.hash_algorithm}</td>
            <td style={{ padding: '8px 4px', color: '#22c55e' }}>SHA384 or SHA512</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 4px' }}>DH Group</td>
            <td style={{ padding: '8px 4px' }}>{results.ipsec_request.dh_group}</td>
            <td style={{ padding: '8px 4px', color: '#22c55e' }}>Group 19, 20, 21 or 31</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 4px' }}>PFS Status</td>
            <td style={{ padding: '8px 4px' }}>{results.ipsec_request.pfs_enabled ? 'Enabled' : 'Disabled'}</td>
            <td style={{ padding: '8px 4px', color: '#22c55e' }}>Enabled</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 4px' }}>SA Lifetime</td>
            <td style={{ padding: '8px 4px' }}>{results.ipsec_request.sa_lifetime_seconds}s</td>
            <td style={{ padding: '8px 4px' }}>{"<= 86400s (IKE) / <= 28800s (IPsec)"}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 4px' }}>IP Version</td>
            <td style={{ padding: '8px 4px' }}>{results.ipsec_request.ip_version}</td>
            <td style={{ padding: '8px 4px' }}>Any</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderMetadata = () => (
    <div style={{ marginBottom: '30px', backgroundColor: '#111', padding: '16px', border: '1px solid #222', fontSize: '12px' }}>
      <div style={{ color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Source Metadata</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: '#ccc' }}>
        <div><strong>Source:</strong> {metadata.sourceName}</div>
        <div><strong>Type:</strong> {metadata.sourceType === 'probe' ? 'Live Active Probe' : 'PCAP Capture'}</div>
        <div><strong>Time:</strong> {new Date(metadata.timestamp).toLocaleString()}</div>
        {results.ipsec_request.esp_features && (
          <div><strong>Packets Analyzed:</strong> {results.ipsec_request.esp_features.esp_packet_count}</div>
        )}
      </div>
    </div>
  );

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
          top: '100%',
          right: 0,
          marginTop: '8px',
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
      <div style={{ position: 'fixed', top: '0', left: '-9999px', width: '210mm', opacity: 0, pointerEvents: 'none', zIndex: -9999 }}>
        
        {/* Executive Report */}
        <div ref={execRef} style={{ display: 'none', padding: '40px', backgroundColor: '#000', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>IPsec VPN Protocol Analyzer - Executive Report</h1>
            <div style={{ color: '#888', fontSize: '12px' }}>Generated securely via local audit node.</div>
          </div>
          
          <div style={{ backgroundColor: 'rgba(251,146,60,0.1)', border: '1px solid #FB923C', color: '#FB923C', padding: '12px', fontSize: '12px', marginBottom: '40px', borderRadius: '4px' }}>
            <strong>Notice:</strong> AI-generated analysis — recommended configurations should be reviewed by a qualified network/security engineer before deployment.
          </div>
          
          {renderMetadata()}

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
          
          {renderConfigTable()}
          
          <div style={{ borderTop: '1px solid #333', paddingTop: '20px', color: '#666', fontSize: '10px' }}>
            Report Hash: {results.audit.report_hash}
          </div>
        </div>
        
        {/* Technical Report */}
        <div ref={techRef} style={{ display: 'none', padding: '40px', backgroundColor: '#000', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>IPsec VPN Protocol Analyzer - Technical Report</h1>
            <div style={{ color: '#888', fontSize: '12px', wordBreak: 'break-all' }}>Hash: {results.audit.report_hash}</div>
          </div>
          
          {renderMetadata()}

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
          
          {renderConfigTable()}
          
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>Raw Extracted Parameters</div>
            <pre style={{ margin: 0, padding: '16px', backgroundColor: '#111', border: '1px solid #222', fontSize: '12px', color: '#ccc', overflow: 'hidden' }}>
              {JSON.stringify(results.ipsec_request, null, 2)}
            </pre>
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>SHAP Explainability (Top Factors)</div>
            <ul style={{ paddingLeft: '20px', color: '#ccc', fontSize: '14px', lineHeight: '1.6' }}>
              {Object.entries(results.risk.top_contributing_factors).map(([k, val]) => {
                const v = val as number;
                return <li key={k}>{k}: <span style={{ color: v > 0 ? s.fg : '#ef4444' }}>{v > 0 ? '+' : ''}{v.toFixed(3)}</span></li>;
              })}
            </ul>
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>PQC Breakdown</div>
            <ul style={{ paddingLeft: '20px', color: '#ccc', fontSize: '14px', lineHeight: '1.6' }}>
              {Object.entries(results.pqc.details).map(([k, val]) => {
                const v = val as any;
                return <li key={k}>{k}: {v.status} - {v.reason}</li>;
              })}
            </ul>
          </div>

          <div>
             <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>Raw Config Recommendations</div>
             <div style={{ backgroundColor: 'rgba(251,146,60,0.1)', border: '1px solid #FB923C', color: '#FB923C', padding: '12px', fontSize: '12px', marginBottom: '16px', borderRadius: '4px' }}>
               <strong>Notice:</strong> AI-generated analysis — recommended configurations should be reviewed by a qualified network/security engineer before deployment.
             </div>
             <pre style={{ margin: 0, padding: '16px', backgroundColor: '#111', border: '1px solid #222', fontSize: '12px', color: '#ccc', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
               {results.remediation.config_diff || 'No specific config remediation provided.'}
             </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
