type Envelope<T>={data?:T;error?:{code:string;message:string}};
export async function fetchMaster<T>(resource:string):Promise<T[]>{
 const response=await fetch('/api/v1/'+resource,{credentials:'same-origin',cache:'no-store'});
 const body=await response.json() as Envelope<T[]>;
 if(!response.ok||!Array.isArray(body.data))
  throw new Error(body.error?.message??'Tidak dapat mengambil data.');
 return body.data;
}
export async function postMaster<T,I>(resource:string,input:I,csrf:string,key:string):Promise<T>{
 const response=await fetch('/api/v1/'+resource,{method:'POST',credentials:'same-origin',
  headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':key},
  body:JSON.stringify(input)});
 const body=await response.json() as Envelope<T>;
 if(!response.ok||!body.data)throw new Error(body.error?.message??'Gagal menyimpan data.');
 return body.data;
}
