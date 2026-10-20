// Web Crypto CSPRNG works in Cloudflare Pages Functions and Node 22+.
export function newTemporaryPassword():string{
 const random=new Uint8Array(30);
 crypto.getRandomValues(random);
 let bytes='';
 for(const value of random)bytes+=String.fromCharCode(value);
 return btoa(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
