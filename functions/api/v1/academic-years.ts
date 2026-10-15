// Cloudflare Pages route registry only. Keep one use case per handler module.
export { onRequestGet } from '../../../server/master/getAcademicYearsHandler.ts';
export { onRequestPost } from '../../../server/master/createAcademicYearHandler.ts';
