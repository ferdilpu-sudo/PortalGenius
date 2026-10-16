// Verify Cloudflare Pages' public runtime configuration without reading secrets.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const body=readFileSync('wrangler.toml','utf8');
const cfg=body.slice(body.indexOf('\n[vars]\n') + 8);
assert.ok(body.includes('\n[vars]\n'),'Cloudflare Pages [vars] section is missing');
const wanted={
  SUPABASE_URL:'https://vpglikrkvsnoyjvluigs.supabase.co',
  EXPECTED_SUPABASE_PROJECT_REF:'vpglikrkvsnoyjvluigs',
  SESSION_KEY_VERSION:'1',
  APP_ENV:'production',
  APP_ORIGIN:'https://portalgenius.pages.dev'
};
for(const [name,value] of Object.entries(wanted)) {
  assert.ok(cfg.split(/\r?\n/).some(line=>line.trim()===`${name} = "${value}"`),`Missing or wrong public binding: ${name}`);
}
assert.match(cfg,/^SUPABASE_PUBLISHABLE_KEY = "sb_publishable_[a-zA-Z0-9_]+"$/m);
assert.ok(!/^\s*SUPABASE_SECRET_KEY\s*=/m.test(body),'Do not commit Supabase secret key');
assert.ok(!/^\s*SESSION_ENCRYPTION_KEY\s*=/m.test(body),'Do not commit session secret');
console.log('PASS: Cloudflare Pages public bindings and no secrets in wrangler.toml');
