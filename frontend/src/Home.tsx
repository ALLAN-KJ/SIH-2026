import { useState } from 'react';
import { UploadSimple, Target, Play, ArrowRight } from '@phosphor-icons/react';

interface HomeProps {
  onNavigate: (mode: 'passive' | 'active' | 'demo') => void;
}

export function Home({ onNavigate }: HomeProps) {
  const [liveHealth, setLiveHealth] = useState(true);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '32px 48px',
      }}>
        <div style={{
          fontFamily: 'Fira Code, monospace',
          fontWeight: 700,
          fontSize: '18px',
          letterSpacing: '-0.02em',
        }}>
          IPsec VPN Protocol Analyzer
        </div>
        <button 
          onClick={() => onNavigate('passive')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'transparent',
            color: '#a3a3a3',
            border: '1px solid #333',
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = '#555';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#a3a3a3';
            e.currentTarget.style.borderColor = '#333';
          }}
        >
          Console <ArrowRight size={16} />
        </button>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '48px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: '80px',
        alignItems: 'start',
      }}>
        
        {/* Left Column */}
        <div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            marginBottom: '16px',
            marginTop: 0,
          }}>
            Analyse IPsec VPN security.
          </h1>
          <p style={{
            color: '#a3a3a3',
            fontSize: '16px',
            lineHeight: 1.6,
            maxWidth: '560px',
            marginBottom: '64px',
          }}>
            Upload a packet capture or probe a live target. Get a Security Score, cryptographic strength evaluation, configuration compliance recommendations, and a tamper-evident audit record.
          </p>

          <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '16px' }}>
            CHOOSE YOUR ANALYSIS MODE
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Card 1 */}
            <button
              onClick={() => onNavigate('passive')}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px',
                padding: '24px',
                backgroundColor: 'transparent',
                border: '1px solid #333',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#666'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
            >
              <div style={{ color: '#d4d4d4', border: '1px solid #333', padding: '12px' }}>
                <UploadSimple size={24} color="#eab308" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                  Upload PCAP <ArrowRight size={16} />
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>
                  Drop a .pcap or .pcapng — offline analysis, no traffic sent
                </div>
              </div>
            </button>

            {/* Card 2 (Active state like reference image) */}
            <button
              onClick={() => onNavigate('active')}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px',
                padding: '24px',
                backgroundColor: 'rgba(234, 88, 12, 0.05)',
                border: '1px solid #ea580c',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ color: '#ea580c', border: '1px solid rgba(234, 88, 12, 0.3)', padding: '12px' }}>
                <Target size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                  Active Probe <ArrowRight size={16} />
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>
                  Send live IKE handshakes to a target you own and are authorized to test
                </div>
              </div>
            </button>

            {/* Card 3 */}
            <button
              onClick={() => onNavigate('demo')}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px',
                padding: '24px',
                backgroundColor: 'transparent',
                border: '1px solid #333',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#666'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
            >
              <div style={{ color: '#2dd4bf', border: '1px solid #333', padding: '12px' }}>
                <Play size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                  Guided Demo <ArrowRight size={16} />
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>
                  Walk through a pre-loaded critical-risk scenario with step-by-step explanations
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '16px' }}>
            SYSTEM STATUS
          </div>
          
          <div style={{ border: '1px solid #222', marginBottom: '16px' }}>
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '12px' }}>BACKEND</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2dd4bf' }} />
                Online
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid #222', marginBottom: '16px' }}>
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '12px' }}>PROTOCOLS</div>
              <div style={{ fontFamily: 'Fira Code, monospace', fontSize: '14px', color: '#d4d4d4' }}>
                IKEv1 · IKEv2
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid #222', marginBottom: '48px' }}>
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '12px' }}>STANDARD</div>
              <div style={{ fontFamily: 'Fira Code, monospace', fontSize: '14px', color: '#d4d4d4' }}>
                NIST SP 800-77r1
              </div>
            </div>
          </div>

          <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '16px' }}>
            PREFERENCES
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#d4d4d4', marginBottom: '4px' }}>Live health polling</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Pings /health every 30 s</div>
            </div>
            <div 
              onClick={() => setLiveHealth(!liveHealth)}
              style={{
                width: '36px',
                height: '20px',
                borderRadius: '10px',
                backgroundColor: liveHealth ? '#2dd4bf' : '#333',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#000',
                position: 'absolute',
                top: '2px',
                left: liveHealth ? '18px' : '2px',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '32px',
        textAlign: 'center',
        borderTop: '1px solid #222',
        marginTop: 'auto',
      }}>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Built for SIH 2026 · Problem Statement 26160 · NTRO · Blockchain & Cybersecurity
        </div>
      </footer>
    </div>
  );
}
