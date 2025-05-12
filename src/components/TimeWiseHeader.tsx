import Image from 'next/image';

// Assuming timewise-logo.png is located at public/timewise-logo.png
// No import needed for public assets with next/image

export function TimeWiseHeader() {
  return (
    <header className="shadow-md relative overflow-hidden">
      {/* Moving clouds animation removed */}
      {/* 
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="cloud absolute top-1/4 left-1/4 w-32 h-16 bg-white rounded-full animate-cloud-move-1"></div>
        <div className="cloud absolute top-1/2 left-3/4 w-40 h-20 bg-white rounded-full animate-cloud-move-2"></div>
        <div className="cloud absolute top-1/3 right-1/4 w-24 h-12 bg-white rounded-full animate-cloud-move-3"></div>
      </div>
      <style jsx global>{`
        @keyframes cloud-move-1 {
          0% { transform: translateX(-200px); }
          100% { transform: translateX(calc(100vw + 200px)); }
        }
        @keyframes cloud-move-2 {
          0% { transform: translateX(-300px); }
          100% { transform: translateX(calc(100vw + 300px)); }
        }
        @keyframes cloud-move-3 {
          0% { transform: translateX(200px); }
          100% { transform: translateX(calc(-100vw - 200px)); }
        }
        .animate-cloud-move-1 { animation: cloud-move-1 60s linear infinite; }
        .animate-cloud-move-2 { animation: cloud-move-2 80s linear infinite 10s; }
        .animate-cloud-move-3 { animation: cloud-move-3 70s linear infinite 5s; }
      `}</style>
      */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex h-24 items-center justify-center"> {/* Changed justify-between to justify-center */}
          <div className="flex items-center"> {/* Removed mx-auto */}
            {/* 
              The logo image 'timewise-logo.png' should be placed in the 'public' directory.
              The src prop should be the path relative to the public directory, e.g., /timewise-logo.png
            */}
            <Image
              src="https://iili.io/38aoDx9.png" // Path relative to public directory
              alt="TimeWise Logo"
              width={200} // Adjusted width, can be fine-tuned
              height={80} // Adjusted height, can be fine-tuned
              priority // Add priority if it's LCP
              data-ai-hint="logo abstract"
            />
            {/* h1 removed as per earlier request, assuming logo contains text or is purely graphical */}
          </div>
          {/* Placeholder for potential future elements like user avatar or nav */}
        </div>
      </div>
    </header>
  );
}
