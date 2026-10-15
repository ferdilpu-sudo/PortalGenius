export function isTrustedMutation(request:Request,allowedOrigin:string):boolean {
  const origin=request.headers.get('Origin');
  if(origin)return origin===allowedOrigin;
  const referer=request.headers.get('Referer');
  if(!referer)return false;
  try{return new URL(referer).origin===allowedOrigin;}catch{return false;}
}
export async function readSmallJson(request:Request,maxBytes=4096):Promise<unknown> {
  const type=request.headers.get('Content-Type')??'';
  if(!/^application\/json(?:\s*;|$)/i.test(type))throw new Error('INVALID_CONTENT_TYPE');
  if(Number(request.headers.get('Content-Length')??0)>maxBytes)throw new Error('BODY_TOO_LARGE');
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>maxBytes)throw new Error('BODY_TOO_LARGE');
  return JSON.parse(raw) as unknown;
}
