import { useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface TimelineItem {
    id?: string;
    label: string;
    isYear?: boolean;
}

interface TimelineSliderProps {
    items?: TimelineItem[];
    activeIndex?: number;
    onIndexChange?: (index: number, behavior?: 'auto' | 'smooth' | 'instant') => void;
}

const CONFIG = {
    collapsedHeight: 80, 
    expandedHeight: 70,  
    expandedWidth: 35,   
    expandedRadius: 30,  
    itemsVisibleExpanded: 10,  
    itemsVisibleCollapsed: 15 
};

export function TimelineSlider({
    items = [], 
    activeIndex = 1,
    onIndexChange
}: TimelineSliderProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dragRef = useRef({
        isDragging: false,
        startY: 0,
        startIndex: 0
    })

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        setIsExpanded(true);
    };

    const handleMouseLeave = () => {
        if (!dragRef.current.isDragging) {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = setTimeout(() => setIsExpanded(false), 200);
        }
    };

    const handlePointerDown = (e: React.PointerEvent) =>{
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        setIsExpanded(true);
        dragRef.current.isDragging = true;
        dragRef.current.startY = e.clientY;
        dragRef.current.startIndex = activeIndex;  
    }
    const handlePointerMove = (e: React.PointerEvent) => {
        if(!dragRef.current.isDragging) return;
        const deltaY = e.clientY - dragRef.current.startY;
        
        if (Math.abs(deltaY) > 5 && !e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.setPointerCapture(e.pointerId);
        }

        const pixelsPerItem = 30; 
        const indexOffset = Math.round(deltaY / pixelsPerItem);
        
        let newIndex = dragRef.current.startIndex + indexOffset;
        newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
        if(newIndex !== activeIndex){
            // 使用 smooth 以防左侧跳闪
            onIndexChange?.(newIndex, 'smooth');
        }
    }
    const handlePointerUp = (e: React.PointerEvent) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        dragRef.current.isDragging = false;
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => setIsExpanded(false), 200);
    }

    const numbersATime = isExpanded ? CONFIG.itemsVisibleExpanded : CONFIG.itemsVisibleCollapsed;

    return (
        <div 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}

            className={cn(
                "select-none touch-none fixed right-[5%] top-1/2 -translate-y-1/2 z-[61] cursor-pointer transition-all duration-200 ease-out",
                isExpanded 
                    ? "opacity-100 rounded-l-full bg-[radial-gradient(circle_at_left,_rgba(156,163,175,0.9)_0%,_rgba(156,163,175,0.1)_100%)] shadow-[-10px_0_30px_-10px_rgba(35,47,85,0.05)]" 
                    : "bg-transparent opacity-40 rounded-l-2xl w-6 hover:opacity-70 hover:bg-gray-500" // 增加收起时的基础宽度
            )}
            style={{
                height: isExpanded ? `${CONFIG.expandedHeight}vh` : `${CONFIG.collapsedHeight}vh`,
                width: isExpanded ? `${CONFIG.expandedWidth}vh` : undefined,
            }}
        >
            <div className='relative w-full h-full pointer-events-none'>
                {items.map((item, index) => {
                    const offset = (index - activeIndex);
                    
                    const angle = (offset * (180 / numbersATime) + 90) * (Math.PI / 180);
                    const radius = CONFIG.expandedRadius; 
                    const x = - Math.sin(angle) * radius;
                    const y = Math.cos(angle) * radius;
                    
                    const collapsedY = offset * (CONFIG.collapsedHeight / numbersATime);

                    const isYear = item.isYear;
                    const opacityFactor = Math.max(0, 1 - Math.abs(offset) * (isYear ? 0.05 : 0.1));

                    return (
                        <div 
                            key={item.id || index}
                            onClick={() => onIndexChange?.(index, 'smooth')}
                            className={cn(
                                'absolute top-1/2 -translate-y-1/2 right-0 text-center pointer-events-auto cursor-pointer flex items-center justify-center transition-all duration-200',
                                isYear ? 'z-10' : 'z-0'
                            )}
                            style={{
                                transform: isExpanded 
                                    ? `translate(${x}vh, ${-y}vh)` 
                                    : `translate(0, ${collapsedY}vh)`,
                                opacity: opacityFactor,
                            }}
                        >
                            <div 
                                className={cn(
                                    "transition-all duration-200 origin-right whitespace-nowrap",
                                    isExpanded ? "scale-100 opacity-100" : "scale-75 opacity-30 pr-4", // 收起时低透明度，预留刻度的空间
                                    isYear 
                                        ? "bg-[#232f55] text-white font-black text-2xl px-5 py-2.5 rounded-full shadow-[0_10px_20px_-5px_rgba(35,47,85,0.3)] tracking-tighter"
                                        : "text-[#232f55] font-bold text-lg"
                                )}
                                style={{
                                    transform: isExpanded ? `scale(${Math.max(isYear ? 0.7 : 0.5, 1 - Math.abs(offset) * 0.3)})` : undefined,
                                }}
                            >
                                {item.label}
                            </div>

                            {/* 收起状态的刻度设计 (放大) */}
                            {!isExpanded && (
                                <div 
                                    className={cn(
                                        "absolute right-0 rounded-l-full transition-all duration-200",
                                        isYear ? "bg-indigo-600 w-5 h-1" : "bg-black/60 w-2.5 h-[2px]", // 年份刻度更宽更粗，普通刻度也加大
                                        Math.abs(offset) < 0.5 ? "bg-black w-4 h-[3px]" : "" // 选中的刻度明显加粗加长
                                    )} 
                                />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
