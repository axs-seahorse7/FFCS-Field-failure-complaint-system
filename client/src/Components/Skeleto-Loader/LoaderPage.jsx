const LoaderPage = () => {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      
      {/* Glass Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/40 shadow-xl rounded-2xl px-10 py-8 flex flex-col items-center gap-6">
        
        {/* Animated Circle */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-sm font-semibold text-slate-700 tracking-wide">
            Loading Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Preparing insights...
          </p>
        </div>

        {/* Shimmer Bar */}
        <div className="w-40 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white to-transparent animate-[shimmer_1.5s_infinite]"></div>
        </div>

      </div>
    </div>
  );
};

export default LoaderPage;