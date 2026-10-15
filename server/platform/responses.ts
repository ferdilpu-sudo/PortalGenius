export function jsonResponse(requestId:string,status:number,payload:Record<string,unknown>):Response {
  return new Response(JSON.stringify(payload),{
    status,headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
      'X-Request-ID':requestId
    }
  });
}
export function success(requestId:string,data:unknown,status=200):Response {
  return jsonResponse(requestId,status,{data,meta:{requestId}});
}
export function failure(requestId:string,status:number,code:string,message:string):Response {
  return jsonResponse(requestId,status,{error:{code,message},requestId});
}
export function unavailable(requestId:string):Response {
  return failure(requestId,503,'SERVICE_UNAVAILABLE','Layanan sedang tidak tersedia. Coba lagi nanti.');
}
