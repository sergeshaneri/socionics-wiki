"""Contract tests for the local agent coordination CLI (stdlib only)."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'agent-harness.py'
SCRATCH = Path(os.getenv('HERMES_HARNESS_TEST_TMP', 'C:/Users/user/AppData/Local/hermes/cache/scratch'))
SCRATCH.mkdir(parents=True, exist_ok=True)

class HarnessTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='wiki-harness-test-', dir=SCRATCH)
        self.root = Path(self.tmp.name)
        self.git('init', '-b', 'visual/reading-experience')
        self.git('config', 'user.name', 'Harness test')
        self.git('config', 'user.email', 'harness-test@example.invalid')
        (self.root / '.gitignore').write_text('.harness/\nevidence/\n', encoding='utf-8')
        (self.root / 'style.css').write_text('body {}', encoding='utf-8')
        (self.root / 'protected.md').write_text('user changes', encoding='utf-8')
        self.git('add', '.')
        self.git('commit', '-m', 'fixture')
        baseline = {'branch': 'visual/reading-experience', 'protected_files': {'protected.md': self.sha(self.root/'protected.md')}}
        (self.root / 'baseline.json').write_text(json.dumps(baseline), encoding='utf-8')
        self.manifest = {'schema_version':1, 'branch':'visual/reading-experience', 'baseline':'baseline.json', 'coordinators':['coordinator'], 'tasks':[
            {'id':'A','title':'Foundation','kind':'edit','depends_on':[], 'write_scope':['style.css'], 'acceptance':['C1'], 'human_gate':False},
            {'id':'B','title':'Dependent','kind':'edit','depends_on':['A'], 'write_scope':['other.css'], 'acceptance':['C1'], 'human_gate':False},
            {'id':'R','title':'Read only','kind':'read','depends_on':[], 'write_scope':[], 'acceptance':['C1'], 'human_gate':False}]}
        self.save_manifest()
    def tearDown(self): self.tmp.cleanup()
    def git(self,*args):
        p=subprocess.run(['git','-C',str(self.root),*args],capture_output=True,text=True,encoding='utf-8')
        self.assertEqual(p.returncode,0,p.stderr)
        return p.stdout
    def sha(self,path): return hashlib.sha256(path.read_bytes()).hexdigest()
    def save_manifest(self): (self.root/'tasks.json').write_text(json.dumps(self.manifest),encoding='utf-8')
    def cli(self,*args,ok=True):
        p=subprocess.run([sys.executable,str(SCRIPT),'--root',str(self.root),'--manifest','tasks.json',*args],capture_output=True,text=True,encoding='utf-8')
        if ok: self.assertEqual(p.returncode,0,p.stdout+p.stderr)
        else: self.assertNotEqual(p.returncode,0,p.stdout+p.stderr)
        return json.loads(p.stdout)
    def init(self): return self.cli('init')
    def runproof(self,task='A',actor='worker',code="print('реальная проверка')"):
        return self.cli('run',task,'--actor',actor,'--purpose','test','--',sys.executable,'-c',code)
    def submit(self,task='A',actor='worker',evidence=None):
        ev=evidence or self.runproof(task,actor)['evidence_id']
        handoff={'task_id':task,'summary':'tested','acceptance':{'C1':{'evidence_ids':[ev],'note':'real execution'}},'risks':[],'next_task':'B'}
        path=self.root/'evidence'/f'{task}-handoff.json'; path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps(handoff),encoding='utf-8')
        return self.cli('submit',task,'--actor',actor,'--handoff',str(path))
    def review(self,task='A',owner='worker'):
        proof=self.runproof(task,'reviewer')['evidence_id']
        report={'task_id':task,'reviewer':'reviewer','decision':'accept','acceptance':{'C1':{'passed':True,'evidence_ids':[proof],'note':'independent check'}},'notes':[]}
        path=self.root/'evidence'/f'{task}-review.json'; path.write_text(json.dumps(report),encoding='utf-8')
        return self.cli('review',task,'--actor','coordinator','--report',str(path))
    def test_cli_exists(self):
        self.assertTrue(SCRIPT.is_file(), 'The coordination CLI has not been implemented')
    def test_initial_status_and_dependencies(self):
        self.init(); data=self.cli('status'); self.assertEqual(data['ready'],['A','R'])
        self.assertEqual(self.cli('claim','B','--actor','worker',ok=False)['error'],'dependencies_not_accepted')
    def test_claim_and_wrong_owner(self):
        self.init(); self.cli('claim','A','--actor','worker')
        self.assertEqual(self.cli('heartbeat','A','--actor','other',ok=False)['error'],'not_owner')
    def test_two_processes_cannot_claim_same_task(self):
        self.init()
        def attempt(actor):
            p=subprocess.run([sys.executable,str(SCRIPT),'--root',str(self.root),'--manifest','tasks.json','claim','A','--actor',actor],capture_output=True,text=True,encoding='utf-8')
            return p.returncode
        with ThreadPoolExecutor(max_workers=2) as pool: codes=list(pool.map(attempt,['one','two']))
        self.assertEqual(sorted(codes),[0,2])
    def test_single_writer_and_parallel_reader(self):
        self.manifest['tasks'][1]['depends_on']=[]; self.save_manifest(); self.init()
        self.cli('claim','A','--actor','worker')
        self.assertEqual(self.cli('claim','B','--actor','second',ok=False)['error'],'writer_busy')
        self.cli('claim','R','--actor','reader')
    def test_command_evidence_and_accepted_dependency(self):
        self.init(); self.cli('claim','A','--actor','worker')
        (self.root/'style.css').write_text('body { color: gray; }',encoding='utf-8')
        proof=self.runproof(); self.assertEqual(proof['exit_code'],0)
        log=json.loads((self.root/proof['path']).read_text(encoding='utf-8'))
        self.assertIn('реальная проверка',log['stdout'])
        self.submit(evidence=proof['evidence_id']); self.review()
        self.cli('claim','B','--actor','worker2')
        self.assertEqual(self.cli('status')['counts']['accepted'],1)
    def test_code_change_after_check_requires_fresh_evidence(self):
        self.init(); self.cli('claim','A','--actor','worker'); proof=self.runproof()['evidence_id']
        (self.root/'style.css').write_text('body {color:gray}',encoding='utf-8')
        path=self.root/'evidence'/'handoff.json'; path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps({'task_id':'A','summary':'done','acceptance':{'C1':{'evidence_ids':[proof],'note':'old run'}},'risks':[],'next_task':'B'}),encoding='utf-8')
        self.assertEqual(self.cli('submit','A','--actor','worker','--handoff',str(path),ok=False)['error'],'stale_evidence')
    def test_change_after_submission_invalidates_review(self):
        self.init(); self.cli('claim','A','--actor','worker'); self.submit()
        (self.root/'style.css').write_text('body {color: red}',encoding='utf-8')
        proof=self.runproof('A','reviewer')['evidence_id']
        path=self.root/'evidence'/'review.json'
        path.write_text(json.dumps({'task_id':'A','reviewer':'reviewer','decision':'accept','acceptance':{'C1':{'passed':True,'evidence_ids':[proof]}},'notes':[]}),encoding='utf-8')
        self.assertEqual(self.cli('review','A','--actor','coordinator','--report',str(path),ok=False)['error'],'submission_changed')
    def test_self_review_refused(self):
        self.init(); self.cli('claim','A','--actor','worker'); self.submit()
        path=self.root/'evidence'/'bad-review.json'
        path.write_text(json.dumps({'task_id':'A','reviewer':'worker','decision':'accept','acceptance':{'C1':{'passed':True,'evidence_ids':[1]}},'notes':[]}),encoding='utf-8')
        self.assertEqual(self.cli('review','A','--actor','coordinator','--report',str(path),ok=False)['error'],'self_review')
    def test_protected_file_change_blocks_submission(self):
        self.init(); self.cli('claim','A','--actor','worker'); proof=self.runproof()['evidence_id']
        (self.root/'protected.md').write_text('changed',encoding='utf-8')
        self.assertEqual(self.cli('guard',ok=False)['error'],'protected_file_changed')
    def test_content_digest_blocks_silent_article_edits(self):
        folder=self.root/'src/content/docs'; folder.mkdir(parents=True)
        file=folder/'a.md'; file.write_text('original',encoding='utf-8')
        baseline=json.loads((self.root/'baseline.json').read_text(encoding='utf-8'))
        entry='src/content/docs/a.md'+chr(0)+self.sha(file)+chr(10)
        baseline['content_tree_sha256']=hashlib.sha256(entry.encode('utf-8')).hexdigest()
        baseline['content_file_count']=1
        (self.root/'baseline.json').write_text(json.dumps(baseline),encoding='utf-8')
        self.init(); file.write_text('rewritten',encoding='utf-8')
        self.assertEqual(self.cli('guard',ok=False)['error'],'content_changed')
    def test_out_of_scope_change_blocks_submission(self):
        self.init(); self.cli('claim','A','--actor','worker'); proof=self.runproof()['evidence_id']
        (self.root/'outside.txt').write_text('bad',encoding='utf-8')
        path=self.root/'evidence'/'handoff.json'; path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps({'task_id':'A','summary':'done','acceptance':{'C1':{'evidence_ids':[proof],'note':'ok'}},'risks':[],'next_task':'B'}),encoding='utf-8')
        self.assertEqual(self.cli('submit','A','--actor','worker','--handoff',str(path),ok=False)['error'],'scope_violation')
    def test_failed_evidence_is_not_accepted(self):
        self.init(); self.cli('claim','A','--actor','worker')
        p=subprocess.run([sys.executable,str(SCRIPT),'--root',str(self.root),'--manifest','tasks.json','run','A','--actor','worker','--purpose','fail','--',sys.executable,'-c','raise SystemExit(3)'],capture_output=True,text=True,encoding='utf-8')
        data=json.loads(p.stdout); self.assertEqual(p.returncode,3); self.assertEqual(data['exit_code'],3)
        path=self.root/'evidence'/'handoff.json'; path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps({'task_id':'A','summary':'done','acceptance':{'C1':{'evidence_ids':[data['evidence_id']],'note':'ok'}},'risks':[],'next_task':'B'}),encoding='utf-8')
        self.assertEqual(self.cli('submit','A','--actor','worker','--handoff',str(path),ok=False)['error'],'invalid_evidence')
    def test_tampered_evidence_refused(self):
        self.init(); self.cli('claim','A','--actor','worker'); proof=self.runproof()
        (self.root/proof['path']).write_text('{}',encoding='utf-8')
        path=self.root/'evidence'/'handoff.json'; path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps({'task_id':'A','summary':'done','acceptance':{'C1':{'evidence_ids':[proof['evidence_id']],'note':'ok'}},'risks':[],'next_task':'B'}),encoding='utf-8')
        self.assertEqual(self.cli('submit','A','--actor','worker','--handoff',str(path),ok=False)['error'],'invalid_evidence')
    def test_human_gate_cannot_be_auto_accepted(self):
        self.manifest['tasks'][0]['human_gate']=True; self.save_manifest(); self.init()
        self.cli('claim','A','--actor','worker'); self.submit()
        proof=self.runproof('A','reviewer')['evidence_id']
        path=self.root/'evidence'/'review.json'
        path.write_text(json.dumps({'task_id':'A','reviewer':'reviewer','decision':'accept','acceptance':{'C1':{'passed':True,'evidence_ids':[proof]}},'notes':[]}),encoding='utf-8')
        self.assertEqual(self.cli('review','A','--actor','coordinator','--report',str(path),ok=False)['error'],'human_approval_required')
    def test_manifest_change_requires_explicit_reconciliation(self):
        self.init(); self.manifest['tasks'][0]['title']='changed'; self.save_manifest()
        self.assertEqual(self.cli('status',ok=False)['error'],'manifest_changed')
    def test_cycle_refused(self):
        self.manifest['tasks'][0]['depends_on']=['B']; self.save_manifest()
        self.assertEqual(self.cli('init',ok=False)['error'],'dependency_cycle')
    def test_scope_escape_refused(self):
        self.manifest['tasks'][0]['write_scope']=['../escape']; self.save_manifest()
        self.assertEqual(self.cli('init',ok=False)['error'],'unsafe_path')
    def test_coordinator_transfers_incomplete_task_preserving_scope(self):
        self.init(); self.cli('claim','A','--actor','worker')
        (self.root/'style.css').write_text('body {color:gray}',encoding='utf-8')
        self.cli('transfer','A','--actor','coordinator','--to','replacement','--reason','owner interrupted')
        self.assertEqual(self.cli('heartbeat','A','--actor','worker',ok=False)['error'],'not_owner')
        self.submit('A','replacement'); self.review()
    def test_reopen_invalidates_accepted_descendants(self):
        self.init(); self.cli('claim','A','--actor','worker'); self.submit(); self.review()
        self.cli('claim','B','--actor','second'); self.submit('B','second'); self.review('B','second')
        self.cli('reopen','A','--actor','coordinator','--reason','regression found')
        states={t['id']:t['status'] for t in self.cli('status')['tasks']}
        self.assertEqual(states['A'],'todo'); self.assertEqual(states['B'],'todo')
        self.assertEqual(self.cli('claim','B','--actor','second',ok=False)['error'],'dependencies_not_accepted')
    def test_reopen_preserves_versioned_handoff_artifacts(self):
        self.init(); self.cli('claim','A','--actor','worker'); self.submit(); self.review()
        row=next(t for t in self.cli('status')['tasks'] if t['id']=='A')
        handle=row.get('handoff'); self.assertIsInstance(handle,dict,'status must expose an exact durable handoff handle')
        old_path=self.root/handle['path']; old_sha=self.sha(old_path)
        self.cli('reopen','A','--actor','coordinator','--reason','repeat')
        self.cli('claim','A','--actor','replacement'); self.submit('A','replacement')
        new=next(t for t in self.cli('status')['tasks'] if t['id']=='A')['handoff']
        self.assertNotEqual(new['path'],handle['path']); self.assertEqual(self.sha(old_path),old_sha)
    def test_reopen_refuses_running_descendant(self):
        self.init(); self.cli('claim','A','--actor','worker'); self.submit(); self.review()
        self.cli('claim','B','--actor','second')
        self.assertEqual(self.cli('reopen','A','--actor','coordinator','--reason','regression',ok=False)['error'],'descendant_in_progress')
    def test_wrong_branch_refused(self):
        self.git('switch','-c','wrong'); self.assertEqual(self.cli('init',ok=False)['error'],'wrong_branch')
    def test_no_silent_reclaim_and_release_only_without_edits(self):
        self.init(); self.cli('claim','A','--actor','worker'); self.cli('block','A','--actor','worker','--reason','needs input')
        self.assertEqual(self.cli('claim','A','--actor','other',ok=False)['error'],'task_not_available')
        self.cli('resume','A','--actor','worker')
        (self.root/'style.css').write_text('body{color:red}',encoding='utf-8')
        self.assertEqual(self.cli('release','A','--actor','worker',ok=False)['error'],'unreleased_changes')
    def test_parallel_reader_can_submit_with_owned_foreign_changes(self):
        self.init(); self.cli('claim','A','--actor','worker'); self.cli('claim','R','--actor','reader')
        (self.root/'style.css').write_text('body {color:gray}',encoding='utf-8')
        self.submit('R','reader')
        self.assertEqual(next(t for t in self.cli('status')['tasks'] if t['id']=='R')['status'],'review')
    def test_read_task_cannot_submit_code_edits(self):
        self.init(); self.cli('claim','R','--actor','reader'); proof=self.runproof('R','reader')['evidence_id']
        (self.root/'style.css').write_text('body{color:red}',encoding='utf-8')
        path=self.root/'evidence'/'read-handoff.json'; path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps({'task_id':'R','summary':'done','acceptance':{'C1':{'evidence_ids':[proof],'note':'ok'}},'risks':[],'next_task':'A'}),encoding='utf-8')
        self.assertEqual(self.cli('submit','R','--actor','reader','--handoff',str(path),ok=False)['error'],'scope_violation')

if __name__=='__main__': unittest.main()
