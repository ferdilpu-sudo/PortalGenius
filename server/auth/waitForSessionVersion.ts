/**
 * Wait for a concurrent session refresh to advance the stored version.
 * Does not hold a database transaction or own credentials. Bounded at 1.5 seconds.
 */
export async function waitForSessionVersion<T extends {session:{version:number}}>(
  read:()=>Promise<T|null>,
  previousVersion:number,
  delay:(ms:number)=>Promise<void>=(ms)=>new Promise(resolve=>setTimeout(resolve,ms))
):Promise<T|null> {
  for(const milliseconds of [60,120,240,360,500]) {
    await delay(milliseconds);
    const record=await read();
    if(!record)return null;
    if(record.session.version>previousVersion)return record;
  }
  throw new Error('SESSION_REFRESH_BUSY');
}
