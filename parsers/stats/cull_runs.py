#!/usr/bin/env python3
"""Remove junk runs from the raw STS1 dump and write a clean copy.

Uses the same rules as aggregate_runs.py. The input is never modified, and an
interrupted cull resumes where it stopped. See docs/stats-plan.md.
"""
import argparse
import gzip
import hashlib
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool
from pathlib import Path

from aggregate_runs import SCRIPT_HASH, find_files, read_records, reject_reason

COUNTS_SUFFIX = '.counts'
REPORT_NAME = 'cull_report.txt'


def cull_file(job):
    source, target, min_floor, min_build, options = job
    target = Path(target)
    counts_file = Path(f'{target}{COUNTS_SUFFIX}')
    if target.exists() and counts_file.exists():
        saved = json.loads(counts_file.read_text(encoding='utf-8'))
        if saved['options'] == options and saved['source_mtime'] == source.stat().st_mtime_ns:
            return saved

    result = {'options': options, 'source_mtime': source.stat().st_mtime_ns, 'read': 0, 'kept': 0, 'bad_file': 0, 'rejected': {}, 'kept_builds': {}}
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = Path(f'{target}.tmp')
    try:
        with gzip.open(temp, 'wt', encoding='utf-8') as out:
            for run in read_records(source):
                result['read'] += 1
                try:
                    reason = reject_reason(run, min_floor, min_build)
                except (TypeError, ValueError, AttributeError, KeyError):
                    reason = 'malformed'
                if reason:
                    result['rejected'][reason] = result['rejected'].get(reason, 0) + 1
                    continue
                result['kept'] += 1
                build = str(run.get('build_version') or 'unknown')
                result['kept_builds'][build] = result['kept_builds'].get(build, 0) + 1
                out.write(json.dumps(run, separators=(',', ':')) + '\n')
    except (OSError, EOFError, ValueError) as error:
        print(f'skipping unreadable file {source}: {error}', file=sys.stderr)
        temp.unlink(missing_ok=True)
        return {'read': 0, 'kept': 0, 'bad_file': 1, 'rejected': {}, 'kept_builds': {}}

    temp.replace(target)
    counts_file.write_text(json.dumps(result), encoding='utf-8')
    return result


def report_text(totals, rejected, builds):
    lines = [
        f'Files:      {totals["files"]:,} ({totals["bad_files"]:,} unreadable)',
        f'Runs read:  {totals["read"]:,}',
        f'Runs kept:  {totals["kept"]:,} ({100 * totals["kept"] / max(totals["read"], 1):.1f}%)',
        '',
        'Removed:',
        *[f'  {reason:24} {count:>14,}' for reason, count in rejected.most_common()],
        '',
        'Kept, by game build:',
        *[f'  {build:24} {count:>14,}' for build, count in sorted(builds.items())],
    ]
    return '\n'.join(lines) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', help='folder containing the raw .json or .json.gz files')
    parser.add_argument('output', help='new folder for the cleaned .json.gz files')
    parser.add_argument('--min-floor', type=int, default=4)
    parser.add_argument('--min-build', help='also drop builds older than this, e.g. 2020-01-27')
    parser.add_argument('--workers', type=int, default=max(1, (os.cpu_count() or 2) - 1))
    parser.add_argument('--limit-files', type=int)
    args = parser.parse_args(argv)

    source_root, target_root = Path(args.input).resolve(), Path(args.output).resolve()
    if target_root == source_root or source_root in target_root.parents or target_root in source_root.parents:
        sys.exit('The output folder must be separate from the input folder.')

    files = find_files(source_root)[:args.limit_files]
    if not files:
        sys.exit(f'No .json or .json.gz files under {source_root}')

    options = hashlib.sha1(f'{SCRIPT_HASH}|{args.min_floor}|{args.min_build}'.encode()).hexdigest()[:12]
    jobs = []
    for path in files:
        relative = path.relative_to(source_root)
        name = relative.name[:-3] if relative.name.endswith('.gz') else relative.name
        jobs.append((path, str(target_root / relative.parent / f'{name}.gz'), args.min_floor, args.min_build, options))

    totals = {'files': len(files), 'bad_files': 0, 'read': 0, 'kept': 0}
    rejected, builds = Counter(), Counter()
    with Pool(args.workers) as pool:
        for done, result in enumerate(pool.imap_unordered(cull_file, jobs), 1):
            totals['bad_files'] += result['bad_file']
            totals['read'] += result['read']
            totals['kept'] += result['kept']
            rejected.update(result['rejected'])
            builds.update(result['kept_builds'])
            if done % 10 == 0 or done == len(jobs):
                print(f'{done}/{len(jobs)} files, {totals["kept"]:,} runs kept of {totals["read"]:,}', flush=True)

    report = report_text(totals, rejected, builds)
    (target_root / REPORT_NAME).write_text(report, encoding='utf-8')
    print('\n' + report)
    return {'totals': totals, 'rejected': dict(rejected), 'builds': dict(builds)}


if __name__ == '__main__':
    main()
