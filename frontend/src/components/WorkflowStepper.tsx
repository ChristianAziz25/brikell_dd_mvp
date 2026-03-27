const STEPS = ['Upload', 'Parse', 'Reconcile', 'Modules', 'Review', 'Report'] as const;

const STATUS_TO_STEP: Record<string, number> = {
  draft: 1,
  parsing: 2,
  reconciling: 3,
  running: 4,
  review: 5,
  generating: 5,
  complete: 6,
};

const GOLD = '#C9A84C';
const NAVY = '#1A2B3C';
const GREY = '#CCC';
const LIGHT_GREY = '#E0E0E0';

export default function WorkflowStepper({ status }: { status: string }) {
  const currentStep = STATUS_TO_STEP[status] ?? 1;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', padding: '16px 0' }}>
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {/* Connector lines */}
            {i > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: '50%',
                  width: '100%',
                  height: 2,
                  background: step <= currentStep ? GOLD : LIGHT_GREY,
                }}
              />
            )}

            {/* Circle */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                background: isCompleted ? GOLD : isCurrent ? NAVY : LIGHT_GREY,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {isCompleted ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span style={{ color: isCurrent ? '#fff' : '#999' }}>{step}</span>
              )}
            </div>

            {/* Label */}
            <span
              style={{
                marginTop: 6,
                fontSize: 12,
                fontWeight: 600,
                color: isCurrent ? GOLD : isCompleted ? NAVY : '#999',
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
