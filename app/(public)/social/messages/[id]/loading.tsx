/** Shown while a conversation loads: its header, a few bubbles and the message box. */
export default function Loading() {
  const bubbles = [
    { mine: false, width: "w-44" },
    { mine: false, width: "w-60" },
    { mine: true, width: "w-52" },
    { mine: false, width: "w-36" },
    { mine: true, width: "w-64" },
    { mine: true, width: "w-28" },
  ];
  return (
    <main id="main" className="chat-main mx-auto flex w-full max-w-2xl flex-col md:border-x md:border-white/10">
      <div className="chat-screen flex w-full flex-col bg-black" aria-busy="true" aria-label="Loading conversation">
        <div className="chat-top flex items-center gap-3 border-b border-white/10 px-3 py-2.5">
          <span className="skeleton size-9 rounded-full" />
          <span className="skeleton size-[38px] rounded-full" />
          <span className="flex flex-col gap-1.5">
            <span className="skeleton h-3.5 w-28 rounded-full" />
            <span className="skeleton h-2.5 w-16 rounded-full" />
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-2 px-4 pb-4">
          {bubbles.map((bubble, index) => (
            <span key={index} className={`skeleton h-9 rounded-[1.35rem] ${bubble.width} ${bubble.mine ? "self-end" : "self-start"}`} />
          ))}
        </div>
        <div className="chat-composer flex items-center gap-2 border-t border-white/10 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <span className="skeleton size-9 rounded-full" />
          <span className="skeleton h-11 flex-1 rounded-full" />
        </div>
      </div>
    </main>
  );
}
