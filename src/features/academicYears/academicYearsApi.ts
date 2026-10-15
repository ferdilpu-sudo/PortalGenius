export type AcademicYear={
  id:string;label:string;startDate:string;endDate:string;version:number
};
type ResponseEnvelope<T>={data?:T;error?:{code:string;message:string}};
export async function loadAcademicYears():Promise<AcademicYear[]> {
  const response=await fetch('/api/v1/academic-years',{credentials:'same-origin',cache:'no-store'});
  const body=await response.json() as ResponseEnvelope<AcademicYear[]>;
  if(!response.ok||!Array.isArray(body.data))
    throw new Error(body.error?.message??'Tidak dapat mengambil tahun ajaran.');
  return body.data;
}
export async function createAcademicYear(input:{
  label:string;startDate:string;endDate:string
},csrf:string,idempotencyKey:string):Promise<AcademicYear> {
  const response=await fetch('/api/v1/academic-years',{
    method:'POST',credentials:'same-origin',
    headers:{
      'Content-Type':'application/json','X-CSRF-Token':csrf,
      'Idempotency-Key':idempotencyKey
    },
    body:JSON.stringify(input)
  });
  const body=await response.json() as ResponseEnvelope<AcademicYear>;
  if(!response.ok||!body.data)
    throw new Error(body.error?.message??'Tidak dapat menyimpan tahun ajaran.');
  return body.data;
}
