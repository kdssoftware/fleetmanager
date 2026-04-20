export interface AllowedConfig {
  alliance_id?: (string | number)[];
  corporation_id?: (string | number)[];
  character_id?: (string | number)[];
}

export interface FleetConfig {
  name: string;
  squads: string[];
  motd: string;
}

export interface AppConfig {
  title: string;
  allowed?: AllowedConfig;
  fleets: FleetConfig[];
}

export interface Fleet {
  designation: string;
  fleet_id: string | number;
  fc_name: string;
  boss_name: string;
  total_members: number;
  grouped_members: Record<string, string[]>;
}

export interface MyFleet {
  fleet_id: string | number | null;
  role: string | null;
}

export interface JoinFleetResult {
  success: boolean;
  message?: string;
}
