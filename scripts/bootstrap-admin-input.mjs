// Input validation isolated from privileged account provisioning.
export function validateAdminEmail(input) {
  if(typeof input!=='string')return null;
  const email=input.trim().toLowerCase();
  const parts=email.split('@');
  if(email.length<6||email.length>254||parts.length!==2)return null;
  const [local,domain]=parts;
  if(local.length<1||local.length>64||!domain.includes('.')||/\s/.test(email))return null;
  if(!/^[a-z0-9.!#$%&'*+/=?^_\x60{|}~-]+$/.test(local))return null;
  if(!domain.split('.').every(label=>label.length>=1&&label.length<=63&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)))return null;
  if(domain.endsWith('.invalid')||domain.endsWith('.test')||domain.endsWith('.example'))return null;
  return email;
}
