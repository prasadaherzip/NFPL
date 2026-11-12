const {openDatabase,initDatabase}=require('../src/db');

(async()=>{
  const db=openDatabase();
  await initDatabase(db);
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    await client.query('TRUNCATE history, grants, jobs, users, clients, branches RESTART IDENTITY CASCADE');
    for(const [id,name] of [['B1','Mumbai'],['B2','Delhi'],['B3','Kolkata'],['B4','Pune'],['B5','Nagpur']]) await client.query('INSERT INTO branches(id,name) VALUES($1,$2)',[id,name]);
    for(let i=1;i<=20;i++) await client.query('INSERT INTO clients(id,name) VALUES($1,$2)',[`C${i}`,`Client ${i}`]);
    for(let i=1;i<=500;i++) await client.query('INSERT INTO users(id,name,role,branch_id,direction) VALUES($1,$2,$3,$4,$5)',[`u${i}`,`Scale User ${i}`,['maker','checker','filer'][i%3],`B${i%5+1}`,i%2?'import':'export']);
    const start=performance.now();
    for(let i=1;i<=200000;i++){
      const stage=['new','prepared','checked','filed'][i%4];
      await client.query('INSERT INTO jobs(reference,client_id,branch_id,direction,mode,stage) VALUES($1,$2,$3,$4,$5,$6)',[`SCALE-${i}`,`C${i%20+1}`,`B${i%5+1}`,i%2?'import':'export',['air','fcl','lcl'][i%3],stage]);
    }
    await client.query('COMMIT');
    const duration=performance.now()-start;
    const queryStart=performance.now();
    const result=await db.query("SELECT count(*)::int n FROM jobs WHERE branch_id=$1 AND direction=$2 AND stage IN ('new','reopened')",['B1','import']);
    console.log(JSON.stringify({users:500,jobs:200000,branches:5,insertMs:Math.round(duration),queryMs:Math.round(performance.now()-queryStart),matchingJobs:result.rows[0].n,db:'PostgreSQL'},null,2));
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release();await db.end()}
})().catch(error=>{console.error(error);process.exitCode=1});
