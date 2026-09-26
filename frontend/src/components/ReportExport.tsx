/**
 * ReportExport — PDF report generation for IPsec VPN Protocol Analyzer
 *
 * SIH 2026 · PS 26160 · NTRO
 *
 * Design decision: uses jsPDF native text/line/rect primitives only.
 * No html2canvas, no DOM rasterization, no PNG embedding.
 * This is what reduced the file size from ~15 MB to ~60-120 KB.
 *
 * The report is a single unified document (Executive Summary + Technical
 * Detail) — the two-dropdown design has been removed per Phase 5 spec.
 *
 * Severity colors are printed as actual text color in the PDF, not as
 * a screenshot of the DOM, so they survive the print pipeline correctly.
 */
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import type { AnalysisResult } from '../types';
import type { AnalysisMetadata } from '../App';
import { FilePdf } from '@phosphor-icons/react';

interface Props {
  results: AnalysisResult;
  metadata: AnalysisMetadata;
}

/* ─── Severity → print-safe RGB (CMYK-friendly dark-text equivalents) ─── */
function sevRgb(label: string): [number, number, number] {
  const l = label?.toLowerCase() ?? '';
  if (l === 'critical') return [220, 38, 38];    // red-600
  if (l === 'weak' || l === 'high') return [194, 65, 12];   // orange-700
  if (l === 'moderate' || l === 'medium') return [146, 64, 14]; // amber-700
  if (l === 'strong' || l === 'low') return [4, 120, 87];   // emerald-700
  return [100, 100, 100]; // gray fallback
}

function pqcRgb(status: string): [number, number, number] {
  if (status === 'Quantum-Safe') return [4, 120, 87];
  if (status === 'Unrecognized') return [146, 64, 14];
  return [220, 38, 38];
}

/* ─── PDF renderer ─── */
function generateReport(results: AnalysisResult, metadata: AnalysisMetadata): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;      // A4 width mm
  const ML = 16;      // margin left
  const MR = 16;      // margin right
  const CW = W - ML - MR; // content width
  let y = 0;          // current y cursor

  /* ── Color helpers ── */
  const setColor = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
  const setBlack = () => doc.setTextColor(20, 20, 20);
  const setGray = () => doc.setTextColor(100, 100, 100);
  const setDarkGray = () => doc.setTextColor(60, 60, 60);

  const setDrawColor = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);
  const setFillColor = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);

  /* ── Page management ── */
  const newPageIfNeeded = (needed: number = 20) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 16;
    }
  };

  /* ── Typography helpers ── */
  const h2 = (text: string, r = 20, g = 20, b = 20) => {
    newPageIfNeeded(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(r, g, b);
    doc.text(text.toUpperCase(), ML, y);
    setDrawColor(r, g, b);
    doc.setLineWidth(0.4);
    doc.line(ML, y + 1.5, ML + CW, y + 1.5);
    setBlack();
    y += 8;
  };

  const body = (text: string, indent = 0) => {
    newPageIfNeeded(6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setDarkGray();
    const lines = doc.splitTextToSize(text, CW - indent);
    doc.text(lines, ML + indent, y);
    y += lines.length * 4.5;
  };

  const kv = (key: string, value: string, valueRgb?: [number, number, number]) => {
    newPageIfNeeded(6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setGray();
    doc.text(key + ':', ML, y);
    doc.setFont('helvetica', 'normal');
    if (valueRgb) setColor(...valueRgb); else setDarkGray();
    doc.text(value, ML + 48, y);
    setBlack();
    y += 5;
  };

  const spacer = (mm = 5) => { y += mm; };
  const warningBox = (text: string, rgb: [number, number, number]) => {
    newPageIfNeeded(14);
    setFillColor(rgb[0], rgb[1], rgb[2]);
    setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(0.3);
    // Left accent bar
    doc.rect(ML, y - 1, 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor(...rgb);
    const lines = doc.splitTextToSize(text, CW - 6);
    doc.text(lines, ML + 4, y + 3);
    setBlack();
    y += Math.max(10, lines.length * 4 + 4);
  };

  const tableRow = (
    cols: string[],
    widths: number[],
    isBold = false,
    rgbs?: Array<[number, number, number] | null>
  ) => {
    newPageIfNeeded(7);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    let x = ML;
    cols.forEach((col, i) => {
      if (rgbs?.[i]) setColor(...rgbs[i]!); else isBold ? setGray() : setDarkGray();
      const lines = doc.splitTextToSize(col, widths[i] - 2);
      doc.text(lines, x, y);
      x += widths[i];
    });
    setBlack();
    y += 5.5;
    setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    doc.line(ML, y - 0.5, ML + CW, y - 0.5);
  };

  /* ══════════════════════════════════════════════════════════
     REPORT CONTENT
  ══════════════════════════════════════════════════════════ */
  y = 16;

  /* Cover / Title */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  setBlack();
  doc.text('IPsec VPN Protocol Analyzer', ML, y);
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setGray();
  doc.text('Security Assessment Report', ML, y);
  y += 7;
  doc.setFontSize(8);
  doc.text('SIH 2026 · Problem Statement 26160 · NTRO · Blockchain & Cybersecurity', ML, y);
  y += 6;
  doc.text(`Generated: ${new Date(metadata.timestamp).toLocaleString()}`, ML, y);
  y += 3;
  setDrawColor(20, 20, 20);
  doc.setLineWidth(0.6);
  doc.line(ML, y, ML + CW, y);
  y += 8;

  /* AI disclaimer */
  warningBox(
    'AI-GENERATED ANALYSIS — REVIEW BEFORE APPLYING TO PRODUCTION SYSTEMS. ' +
    'Risk classification and configuration compliance output are machine-generated ' +
    'starting points, not certified security assessments.',
    [194, 65, 12]
  );

  spacer(4);

  /* ── Section 1: Source Metadata ── */
  h2('1  Source Metadata');
  kv('Source file', metadata.sourceName);
  kv('Input type', metadata.sourceType === 'probe' ? 'Live Active IKE Probe' :
                    metadata.sourceType === 'sample' ? 'Sample PCAP (demonstration)' : 'Uploaded PCAP');
  kv('Analysis time', new Date(metadata.timestamp).toLocaleString());
  if (results.ipsec_request.esp_features?.esp_packet_count !== undefined) {
    kv('ESP packets', String(results.ipsec_request.esp_features.esp_packet_count));
  }
  spacer(6);

  /* ── Section 2: Risk Assessment ── */
  const rRgb = sevRgb(results.risk.risk_label);
  h2('2  Risk Assessment', ...rRgb);

  // Score boxes side-by-side manually
  newPageIfNeeded(28);
  // Risk score box (left)
  setDrawColor(...rRgb);
  doc.setLineWidth(0.4);
  doc.rect(ML, y, CW / 2 - 4, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  setColor(...rRgb);
  doc.text(results.risk.risk_score.toFixed(1), ML + 5, y + 13);
  doc.setFontSize(8);
  setGray();
  doc.text('/100  RISK SCORE', ML + 5, y + 18);
  doc.setFontSize(9);
  setColor(...rRgb);
  doc.text(results.risk.risk_label.toUpperCase(), ML + 5, y + 21);

  // PQC box (right)
  const pqcRgbVal = pqcRgb(results.pqc.pqc_status);
  const rX = ML + CW / 2 + 4;
  setDrawColor(...pqcRgbVal);
  doc.rect(rX, y, CW / 2 - 4, 22);
  doc.setFontSize(16);
  setColor(...pqcRgbVal);
  doc.text(String(results.pqc.pqc_score), rX + 5, y + 12);
  doc.setFontSize(8);
  setGray();
  doc.text('/100  PQC READINESS', rX + 5, y + 17);
  doc.setFontSize(8);
  setColor(...pqcRgbVal);
  doc.text(results.pqc.pqc_status.toUpperCase(), rX + 5, y + 21);
  y += 28;

  if (results.risk.risk_confidence !== undefined) {
    kv('Model confidence', `${results.risk.risk_confidence.toFixed(1)}%  (XGBoost calibrated)`);
  }

  spacer(4);
  if (results.risk.flagged_issues.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setDarkGray();
    doc.text('Flagged Issues:', ML, y);
    y += 5;
    results.risk.flagged_issues.forEach((issue) => {
      body(`• ${issue}`, 4);
    });
  } else {
    body('No critical issues flagged by the rule engine.');
  }

  if (results.risk.metadata_exposure) {
    spacer(3);
    const meRgb = results.risk.metadata_exposure.toLowerCase().includes('public')
      ? sevRgb('Critical') : [100, 100, 100] as [number, number, number];
    kv('Metadata Exposure', results.risk.metadata_exposure, meRgb);
  }
  spacer(6);

  /* ── Section 3: ESP Traffic Analysis ── */
  h2('3  ESP Traffic Analysis');
  kv('Predicted traffic type', results.risk.traffic_type || 'N/A');
  if (results.risk.traffic_confidence !== undefined) {
    kv('Traffic classifier confidence', `${results.risk.traffic_confidence.toFixed(1)}%`);
  }
  const espRgb = results.risk.is_esp_anomaly ? sevRgb('Critical') : sevRgb('Strong');
  kv('Anomaly detection status', results.risk.esp_anomaly_status || 'N/A', espRgb);
  if (results.risk.esp_anomaly_score !== undefined) {
    kv('Anomaly score', results.risk.esp_anomaly_score.toFixed(4));
  }
  spacer(6);

  /* ── Section 4: Detected Configuration ── */
  h2('4  Detected Configuration');
  const paramW = [48, 40, CW - 88];
  tableRow(['Parameter', 'Current Value', 'NIST SP 800-77 Recommended'], paramW, true);

  const cfgRows: Array<[string, string, string, [number, number, number] | null]> = [
    ['IKE Version', results.ipsec_request.ike_version, 'IKEv2',
      results.ipsec_request.ike_version === 'IKEv2' ? sevRgb('Strong') : sevRgb('Critical')],
    ['Operation Mode', results.ipsec_request.operation_mode, 'Tunnel', null],
    ['Encryption Algorithm', results.ipsec_request.encryption_algorithm, 'AES-256-GCM',
      ['DES', '3DES', 'RC4'].includes(results.ipsec_request.encryption_algorithm)
        ? sevRgb('Critical') : sevRgb('Strong')],
    ['Hash Algorithm', results.ipsec_request.hash_algorithm, 'SHA-384 or SHA-512',
      ['MD5', 'SHA1'].includes(results.ipsec_request.hash_algorithm)
        ? sevRgb('Critical') : sevRgb('Strong')],
    ['DH Group', String(results.ipsec_request.dh_group), 'Group 19, 20, 21, or 31 (ECDH)',
      results.ipsec_request.dh_group < 14 ? sevRgb('Critical')
        : results.ipsec_request.dh_group < 19 ? sevRgb('Moderate') : sevRgb('Strong')],
    ['Key Length (bits)', String(results.ipsec_request.key_length_bits), '≥ 256 bits',
      results.ipsec_request.key_length_bits < 128 ? sevRgb('Critical')
        : results.ipsec_request.key_length_bits < 256 ? sevRgb('Moderate') : sevRgb('Strong')],
    ['Perfect Forward Secrecy', results.ipsec_request.pfs_enabled ? 'Enabled' : 'Disabled', 'Enabled (required)',
      results.ipsec_request.pfs_enabled ? sevRgb('Strong') : sevRgb('Critical')],
    ['SA Lifetime', `${results.ipsec_request.sa_lifetime_seconds}s`, '≤ 86 400s (IKE) / ≤ 28 800s (IPsec)',
      results.ipsec_request.sa_lifetime_seconds > 86400 ? sevRgb('Weak') : null],
    ['Authentication Method', results.ipsec_request.auth_method || 'Unknown', 'Certificate (RSA / ECDSA)', null],
    ['IP Version', results.ipsec_request.ip_version, 'IPv4 or IPv6', null],
  ];

  if (results.ipsec_request.esp_features) {
    cfgRows.push(['ESP Packets Analyzed', `${results.ipsec_request.esp_features.esp_packet_count}`, 'N/A', null]);
  }

  cfgRows.forEach(([param, current, rec, rgb]) => {
    tableRow([param, current, rec], paramW, false, [null, rgb, sevRgb('Strong')]);
  });
  spacer(6);

  /* ── Section 5: Post-Quantum Readiness ── */
  h2('5  Post-Quantum Readiness Assessment', ...pqcRgbVal);
  kv('PQC Status', results.pqc.pqc_status, pqcRgbVal);
  kv('PQC Readiness Score', `${results.pqc.pqc_score}/100`);
  spacer(3);
  body(
    'NOTE: IANA identifiers for ML-KEM and FIPS 203 algorithm identifiers in IKEv2 are still in draft. ' +
    'This assessment is an estimated heuristic based on DH group classification and key/hash lengths, ' +
    'not a certified NIST evaluation.'
  );
  spacer(3);
  if (results.pqc.details) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setGray();
    doc.text('PQC Factor Breakdown:', ML, y);
    y += 5;
    Object.entries(results.pqc.details).forEach(([k, v]: [string, any]) => {
      const factRgb = v.status === 'Pass' ? sevRgb('Strong') : sevRgb('Critical');
      kv(`  ${k}`, `${v.status} — ${v.reason}`, factRgb);
    });
  }
  spacer(6);

  /* ── Section 6: SHAP Explainability ── */
  h2('6  Risk Classification Explainability (SHAP)');
  body(
    'SHAP (SHapley Additive exPlanations) values show how much each extracted feature contributed ' +
    'to the XGBoost risk verdict. Positive values increase risk; negative values reduce risk.'
  );
  spacer(3);
  Object.entries(results.risk.top_contributing_factors).forEach(([k, val]) => {
    const v = val as number;
    const rgb = v > 0 ? sevRgb('Critical') : sevRgb('Strong');
    kv(`  ${k}`, `${v > 0 ? '+' : ''}${v.toFixed(4)}`, rgb);
  });
  spacer(6);

  /* ── Section 7: Configuration Compliance Output ── */
  h2('7  Configuration Compliance Output (NIST SP 800-77)');
  warningBox(
    'AI-GENERATED — The configuration below is a machine-generated starting point. ' +
    'It must be reviewed by a qualified network security engineer before deployment. ' +
    'No warranty of correctness is expressed or implied.',
    [194, 65, 12]
  );
  spacer(3);
  body(results.remediation.explanation || 'Compliance output unavailable.');
  if (results.remediation.config_diff) {
    spacer(3);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    setDarkGray();
    const codeLines = doc.splitTextToSize(results.remediation.config_diff, CW);
    // Render up to 80 lines to prevent runaway
    const cappedLines = codeLines.slice(0, 80);
    cappedLines.forEach((line: string) => {
      newPageIfNeeded(5);
      doc.text(line, ML, y);
      y += 4;
    });
    if (codeLines.length > 80) {
      doc.setFont('helvetica', 'italic');
      setGray();
      doc.text(`[... ${codeLines.length - 80} more lines — see full configuration in the UI]`, ML, y);
      y += 5;
    }
    doc.setFont('helvetica', 'normal');
  }
  spacer(6);

  /* ── Section 8: Audit Trail ── */
  h2('8  Tamper-Evident Audit Record');
  kv('Report Hash (SHA-256)', '');
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  setDarkGray();
  const hashLines = doc.splitTextToSize(results.audit.report_hash, CW);
  doc.text(hashLines, ML, y);
  y += hashLines.length * 4.5 + 2;
  if (results.audit.merkle_root) {
    kv('Merkle Root', '');
    const rootLines = doc.splitTextToSize(results.audit.merkle_root, CW);
    doc.text(rootLines, ML, y);
    y += rootLines.length * 4.5 + 2;
  }
  doc.setFont('helvetica', 'normal');
  spacer(3);
  body(
    'The audit trail uses a SQLite-backed Merkle tree with EXCLUSIVE transactions. ' +
    'This is tamper-evident (detects partial modification) but not tamper-proof against ' +
    'full database replacement. A secondary root_history table detects silent row deletion.'
  );
  spacer(8);

  /* ── Footer on every page ── */
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(ML, 287, ML + CW, 287);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setGray();
    doc.text(
      'IPsec VPN Protocol Analyzer  ·  SIH 2026 PS 26160  ·  NTRO  ·  Team K26090',
      ML, 291
    );
    doc.text(`Page ${p} of ${totalPages}`, ML + CW, 291, { align: 'right' });
  }

  const filename = `IPsec_VPN_Analysis_${metadata.sourceType}_${
    new Date(metadata.timestamp).toISOString().replace(/[:.]/g, '-').slice(0, 19)
  }.pdf`;
  doc.save(filename);
}

/* ─── Component ─── */
export const ReportExport: React.FC<Props> = ({ results, metadata }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Small timeout to let the button re-render before the synchronous PDF work
      await new Promise((r) => setTimeout(r, 60));
      generateReport(results, metadata);
    } catch (e) {
      console.error('PDF generation failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="transition-default report-hide-print"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        fontSize: 'var(--text-sm)',
        fontWeight: 600,
        color: isExporting ? 'var(--color-text-3)' : 'var(--color-ground)',
        backgroundColor: isExporting ? 'transparent' : 'var(--color-text-1)',
        padding: '8px 16px',
        border: '1px solid var(--color-text-1)',
        cursor: isExporting ? 'wait' : 'pointer',
        opacity: isExporting ? 0.6 : 1,
      }}
    >
      <FilePdf size={15} weight="bold" />
      {isExporting ? 'Generating…' : 'Export Report'}
    </button>
  );
};
