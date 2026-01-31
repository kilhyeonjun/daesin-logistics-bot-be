export interface RouteProps {
  id?: number;
  searchDate: string;
  lineCode: string;
  lineName: string | null;
  carCode: string | null;
  carNumber: string | null;
  count: number;
  quantity: number;
  sectionFare: number;
  totalFare: number;
  createdAt?: string;
  raceInfoUrl?: string | null;
  carDetailUrl?: string | null;
  trackingUrl?: string | null;
  waypointUrl?: string | null;
}

export class Route {
  readonly id?: number;
  readonly searchDate: string;
  readonly lineCode: string;
  readonly lineName: string | null;
  readonly carCode: string | null;
  readonly carNumber: string | null;
  readonly count: number;
  readonly quantity: number;
  readonly sectionFare: number;
  readonly totalFare: number;
  readonly createdAt?: string;
  readonly raceInfoUrl: string | null;
  readonly carDetailUrl: string | null;
  readonly trackingUrl: string | null;
  readonly waypointUrl: string | null;

  constructor(props: RouteProps) {
    this.id = props.id;
    this.searchDate = props.searchDate;
    this.lineCode = props.lineCode;
    this.lineName = props.lineName;
    this.carCode = props.carCode;
    this.carNumber = props.carNumber;
    this.count = props.count;
    this.quantity = props.quantity;
    this.sectionFare = props.sectionFare;
    this.totalFare = props.totalFare;
    this.createdAt = props.createdAt;
    this.raceInfoUrl = props.raceInfoUrl ?? null;
    this.carDetailUrl = props.carDetailUrl ?? null;
    this.trackingUrl = props.trackingUrl ?? null;
    this.waypointUrl = props.waypointUrl ?? null;
  }

  static create(props: Omit<RouteProps, 'id' | 'createdAt'>): Route {
    return new Route({
      ...props,
      count: props.count ?? 0,
      quantity: props.quantity ?? 0,
      sectionFare: props.sectionFare ?? 0,
      totalFare: props.totalFare ?? 0,
    });
  }

  getFormattedDate(): string {
    const d = this.searchDate;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }
}

export interface RouteStats {
  totalRoutes: number;
  totalCount: number;
  totalQuantity: number;
  totalSectionFare: number;
  totalFare: number;
}

export interface MonthlyRouteStats {
  days: Record<string, RouteStats>;
}
