#!/usr/bin/env python
"""Local coordination: transactional tasks, owned scopes, handoffs and evidence.
Workflow gate only: this does not sandbox agents or launch models.
"""
import argparse
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
import fnmatch
import hashlib
import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import uuid

class GateError(Exception):
    def __init__(self, code, **details): self.code, self.details = code, details

def now(): return datetime.now(timezone.utc).isoformat()
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def load(path):
    try: return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError) as exc: raise GateError('invalid_json', path=str(path), detail=str(exc))
def emit(value): print(json.dumps(value, ensure_ascii=False, indent=2))
def relpath(root, value):
    path=Path(value)
    path=(root/path).resolve() if not path.is_absolute() else path.resolve()
    try: path.relative_to(root)
    except ValueError: raise GateError('unsafe_path', path=str(value))
    return path

def validate(manifest):
    tasks=manifest.get('tasks', [])
    if manifest.get('schema_version') != 1 or not tasks: raise GateError('invalid_manifest')
    ids=[t['id'] for t in tasks]
    if len(ids)!=len(set(ids)): raise GateError('duplicate_task')
    graph={t['id']:t.get('depends_on', []) for t in tasks}
    for t in tasks:
        if t.get('kind') not in ('edit','read') or not t.get('acceptance'): raise GateError('invalid_task', task=t['id'])
        if len(t['acceptance'])!=len(set(t['acceptance'])): raise GateError('invalid_task', task=t['id'])
        for s in t.get('write_scope', []):
            if s.startswith(('/','\\')) or ':' in s or '..' in s.split('/') or '\\' in s: raise GateError('unsafe_path', path=s)
        if t['kind']=='read' and t.get('write_scope'): raise GateError('invalid_task', task=t['id'])
        if any(d not in graph for d in graph[t['id']]): raise GateError('unknown_dependency', task=t['id'])
    def visit(task, chain, done):
        if task in chain: raise GateError('dependency_cycle', task=task)
        if task in done: return
        for d in graph[task]: visit(d, chain|{task}, done)
        done.add(task)
    done=set()
    for task in graph: visit(task, set(), done)

def guard(root, manifest):
    git=subprocess.run(['git','-C',str(root),'branch','--show-current'], capture_output=True, text=True, encoding='utf-8')
    if git.returncode or git.stdout.strip()!=manifest['branch']: raise GateError('wrong_branch', expected=manifest['branch'], actual=git.stdout.strip())
    baseline=load(relpath(root, manifest['baseline']))
    for name, expected in baseline['protected_files'].items():
        p=relpath(root, name)
        if not p.is_file() or sha(p)!=expected: raise GateError('protected_file_changed', path=name)
    if 'content_tree_sha256' in baseline:
        folder=root/'src/content/docs'
        files=sorted(list(folder.rglob('*.md'))+list(folder.rglob('*.mdx')))
        entries=[p.relative_to(root).as_posix()+'\0'+sha(p)+'\n' for p in files]
        digest=hashlib.sha256(''.join(entries).encode('utf-8')).hexdigest()
        if digest!=baseline['content_tree_sha256'] or len(files)!=baseline['content_file_count']: raise GateError('content_changed')
    return baseline

def snapshot(root):
    result=subprocess.run(['git','-C',str(root),'ls-files','-z','--cached','--others','--exclude-standard'], capture_output=True)
    if result.returncode: raise GateError('git_inventory_failed')
    paths={p.decode('utf-8') for p in result.stdout.split(b'\0') if p}
    ignored=('.harness/','docs/visual-redesign/evidence/')
    return {name:sha(root/name) if (root/name).is_file() else None for name in sorted(paths) if not name.startswith(ignored)}

def changes(root, task):
    before=json.loads(task['snapshot']); after=snapshot(root)
    return [p for p in sorted(before.keys()|after.keys()) if before.get(p)!=after.get(p)]

def scope_guard(root, definition, task, db=None, definitions=None):
    changed=changes(root, task)
    scopes=definition.get('write_scope', [])
    if definition['kind']=='read' and db is not None and definitions is not None:
        # Shared-directory attribution is a protocol, not a security boundary.
        # Known writer scopes do not make a concurrently observed diff the
        # reader's work. The reviewer must inspect those changes separately.
        scopes=list(scopes)
        for row in db.execute('SELECT id,snapshot FROM tasks WHERE snapshot IS NOT NULL'):
            other=definitions[row['id']]
            if other['kind']=='edit': scopes.extend(other['write_scope'])
    bad=[p for p in changed if not any(fnmatch.fnmatchcase(p, s) for s in scopes)]
    if bad: raise GateError('scope_violation', paths=bad)
    return changed

@contextmanager
def transaction(db):
    db.execute('BEGIN IMMEDIATE')
    try:
        yield
        db.commit()
    except Exception:
        db.rollback(); raise

def event(db, task, actor, action, payload):
    db.execute('INSERT INTO events(at,task,actor,action,payload) VALUES(?,?,?,?,?)', (now(),task,actor,action,json.dumps(payload,ensure_ascii=False)))
def get_task(db, task):
    row=db.execute('SELECT * FROM tasks WHERE id=?', (task,)).fetchone()
    if not row: raise GateError('unknown_task', task=task)
    return row

def own(task, actor, states=('active',)):
    if task['owner']!=actor: raise GateError('not_owner', task=task['id'])
    if task['status'] not in states: raise GateError('invalid_state', task=task['id'], status=task['status'])

def evidence(db, root, task, ids):
    if not ids: raise GateError('missing_evidence', task=task)
    rows=[]
    for identifier in ids:
        row=db.execute('SELECT * FROM evidence WHERE id=? AND task=?', (identifier,task)).fetchone()
        if not row: raise GateError('invalid_evidence', id=identifier)
        path=relpath(root, row['path'])
        if row['exit_code']!=0 or not path.is_file() or sha(path)!=row['sha256']: raise GateError('invalid_evidence', id=identifier)
        if json.loads(row['source_snapshot'])!=snapshot(root): raise GateError('stale_evidence', id=identifier)
        rows.append(row)
    return rows

def acceptance(db, root, task, definition, doc, review=False):
    checks=doc.get('acceptance', {})
    if set(checks)!=set(definition['acceptance']): raise GateError('acceptance_incomplete', required=definition['acceptance'])
    for key, value in checks.items():
        if review and value.get('passed') is not True: raise GateError('acceptance_failed', check=key)
        rows=evidence(db, root, task['id'], value.get('evidence_ids', []))
        if review and not any(r['actor']==doc['reviewer'] for r in rows): raise GateError('independent_evidence_required', check=key)

def output_file(root, sub, name, value):
    path=root/'.harness'/sub/name; path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
    return path

def parser():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', default=str(Path(__file__).resolve().parents[1]))
    p.add_argument('--manifest', default='docs/visual-redesign/tasks.json')
    sp=p.add_subparsers(dest='cmd', required=True)
    for cmd in ('init','status','guard','events'): sp.add_parser(cmd)
    q=sp.add_parser('packet'); q.add_argument('task')
    for cmd in ('claim','heartbeat','block','resume','release','submit','review','run','artifact','transfer','reopen'):
        q=sp.add_parser(cmd); q.add_argument('task'); q.add_argument('--actor', required=True)
        if cmd=='block': q.add_argument('--reason', required=True)
        if cmd=='submit': q.add_argument('--handoff', required=True)
        if cmd=='review': q.add_argument('--report', required=True); q.add_argument('--human-approval')
        if cmd=='run': q.add_argument('--purpose', required=True); q.add_argument('--timeout', type=int, default=300)
        if cmd=='artifact': q.add_argument('--path', required=True); q.add_argument('--purpose', required=True)
        if cmd=='transfer': q.add_argument('--to', required=True); q.add_argument('--reason', required=True)
        if cmd=='reopen': q.add_argument('--reason', required=True)
    return p

def main():
    argv=sys.argv[1:]; command=[]
    if '--' in argv:
        i=argv.index('--'); command=argv[i+1:]; argv=argv[:i]
    a=parser().parse_args(argv); root=Path(a.root).resolve()
    manifest_path=relpath(root,a.manifest); manifest=load(manifest_path); validate(manifest)
    definitions={t['id']:t for t in manifest['tasks']}
    if a.cmd=='packet':
        if a.task not in definitions: raise GateError('unknown_task', task=a.task)
        emit({'task':definitions[a.task], 'read_first':manifest.get('read_first',[]), 'protocol':'docs/visual-redesign/AGENT-CONTRACT.md'}); return 0
    guard(root,manifest)
    if a.cmd=='guard': emit({'status':'passed','branch':manifest['branch'],'protected_files':'unchanged'}); return 0
    directory=root/'.harness'; directory.mkdir(exist_ok=True)
    db=sqlite3.connect(directory/'state.sqlite3', timeout=30, isolation_level=None); db.row_factory=sqlite3.Row
    db.execute('PRAGMA journal_mode=WAL'); db.execute('PRAGMA busy_timeout=30000')
    db.executescript('''CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,status TEXT NOT NULL,owner TEXT,heartbeat TEXT,snapshot TEXT,reason TEXT,handoff TEXT,review TEXT);
    CREATE TABLE IF NOT EXISTS evidence(id INTEGER PRIMARY KEY,task TEXT NOT NULL,actor TEXT NOT NULL,kind TEXT NOT NULL,path TEXT NOT NULL,sha256 TEXT NOT NULL,exit_code INTEGER NOT NULL,purpose TEXT NOT NULL,at TEXT NOT NULL,source_snapshot TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,at TEXT NOT NULL,task TEXT,actor TEXT,action TEXT NOT NULL,payload TEXT NOT NULL);''')
    digest=sha(manifest_path)
    if a.cmd=='init':
        with transaction(db):
            prior=db.execute("SELECT value FROM meta WHERE key='manifest'").fetchone()
            if prior and prior['value']!=digest: raise GateError('manifest_changed')
            db.execute("INSERT OR IGNORE INTO meta VALUES('manifest',?)", (digest,))
            for t in definitions: db.execute("INSERT OR IGNORE INTO tasks(id,status) VALUES(?,'todo')", (t,))
            event(db,None,'coordinator','init',{'tasks':len(definitions)})
        emit({'status':'initialized','tasks':len(definitions),'database':str(directory/'state.sqlite3')}); return 0
    prior=db.execute("SELECT value FROM meta WHERE key='manifest'").fetchone()
    if not prior: raise GateError('not_initialized')
    if prior['value']!=digest: raise GateError('manifest_changed')
    if a.cmd=='status':
        rows=[dict(r) for r in db.execute('SELECT id,status,owner,heartbeat,reason,handoff,review FROM tasks ORDER BY rowid')]
        for row in rows:
            for key in ('handoff','review'):
                row[key]=json.loads(row[key]) if row[key] else None
        states={r['id']:r['status'] for r in rows}
        ready=[t for t,d in definitions.items() if states[t]=='todo' and all(states[n]=='accepted' for n in d['depends_on'])]
        emit({'branch':manifest['branch'],'ready':ready,'counts':dict(Counter(states.values())),'tasks':rows}); return 0
    if a.cmd=='events':
        emit([dict(r) for r in db.execute('SELECT * FROM events ORDER BY id DESC LIMIT 100')]); return 0
    definition=definitions.get(a.task)
    if definition is None: raise GateError('unknown_task',task=a.task)
    if a.cmd in ('run','artifact'):
        task=get_task(db,a.task)
        if task['status']!='review': own(task,a.actor)
        if a.cmd=='run':
            if not command: raise GateError('command_missing')
            if a.timeout<=0: raise GateError('invalid_timeout')
            started=now()
            try:
                r=subprocess.run(command,cwd=root,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=a.timeout,shell=False)
                code=r.returncode; stdout=r.stdout; stderr=r.stderr
            except subprocess.TimeoutExpired as e:
                code=124; stdout=e.stdout or ''; stderr=e.stderr or ''
                if isinstance(stdout,bytes): stdout=stdout.decode('utf-8',errors='replace')
                if isinstance(stderr,bytes): stderr=stderr.decode('utf-8',errors='replace')
                stderr+='\nTimed out; check child processes before continuing.'
            except OSError as e: code=127; stdout=''; stderr=str(e)
            value={'task_id':a.task,'actor':a.actor,'purpose':a.purpose,'argv':command,'cwd':str(root),'started':started,'finished':now(),'exit_code':code,'stdout':stdout,'stderr':stderr}
            path=output_file(root,'runs',uuid.uuid4().hex+'.json',value); kind='command'
        else:
            path=relpath(root,a.path)
            if not path.is_file(): raise GateError('artifact_missing',path=str(path))
            code=0; kind='artifact'
        with transaction(db):
            current=get_task(db,a.task)
            if current['status']!=task['status'] or current['owner']!=task['owner']: raise GateError('task_changed_during_run')
            relative=path.relative_to(root).as_posix()
            cursor=db.execute('INSERT INTO evidence(task,actor,kind,path,sha256,exit_code,purpose,at,source_snapshot) VALUES(?,?,?,?,?,?,?,?,?)',(a.task,a.actor,kind,relative,sha(path),code,a.purpose,now(),json.dumps(snapshot(root),ensure_ascii=False)))
            identifier=cursor.lastrowid; event(db,a.task,a.actor,kind,{'id':identifier,'exit_code':code,'path':relative})
        emit({'evidence_id':identifier,'exit_code':code,'path':relative,'kind':kind})
        return code if 0<=code<=125 else 1
    with transaction(db):
        task=get_task(db,a.task)
        if a.cmd=='reopen':
            if a.actor not in manifest['coordinators']: raise GateError('coordinator_required')
            if task['status']!='accepted': raise GateError('invalid_state')
            affected={a.task}
            while True:
                enlarged=affected|{t for t,d in definitions.items() if any(n in affected for n in d['depends_on'])}
                if enlarged==affected: break
                affected=enlarged
            running=[t for t in affected if get_task(db,t)['status'] in ('active','review','blocked')]
            if running: raise GateError('descendant_in_progress',tasks=sorted(running))
            busy=[r['id'] for r in db.execute("SELECT id FROM tasks WHERE status IN ('active','review','blocked')") if definitions[r['id']]['kind']=='edit']
            if busy: raise GateError('writer_busy',tasks=busy)
            for t in sorted(affected):
                previous=dict(get_task(db,t))
                event(db,t,a.actor,'acceptance_invalidated',{'reason':a.reason,'previous':previous})
                db.execute("UPDATE tasks SET status='todo',owner=NULL,snapshot=NULL,handoff=NULL,review=NULL,reason=?,heartbeat=? WHERE id=?",(a.reason,now(),t))
        elif a.cmd=='transfer':
            if a.actor not in manifest['coordinators']: raise GateError('coordinator_required')
            if task['status'] not in ('active','blocked'): raise GateError('invalid_state')
            if not a.to.strip() or a.to==task['owner']: raise GateError('invalid_new_owner')
            db.execute('UPDATE tasks SET owner=?,heartbeat=? WHERE id=?',(a.to,now(),a.task))
            event(db,a.task,a.actor,'ownership_transfer',{'from':task['owner'],'to':a.to,'reason':a.reason})
        elif a.cmd=='claim':
            if task['status']!='todo': raise GateError('task_not_available',status=task['status'])
            deps=[d for d in definition['depends_on'] if get_task(db,d)['status']!='accepted']
            if deps: raise GateError('dependencies_not_accepted',dependencies=deps)
            if definition['kind']=='edit':
                busy=[r['id'] for r in db.execute("SELECT id FROM tasks WHERE status IN ('active','review','blocked')") if definitions[r['id']]['kind']=='edit']
                if busy: raise GateError('writer_busy',tasks=busy)
            snap=json.dumps(snapshot(root),ensure_ascii=False)
            db.execute("UPDATE tasks SET status='active',owner=?,heartbeat=?,snapshot=?,reason=NULL WHERE id=?",(a.actor,now(),snap,a.task))
        elif a.cmd in ('heartbeat','block','resume','release'):
            own(task,a.actor,('active','blocked'))
            if a.cmd=='heartbeat': db.execute('UPDATE tasks SET heartbeat=? WHERE id=?',(now(),a.task))
            if a.cmd=='block': db.execute("UPDATE tasks SET status='blocked',reason=?,heartbeat=? WHERE id=?",(a.reason,now(),a.task))
            if a.cmd=='resume':
                if task['status']!='blocked': raise GateError('invalid_state')
                db.execute("UPDATE tasks SET status='active',reason=NULL,heartbeat=? WHERE id=?",(now(),a.task))
            if a.cmd=='release':
                changed=changes(root,task)
                if changed: raise GateError('unreleased_changes',paths=changed)
                db.execute("UPDATE tasks SET status='todo',owner=NULL,reason=NULL,snapshot=NULL WHERE id=?",(a.task,))
        elif a.cmd=='submit':
            own(task,a.actor); changed=scope_guard(root,definition,task,db,definitions)
            doc=load(relpath(root,a.handoff))
            if doc.get('task_id')!=a.task or not doc.get('summary') or not isinstance(doc.get('risks'),list) or 'next_task' not in doc: raise GateError('invalid_handoff')
            acceptance(db,root,task,definition,doc)
            doc['changed_files']=changed
            doc['submission_snapshot']=snapshot(root)
            path=output_file(root,'handoffs',a.task+'-'+uuid.uuid4().hex+'.json',doc)
            output_file(root,'handoffs',a.task+'.json',doc)  # readable latest pointer, not the durable handle
            db.execute("UPDATE tasks SET status='review',handoff=?,heartbeat=? WHERE id=?",(json.dumps({'path':path.relative_to(root).as_posix(),'sha256':sha(path)}),now(),a.task))
        elif a.cmd=='review':
            if a.actor not in manifest['coordinators']: raise GateError('coordinator_required')
            if task['status']!='review': raise GateError('invalid_state')
            doc=load(relpath(root,a.report))
            if doc.get('task_id')!=a.task or doc.get('decision') not in ('accept','changes') or not doc.get('reviewer'): raise GateError('invalid_review')
            if doc['reviewer']==task['owner']: raise GateError('self_review')
            handoff=json.loads(task['handoff']); hpath=relpath(root,handoff['path'])
            if not hpath.is_file() or sha(hpath)!=handoff['sha256']: raise GateError('handoff_changed')
            if doc['decision']=='accept':
                submitted=load(hpath)
                if submitted['submission_snapshot']!=snapshot(root): raise GateError('submission_changed')
                acceptance(db,root,task,definition,load(hpath))
                scope_guard(root,definition,task,db,definitions)
                acceptance(db,root,task,definition,doc,review=True)
                if definition.get('human_gate'):
                    if not a.human_approval: raise GateError('human_approval_required')
                    approval=load(relpath(root,a.human_approval))
                    if approval.get('task_id')!=a.task or approval.get('decision')!='approved' or not approval.get('user_message'): raise GateError('human_approval_required')
                    doc['human_approval']=approval
            path=output_file(root,'reviews',a.task+'-'+uuid.uuid4().hex+'.json',doc)
            output_file(root,'reviews',a.task+'.json',doc)
            status='accepted' if doc['decision']=='accept' else 'active'
            db.execute('UPDATE tasks SET status=?,review=?,heartbeat=? WHERE id=?',(status,json.dumps({'path':path.relative_to(root).as_posix(),'sha256':sha(path)}),now(),a.task))
        event(db,a.task,a.actor,a.cmd,{'status':get_task(db,a.task)['status']})
    emit({'task_id':a.task,'status':get_task(db,a.task)['status'],'actor':a.actor}); return 0

if __name__=='__main__':
    try: sys.exit(main())
    except GateError as e: emit({'error':e.code,**e.details}); sys.exit(2)
    except (OSError,sqlite3.Error,KeyError,TypeError) as e:
        emit({'error':'operational_error','detail':str(e)}); sys.exit(2)
