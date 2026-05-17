export const fmt = (n=0) => 'Rp ' + Math.round(n).toLocaleString('id-ID')
export const pct = (s,g) => (!g ? 0 : Math.min(100,Math.round(s/g*100)))
export const fmtDate = (d) => (!d ? '' : new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}))
export const initials = (name='') => name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'TD'
export const fmtShort = (n=0) => {
  if (n>=1e6) return (n/1e6).toFixed(1)+'jt'
  if (n>=1e3) return (n/1e3).toFixed(0)+'rb'
  return String(Math.round(n))
}