import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('owner summary revenue RPC shape', () => {
  it('includes service_name for the top service insight', () => {
    const typesPath = join(__dirname, '../../../packages/db/src/database.types.ts');
    const types = readFileSync(typesPath, 'utf8');
    const rpcStart = types.indexOf('get_shop_appointments_revenue:');
    const rpcEnd = types.indexOf('get_shop_dashboard_stats:', rpcStart);
    const rpcType = types.slice(rpcStart, rpcEnd);

    // Asserts the column exists in the RPC return shape; the regenerated types
    // mark RETURNS TABLE columns non-null, so don't pin nullability here.
    expect(rpcType).toContain('service_name: string');
  });
});
