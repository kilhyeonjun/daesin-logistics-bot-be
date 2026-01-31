# Draft: Monthly Statistics API Endpoint

## Requirements (confirmed)
- **Endpoint**: `GET /api/stats/monthly?yearMonth=YYYYMM`
- **Response format**: `{ days: { '20260101': { totalRoutes, totalCount, totalQuantity, totalFare }, ... } }`
- **Pattern to follow**: Existing GetStatsUseCase pattern

## Technical Decisions

### Response Structure
- User wants `days` object with date keys (YYYYMMDD format)
- Each day's stats should include: `totalRoutes`, `totalCount`, `totalQuantity`, `totalFare`
- NOTE: Existing StatsDto includes `totalSectionFare` - DECISION NEEDED

### Value Object
- Need `YearMonth` value object for YYYYMM validation (similar to SearchDate pattern)
- Validates 6-digit format, valid year/month ranges (01-12)
- Private constructor + static `create()` factory
- Helper methods: `getStartDate()`, `getEndDate()`, `getDaysInMonth()`

### Repository Pattern
- Need new method: `getStatsByMonth(yearMonth: string): Promise<MonthlyRouteStats>`
- Uses Prisma `groupBy` for efficient daily aggregation within month
- Leverages existing `idx_routes_date` index
- Returns Map/Record of date → stats

### Use Case Pattern
- Following GetStatsUseCase pattern exactly
- Constructor injection with TOKENS.RouteRepository
- Uses YearMonth value object for validation
- Returns MonthlyStatsDto

## Research Findings

### Database Structure
- `searchDate` stored as YYYYMMDD string (8 digits)
- Index exists on `searchDate` field (`idx_routes_date`)
- Monthly query: `WHERE searchDate >= '20260101' AND searchDate <= '20260131'`
- String comparison works correctly for date ranges

### Existing getStatsByDate Implementation
```typescript
async getStatsByDate(date: string): Promise<RouteStats> {
  const result = await this.prisma.route.aggregate({
    where: { searchDate: date },
    _count: { id: true },
    _sum: { count, quantity, sectionFare, totalFare },
  });
  return { totalRoutes, totalCount, totalQuantity, totalSectionFare, totalFare };
}
```

### SearchDate Value Object Pattern (to follow)
- Private constructor + static factory methods
- Validates YYYYMMDD (8 digits) with regex
- Methods: `create(date)`, `fromDate(Date)`, `getValue()`, `toDate()`
- Uses `ValidationError` from `shared/errors/DomainError.js`

### Controller Pattern
- Injects use cases via constructor with @inject decorator
- Error handling: `try/catch` returning `{ success: false, error: message }`
- Uses `req.params` for path params, `req.query` for query params

### Container Registration Pattern
```typescript
container.register(GetStatsUseCase, { useClass: GetStatsUseCase });
```
- Use cases registered by class, not token

### Route Registration Pattern
```typescript
router.get('/api/stats/:date', apiKeyAuth, (req, res) => routeController.getStatsByDate(req, res));
```

## Open Questions

1. Should `totalSectionFare` be included in response? (existing StatsDto has it)
2. Should days with no data be included in response with zero values?
3. Should the endpoint be query param (`?yearMonth=`) or path param (`/monthly/:yearMonth`)?

## Scope Boundaries
- INCLUDE: Monthly stats API endpoint with daily breakdown
- INCLUDE: YearMonth value object for validation
- INCLUDE: Repository method for monthly aggregation
- INCLUDE: Tests for the new endpoint
- EXCLUDE: Any UI/frontend changes
- EXCLUDE: Caching mechanisms
- EXCLUDE: Historical data backfill
