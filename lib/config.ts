import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { AppConfig } from '@/types/types';

export function getConfig(): AppConfig {
  try {
    const hostPath = path.join(process.cwd(), 'host', 'config.yaml');
    const localPath = path.join(process.cwd(), 'config.yaml');
    
    const targetPath = fs.existsSync(hostPath) ? hostPath : localPath;
    const file = fs.readFileSync(targetPath, 'utf8');
    
    return yaml.parse(file);
  } catch (e) {
    console.error('Failed to read config.yaml', e);
    return { 
      title: 'Fleet Manager', 
      allowed: { alliance_id: [], corporation_id: [], character_id: [] },
      fleets: [] 
    };
  }
}
