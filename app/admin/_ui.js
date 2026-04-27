// Shared inline styles + tiny helpers used across admin editors.

export const ui = {
  panel: {
    background: 'var(--paper)',
    border: '1px solid var(--grey-5)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-soft)',
    padding: 28,
  },
  fieldset: { marginBottom: 18 },
  label: {
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em',
    textTransform: 'uppercase', color: 'var(--grey-3)', marginBottom: 8, display: 'block',
  },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid var(--grey-5)',
    fontFamily: 'var(--font-sans)', fontSize: 14, background: 'var(--paper)',
    outline: 'none', borderRadius: 'var(--radius-sm)',
  },
  textarea: {
    width: '100%', padding: '10px 12px', border: '1px solid var(--grey-5)',
    fontFamily: 'var(--font-sans)', fontSize: 14, background: 'var(--paper)',
    outline: 'none', borderRadius: 'var(--radius-sm)', resize: 'vertical',
    minHeight: 80,
  },
  select: {
    width: '100%', padding: '10px 12px', border: '1px solid var(--grey-5)',
    fontFamily: 'var(--font-sans)', fontSize: 14, background: 'var(--paper)',
    outline: 'none', borderRadius: 'var(--radius-sm)',
  },
  numInput: {
    width: 72, padding: '6px 8px', border: '1px solid var(--grey-5)',
    fontFamily: 'var(--font-mono)', fontSize: 13, textAlign: 'center',
    borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--paper)',
  },
  toggle: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', border: '1px solid var(--grey-5)', background: 'var(--paper)',
    borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.15em',
    cursor: 'pointer', userSelect: 'none', textTransform: 'uppercase',
  },
  toggleOn: { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' },
  badge: {
    display: 'inline-block', padding: '3px 9px', border: '1px solid var(--grey-5)',
    borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em',
    color: 'var(--grey-2)',
  },
  errorBox: { color: '#b00020', fontSize: 13, marginTop: 12 },
  okBox:    { color: '#0a7a3a', fontSize: 13, marginTop: 12 },
  pageHead: { marginBottom: 28 },
  h1: { fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginTop: 6 },
};
