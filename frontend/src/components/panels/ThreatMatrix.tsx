

export const ThreatMatrix = ({ riskLabel }: { riskLabel: string }) => {
  const getCellColor = (likelihood: string, impact: string) => {
    // Basic mapping logic just to highlight the cell corresponding to the risk label
    if (riskLabel === 'Critical' && likelihood === 'High' && impact === 'High') return 'var(--color-crit)';
    if ((riskLabel === 'Weak' || riskLabel === 'High') && likelihood === 'Medium' && impact === 'High') return 'var(--color-weak)';
    if ((riskLabel === 'Moderate' || riskLabel === 'Medium') && likelihood === 'Medium' && impact === 'Medium') return 'var(--color-mod)';
    if ((riskLabel === 'Strong' || riskLabel === 'Low') && likelihood === 'Low' && impact === 'Low') return 'var(--color-strong)';
    return 'var(--color-well)';
  };

  const getOpacity = (likelihood: string, impact: string) => {
    return getCellColor(likelihood, impact) !== 'var(--color-well)' ? 1 : 0.4;
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Threat Matrix (Likelihood vs Impact)
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr 1fr 1fr',
        gridTemplateRows: 'auto 1fr 1fr 1fr',
        gap: '4px',
        maxWidth: '300px'
      }}>
        {/* Empty top-left */}
        <div></div>
        <div style={{ fontSize: '10px', color: 'var(--color-text-3)', textAlign: 'center' }}>Low Impact</div>
        <div style={{ fontSize: '10px', color: 'var(--color-text-3)', textAlign: 'center' }}>Med Impact</div>
        <div style={{ fontSize: '10px', color: 'var(--color-text-3)', textAlign: 'center' }}>High Impact</div>

        <div style={{ fontSize: '10px', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>High Prob</div>
        <div style={{ backgroundColor: getCellColor('High', 'Low'), opacity: getOpacity('High', 'Low'), borderRadius: '2px', height: '30px' }}></div>
        <div style={{ backgroundColor: getCellColor('High', 'Medium'), opacity: getOpacity('High', 'Medium'), borderRadius: '2px' }}></div>
        <div style={{ backgroundColor: getCellColor('High', 'High'), opacity: getOpacity('High', 'High'), borderRadius: '2px' }}></div>

        <div style={{ fontSize: '10px', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>Med Prob</div>
        <div style={{ backgroundColor: getCellColor('Medium', 'Low'), opacity: getOpacity('Medium', 'Low'), borderRadius: '2px', height: '30px' }}></div>
        <div style={{ backgroundColor: getCellColor('Medium', 'Medium'), opacity: getOpacity('Medium', 'Medium'), borderRadius: '2px' }}></div>
        <div style={{ backgroundColor: getCellColor('Medium', 'High'), opacity: getOpacity('Medium', 'High'), borderRadius: '2px' }}></div>

        <div style={{ fontSize: '10px', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>Low Prob</div>
        <div style={{ backgroundColor: getCellColor('Low', 'Low'), opacity: getOpacity('Low', 'Low'), borderRadius: '2px', height: '30px' }}></div>
        <div style={{ backgroundColor: getCellColor('Low', 'Medium'), opacity: getOpacity('Low', 'Medium'), borderRadius: '2px' }}></div>
        <div style={{ backgroundColor: getCellColor('Low', 'High'), opacity: getOpacity('Low', 'High'), borderRadius: '2px' }}></div>
      </div>
    </div>
  );
};
