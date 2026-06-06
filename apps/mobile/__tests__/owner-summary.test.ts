import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('owner summary revenue RPC shape', () => {
  it('includes service_name for the top service insight', () => {
    const typesPath = join(__dirname, '../../../packages/db/src/database.types.ts');
    const types = readFileSync(typesPath, 'utf8');
    const rpcStart = types.indexOf('get_shop_appointments_revenue:');
    const rpcEnd = types.indexOf('get_shop_dashboard_stats:', rpcStart);
    const rpcType = types.slice(rpcStart, rpcEnd);

    expect(rpcType).toContain('service_name: string | null');
  });
});
