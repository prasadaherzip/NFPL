const ACTIONS = new Set(['prepare','check','file','cancel','reopen','import','export']);
function scopeMatches(g, j) { return (!g.client_id||g.client_id===j.client_id)&&(!g.branch_id||g.branch_id===j.branch_id)&&(!g.direction||g.direction===j.direction)&&(!g.mode||g.mode===j.mode); }
function canAct(user, action, job, grants=[]) {
  if (!user||!job) return {allowed:false,reason:'User and job are required.'};
  if (!ACTIONS.has(action)) return {allowed:false,reason:`Unknown action: ${action}.`};
  if (!user.active||user.absent) return {allowed:false,reason:`${user.name} is inactive or absent.`};
  if (!job.client_active||!job.branch_active) return {allowed:false,reason:'The job client or branch is inactive.'};
  if (user.role==='client'&&user.client_id!==job.client_id) return {allowed:false,reason:'Client users may only access their own client jobs.'};
  if (job.stage==='filed'&&['prepare','check','file'].includes(action)) return {allowed:false,reason:'Filed jobs cannot be prepared, checked, or filed again.'};
  if (job.stage==='cancelled'&&action!=='reopen') return {allowed:false,reason:'Cancelled jobs may only be reopened.'};
  if (action==='prepare'&&!['confirmed','new','reopened'].includes(job.stage)) return {allowed:false,reason:`A ${job.stage} job is not ready for preparation.`};
  if (action==='check'&&job.stage!=='prepared') return {allowed:false,reason:'Only prepared jobs can be checked.'};
  if (action==='file'&&job.stage!=='checked') return {allowed:false,reason:'Only checked jobs can be filed.'};
  if (action==='reopen'&&job.stage!=='cancelled') return {allowed:false,reason:'Only cancelled jobs can be reopened.'};
  if (action==='check'&&job.maker_id===user.id) return {allowed:false,reason:'Maker/checker separation prevents the maker from checking the same job.'};
  if (action==='prepare'&&job.maker_id&&job.maker_id!==user.id) return {allowed:false,reason:'Only the assigned maker may prepare this job.'};
  if (action==='check'&&job.checker_id&&job.checker_id!==user.id) return {allowed:false,reason:'Only the assigned checker may check this job.'};
  if (user.role==='system'&&action==='import') return {allowed:true,reason:'Overnight parser is permitted to import.'};
  if (user.role==='system') return {allowed:false,reason:'The overnight parser may import only.'};
  if (user.role==='client'&&!['import','export'].includes(action)) return {allowed:false,reason:'Client users cannot perform internal workflow actions.'};
  if (action==='cancel'&&!['admin','checker'].includes(user.role) && !grants.some(g=>g.active&&g.role==='checker'&&g.action==='cancel'&&scopeMatches(g,job))) return {allowed:false,reason:'Only a checker or admin may cancel a job.'};
  if (action==='reopen'&&user.role!=='admin' && !grants.some(g=>g.active&&g.role==='admin'&&g.action==='reopen'&&scopeMatches(g,job))) return {allowed:false,reason:'Only an admin may reopen a job.'};
  if (user.role==='admin') return {allowed:true,reason:'Admin policy permits this action.'};
  const match = grants.find(g=>g.active&&g.action===action&&scopeMatches(g,job));
  if (match) return {allowed:true,reason:`Active ${match.role} grant matches this job.`};
  if (action==='prepare'&&user.role==='maker'&&job.maker_id===user.id) return {allowed:true,reason:'Maker is assigned to this job.'};
  if (['check','file'].includes(action)&&user.role==='checker'&&job.checker_id===user.id) return {allowed:true,reason:'Checker is assigned to this job.'};
  if (action==='prepare'&&user.role==='maker'&&!job.maker_id&&(!user.branch_id||user.branch_id===job.branch_id)) return {allowed:true,reason:'Maker is assigned to this branch.'};
  if (['check','file'].includes(action)&&user.role==='checker'&&!job.checker_id&&(!user.branch_id||user.branch_id===job.branch_id)) return {allowed:true,reason:'Checker is assigned to this branch.'};
  if (action===job.direction&&user.role==='maker') return {allowed:true,reason:`Maker may perform ${action} on this job.`};
  return {allowed:false,reason:`No active ${user.role} permission matches this action and job scope.`};
}
module.exports = {canAct,scopeMatches,ACTIONS};
