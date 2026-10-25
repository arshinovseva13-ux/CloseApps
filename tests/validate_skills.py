from pathlib import Path
import re,sys
root=Path(__file__).resolve().parents[1]
expected=["pixel-forge","code-architect","bug-hunter","game-craft","test-engineer","performance-tuner","secure-builder","docs-and-handoff","web-app-builder","three-d-motion"]
errors=[]
base=root/'skills'; found={p.name for p in base.iterdir() if p.is_dir() and (p/'SKILL.md').exists()} if base.exists() else set()
if found!=set(expected): errors.append(f'Folder mismatch: missing={sorted(set(expected)-found)}, extra={sorted(found-set(expected))}')
for slug in expected:
 p=base/slug/'SKILL.md'; t=base/slug/'TESTS.md'
 if not p.exists(): errors.append(f'{slug}: missing SKILL.md'); continue
 m=re.match(r'^---\s*\n([\s\S]*?)\n---\s*\n',p.read_text(encoding='utf-8'))
 if not m: errors.append(f'{slug}: invalid frontmatter'); continue
 meta=m.group(1); n=re.search(r'^name:\s*([a-z0-9-]+)\s*$',meta,re.M); d=re.search(r'^description:\s*(.+)$',meta,re.M)
 if not n or n.group(1)!=slug: errors.append(f'{slug}: name mismatch')
 if not d or not d.group(1).strip() or len(d.group(1))>1024: errors.append(f'{slug}: invalid description')
 if not t.exists(): errors.append(f'{slug}: missing TESTS.md')
if errors: print('FAILED\\n'+'\\n'.join(errors)); sys.exit(1)
print(f'PASSED: {len(expected)} skills, metadata, and tests')
