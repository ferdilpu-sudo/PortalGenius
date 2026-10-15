import {useEffect,useState} from 'react';
import {fetchMaster} from './masterApi';
export function useMasterCollection<T>(resource:string){
 const [rows,setRows]=useState<T[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  void fetchMaster<T>(resource).then(data=>{if(active)setRows(data);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Data tidak tersedia.');})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[resource]);
 return {rows,setRows,loading,error,setError};
}
