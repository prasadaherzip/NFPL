const {openDatabase,initDatabase}=require('../src/db');

const branches=[['B1','Mumbai'],['B2','Delhi'],['B3','Kolkata'],['B4','Pune'],['B5','Nagpur']];
const standard=[
  ['MIM','Mumbai Import Maker','B1','import','maker'],['MIC','Mumbai Import Checker','B1','import','checker'],['MIF','Mumbai Import Filer','B1','import','filer'],
  ['MEM','Mumbai Export Maker','B1','export','maker'],['MEC','Mumbai Export Checker','B1','export','checker'],['MEF','Mumbai Export Filer','B1','export','filer'],
  ['DIM','Delhi Import Maker','B2','import','maker'],['DIC','Delhi Import Checker','B2','import','checker'],['DIF','Delhi Import Filer','B2','import','filer'],
  ['DEM','Delhi Export Maker','B2','export','maker'],['DEC','Delhi Export Checker','B2','export','checker'],['DEF','Delhi Export Filer','B2','export','filer']
];

(async()=>{
  const db=openDatabase();await initDatabase(db);const client=await db.connect();
  try{
    await client.query('BEGIN');
    await client.query('TRUNCATE history, grants, jobs, users, clients, branches RESTART IDENTITY CASCADE');
    for(const [id,name] of branches)await client.query('INSERT INTO branches(id,name) VALUES($1,$2)',[id,name]);
    for(let i=1;i<=10;i++)await client.query('INSERT INTO clients(id,name) VALUES($1,$2)',[`C${i}`,`Client ${i}`]);
    await client.query("INSERT INTO users(id,name,role) VALUES('ADM','Admin','admin')");
    for(const [id,name,branchId,direction,role] of standard){
      await client.query('INSERT INTO users(id,name,role,branch_id,direction) VALUES($1,$2,$3,$4,$5)',[id,name,role,branchId,direction]);
      const action=role==='maker'?'prepare':role==='checker'?'check':'file';
      await client.query('INSERT INTO grants(grantee_id,grantor_id,role,action,branch_id,direction) VALUES($1,$2,$3,$4,$5,$6)',[id,'ADM',role,action,branchId,direction]);
    }
    const special=[
      ['ABM','All-Branch Maker','maker',null,null,null,false,false],
      ['KRC','Kolkata Restricted Checker','checker','C1','B3','import',false,false],
      ['PAM','Pune Absent Maker','maker',null,'B4',null,true,false],
      ['NCU','Nagpur Client User','client','C2','B5',null,false,false],
      ['PAR','Overnight Parser','system',null,null,null,false,true]
    ];
    for(const [id,name,role,clientId,branchId,direction,absent,system] of special)await client.query('INSERT INTO users(id,name,role,client_id,branch_id,direction,absent,system_account) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,name,role,clientId,branchId,direction,absent,system]);
    await client.query("INSERT INTO grants(grantee_id,grantor_id,role,action) VALUES('ABM','ADM','maker','prepare')");
    await client.query("INSERT INTO grants(grantee_id,grantor_id,role,action,client_id) VALUES('ABM','ADM','checker','check','C1'),('ABM','ADM','checker','check','C2')");
    await client.query("INSERT INTO grants(grantee_id,grantor_id,role,action,client_id,branch_id,direction) VALUES('KRC','ADM','checker','check','C1','B3','import')");
    await client.query("INSERT INTO grants(grantee_id,grantor_id,role,action,branch_id) VALUES('PAM','ADM','maker','prepare','B4')");
    const stages=['confirmed','new','prepared','checked','filed','cancelled','reopened'];
    for(let i=1;i<=300;i++){
      let branchId=`B${i%5+1}`,direction=i%2?'import':'export',stage=stages[i%stages.length],clientId=`C${i%10+1}`;
      if(i===1){clientId='C1';branchId='B3';direction='import';stage='prepared'}
      if(i===2){clientId='C2';branchId='B5';direction='import';stage='new'}
      await client.query('INSERT INTO jobs(reference,client_id,branch_id,direction,mode,stage) VALUES($1,$2,$3,$4,$5,$6)',[`JOB-${String(i).padStart(4,'0')}`,clientId,branchId,direction,['air','fcl','lcl'][i%3],stage]);
    }
    await client.query("INSERT INTO history(actor_id,job_id,action,new_state,permission_allowed,permission_reason) SELECT 'ADM',id,'job_created',stage,TRUE,'Initial sample job creation.' FROM jobs");
    await client.query('COMMIT');console.log('Seeded 300 jobs, 18 users, 5 branches, 10 clients, and standard plus special grants.');
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release();await db.end()}
})().catch(error=>{console.error(error);process.exitCode=1});
