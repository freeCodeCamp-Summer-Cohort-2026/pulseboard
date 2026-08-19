export default function FeedSkeleton() {
    return (
        <div className="feed-skeleton">
            {/**
             * Renders 3 skeleton cards
             * Each card mimics the UpdateCard structure
             */}
            {Array.from({ length: 3 }).map((_, i) => (
                <div data-testid="skeleton-card" className="skeleton-card" key={i}>
                    <div className="skeleton-card-header">
                        <div data-testid="skeleton-avatar" className="skeleton-card-avatar" />
                        <div className="skeleton-card-content">
                            <div data-testid="skeleton-title" className="skeleton-card-title" />
                            <div data-testid="skeleton-subtitle" className="skeleton-card-subtitle" />
                        </div>
                    </div>
                    <div data-testid="skeleton-body" className="skeleton-card-body" />
                    <div data-testid="skeleton-footer" className="skeleton-card-footer" />
                </div>
            ))}
        </div>
    )
}