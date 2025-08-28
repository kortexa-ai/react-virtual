import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

async function fetchData(limit: number, offset: number = 0): Promise<{ rows: string[]; nextOffset: number }> {
    const start = offset * limit;
    const rows = Array.from({ length: limit }, (_, i) => `Async loaded row ${start + i}`);
    await new Promise((r) => setTimeout(r, 500));
    return {
        rows,
        nextOffset: offset + 1,
    };
}

export function MainContent() {
    const LIMIT = 20;
    const parentRef = useRef<HTMLDivElement | null>(null);
    const isInitialLoadRef = useRef(true);

    const scrollMetaRef = useRef<{
        prevScrollHeight: number;
        prevScrollTop: number;
    } | null>(null);

    const {
        data,
        fetchNextPage,
        isFetchingNextPage,
        hasNextPage,
        isSuccess,
    } = useInfiniteQuery({
        queryKey: ['infiniteRows'],
        queryFn: ({ pageParam = 0 }) => fetchData(LIMIT, pageParam),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.nextOffset,
        refetchOnWindowFocus: false,
    });


    const items = data?.pages.reverse().flatMap(page => page.rows).reverse() || [];

    // Stable seeded random helpers based on item key (string)
    const hashString = useCallback((str: string) => {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }, []);

    const rng = useCallback((seed: number) => {
        // Mulberry32
        let t = seed >>> 0;
        return () => {
            t += 0x6D2B79F5;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }, []);

    const getHeightForKey = useCallback((key: string) => {
        const rand = rng(hashString(key));
        const u = rand();
        if (u < 0.6) {
            // single-line-ish: 60-75px
            return 60 + Math.floor(rand() * 15);
        } else if (u < 0.85) {
            // medium: 200-400px
            return 200 + Math.floor(rand() * 200);
        } else if (u < 0.95) {
            // large: 600-1200px
            return 600 + Math.floor(rand() * 600);
        }
        // extra large (more than a page): 1200-1800px
        return 1200 + Math.floor(rand() * 600);
    }, [rng, hashString]);

    const getColorForKey = useCallback((key: string) => {
        const r = rng(hashString(key) ^ 0x9E3779B9);
        const hue = Math.floor(r() * 360);
        const sat = 45 + Math.floor(r() * 10); // 45-55%
        const light = 75 + Math.floor(r() * 8); // 75-83%
        return `hsl(${hue} ${sat}% ${light}%)`;
    }, [rng, hashString]);

    const heights = useMemo(() =>
        items.map((it, i) => getHeightForKey(String(it ?? i))),
        [items, getHeightForKey]
    );

    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const rowVirtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => heights[index] ?? 60,
        // Use a stable key so DOM nodes are preserved as data is prepended
        getItemKey: (index) => items[index] ?? index,
        overscan: 5,
    });


    const loadMore = useCallback(async () => {
        if (isFetchingNextPage || !hasNextPage || !parentRef.current) return;

        const el = parentRef.current;

        scrollMetaRef.current = {
            prevScrollHeight: el.scrollHeight,
            prevScrollTop: el.scrollTop,
        };

        await fetchNextPage();
    }, [hasNextPage, fetchNextPage, isFetchingNextPage])


    useEffect(() => {
        const el = parentRef.current;
        if (!el) return;

        if (isInitialLoadRef.current && isSuccess && items.length > 0) {
            el.scrollTop = el.scrollHeight;
            isInitialLoadRef.current = false;
            return;
        }

        const meta = scrollMetaRef.current;
        if (meta) {
            el.scrollTop = el.scrollHeight - meta.prevScrollHeight + meta.prevScrollTop;
            scrollMetaRef.current = null;
        }
    }, [items.length, isSuccess]);


    useEffect(() => {
        const el = parentRef.current;
        if (!el) return;

        const onScroll = () => {
            if (el.scrollTop <= 30 && !isFetchingNextPage && hasNextPage) {
                loadMore();
            }
        };

        el.addEventListener("scroll", onScroll);
        return () => el.removeEventListener("scroll", onScroll);
    }, [loadMore, isFetchingNextPage, hasNextPage]);

    return (
        <div
            className="w-full"
            style={{
                // Respect iOS safe areas and use dynamic viewport units for stability
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
            }}
        >
            <div className="mx-auto w-full max-w-screen-sm px-4">
                <div
                    ref={parentRef}
                    className="w-full overflow-y-auto overflow-x-hidden rounded-lg border shadow-sm"
                    style={{
                        position: "relative",
                        height: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
                        WebkitOverflowScrolling: "touch",
                        overscrollBehaviorY: "contain",
                        background: "#fafafa",
                    }}
                >
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: "100%",
                            position: "relative",
                        }}
                    >
                        {isFetchingNextPage && (
                            <div className="absolute top-0 left-0 w-full text-center text-sm text-gray-400 py-1">
                                Loading...
                            </div>
                        )}

                        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
                            <div
                                key={virtualRow.key}
                                ref={(node) => {
                                    if (node) rowVirtualizer.measureElement(node);
                                }}
                                style={{
                                    position: "absolute",
                                    top: virtualRow.start,
                                    left: 0,
                                    width: "100%",
                                    height: `${virtualRow.size}px`,
                                    boxSizing: "border-box",
                                    borderBottom: "1px solid #eee",
                                }}
                            >
                                {(() => {
                                    const key = String(items[virtualRow.index] ?? virtualRow.index);
                                    const bg = getColorForKey(key);
                                    const isSelected = selectedKey === key;
                                    return (
                                        <div
                                            className="relative w-full"
                                            style={{ height: "100%" }}
                                        >
                                            <button
                                                className="group item-appear h-full w-full rounded-md overflow-hidden transition-shadow duration-200 ease-out hover:shadow-[inset_0_0_0_2px_rgba(0,0,0,0.18),0_8px_28px_rgba(0,0,0,0.06)] focus-within:shadow-[inset_0_0_0_2px_rgba(0,0,0,0.18),0_8px_28px_rgba(0,0,0,0.06)]"
                                                style={{ background: bg }}
                                                tabIndex={0}
                                                type="button"
                                                onClick={() => setSelectedKey(prev => (prev === key ? null : key))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setSelectedKey(prev => (prev === key ? null : key));
                                                    }
                                                }}
                                            >
                                                {/* Hover/touch glossy overlay */}
                                                <div
                                                    className={`absolute inset-0 opacity-0 transition-opacity duration-200 md:group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100 ${isSelected ? 'opacity-100' : ''}`}
                                                    style={{
                                                        background:
                                                            "radial-gradient(1200px 400px at 50% 35%, rgba(255,255,255,0.22), rgba(255,255,255,0.08) 35%, transparent 60%)",
                                                    }}
                                                />

                                                {/* Simulated menu button (hover on desktop, touch/focus on mobile) */}
                                                <button
                                                    type="button"
                                                    aria-label="Menu"
                                                    className={`absolute right-2 top-2 z-10 h-8 w-8 rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm opacity-0 transition-opacity duration-150 focus:opacity-100 md:group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100 ${isSelected ? 'opacity-100' : ''}`}
                                                    style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto" aria-hidden="true">
                                                        <circle cx="5" cy="12" r="2" fill="currentColor" />
                                                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                                                        <circle cx="19" cy="12" r="2" fill="currentColor" />
                                                    </svg>
                                                </button>

                                                {/* Centered index pill */}
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm pointer-events-none">
                                                        {items.length - virtualRow.index}
                                                    </span>
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
