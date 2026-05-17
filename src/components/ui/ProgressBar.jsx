export default function ProgressBar({ value=0, className='' }) {
  return (
    <div className={`h-2 bg-surface-container-highest rounded-full overflow-hidden ${className}`}>
      <div className="h-full bg-primary-container rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(0,255,136,0.35)]"
        style={{width:`${Math.min(100,Math.max(0,value))}%`}} />
    </div>
  )
}