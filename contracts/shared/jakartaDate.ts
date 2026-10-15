// Date-only authorization comparisons follow the school's Asia/Jakarta calendar.
export function jakartaDate(now:Date=new Date()):string{
 const parts=new Intl.DateTimeFormat('en-US',{
  timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(now);
 const part=(key:string)=>parts.find(item=>item.type===key)?.value??'';
 return [part('year'),part('month'),part('day')].join('-');
}
