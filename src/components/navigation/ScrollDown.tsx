'use client'

export default function ScrollDown() {
  const scrollToNext = () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <button
      onClick={scrollToNext}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
    >
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm text-gray-500">Scroll Down</span>
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          className="text-gray-500"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  )
}