export type Obstacle =
    {
        id: string;
        type: string;
        description: string;
        height: number;
        gps_position: { lat: number; lng: number };
        timestamp: Date;
        obstacle_position: { lat: number; lng: number };
    }