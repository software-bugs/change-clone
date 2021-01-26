import os
import json

patches = []
patchId = 0
with open('bugs.json') as json_file:
    changes = json.load(json_file)
    for change in changes:
        patch = None
        for preprocessed_patch in patches:
            if change['fixCommitSHA1'] == preprocessed_patch['fixCommitSHA1'] and change['fixCommitParentSHA1'] == preprocessed_patch['fixCommitParentSHA1']:
                patch = preprocessed_patch
                break
        if patch is None:
            patch = {}
            patch['projectName'] = change['projectName']
            patch['projectURL'] = "https://github.com/" + change['projectName'].replace(".", "/")
            patch['patchId'] = patchId
            patch['fixCommitSHA1'] = change['fixCommitSHA1']
            patch['fixCommitURL'] = patch['projectURL'] + "/commit/" + change['fixCommitSHA1']
            patch['fixCommitParentSHA1'] = change['fixCommitParentSHA1']
            patch['fixCommitParentURL'] = patch['projectURL'] + "/commit/" + change['fixCommitParentSHA1']
            patch['files'] = []
            patch['SStuBpatterns'] = []
            patches.append(patch)

        patchedFile = None
        for f in patch['files']:
            if change['bugFilePath'] == f['patchFilePath']:
                patchedFile = f
                break
        if patchedFile is None:
            patchedFile = {}
            patchedFile['patchFilePath'] = change['bugFilePath']
            patchedFile['fixPatch'] = change['fixPatch']
            patchedFile['changes'] = []
            patch['files'].append(patchedFile)

        changes = {}
        changes['patchLineNum'] = change['bugLineNum']
        changes['patchNodeStartChar'] = change['bugNodeStartChar']
        changes['patchNodeLength'] = change['bugNodeLength']
        changes['fixLineNum'] = change['fixLineNum']
        changes['fixNodeStartChar'] = change['fixNodeStartChar']
        changes['fixNodeLength'] = change['fixNodeLength']
        changes['sourceBeforeFix'] = change['sourceBeforeFix']
        changes['sourceAfterFix'] = change['sourceAfterFix']
        patchedFile['changes'].append(changes)

        patchId += 1
    
with open('sstubs.json') as json_file:
    sstubs = json.load(json_file)
    for sstub in sstubs:
        for preprocessed_patch in patches:
            if sstub['fixCommitSHA1'] == preprocessed_patch['fixCommitSHA1'] and sstub['fixCommitParentSHA1'] == preprocessed_patch['fixCommitParentSHA1']:
                if sstub['bugType'] not in preprocessed_patch['SStuBpatterns']:
                    preprocessed_patch['SStuBpatterns'].append(sstub['bugType'])

for preprocessed_patch in patches:
    nbChanges = 0
    for f in preprocessed_patch['files']:
        for change in f['changes']:
            nbChanges += 1
    preprocessed_patch['nbChanges'] = nbChanges

to_remove = []
all_diffs = set()
for i in range(len(patches)):
    print(i, len(patches))
    
    preprocessed_patch = patches[i]
    diffs = []
    for f in preprocessed_patch['files']:
        diffs.append(f['fixPatch'])
    diffs = sorted(diffs)
    unified_diff = ''.join(diffs)
    
    clean_unified_diff = []
    for line in unified_diff.split('\n'):
        if line[:2] == '@@':
            continue
        if line[:5] == 'index':
            continue
        clean_unified_diff.append(line)
    clean_unified_diff = '\n'.join(clean_unified_diff)
    
    if clean_unified_diff in all_diffs:
        to_remove.append(preprocessed_patch)
        continue
        
    all_diffs.add(clean_unified_diff)

for r in to_remove:
    patches.remove(r)

with open(os.path.join('data', 'patches.json'), 'w') as outfile:
    json.dump(patches, outfile, indent=4)
