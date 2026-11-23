#!/usr/bin/env python3
"""Self-check for aggregate_runs.py against tests/stats-fixtures/runs."""
import gzip
import shutil
import tempfile
from pathlib import Path

import aggregate_runs as ar
import cull_runs

FIXTURES = Path(__file__).resolve().parents[2] / 'tests' / 'stats-fixtures' / 'runs'


def run_pipeline(input_dir, tmp):
    return ar.main([str(input_dir), '--out', str(tmp / 'stats.json'), '--min-sample', '1', '--workers', '1', '--cache-dir', str(tmp / 'cache')])


def row(rows, name):
    return next(r for r in rows if r['name'] == name)


def main():
    assert ar.norm('Bash+1') == 'BASH'
    assert ar.norm('Searing Blow+12') == 'SEARING_BLOW'
    assert ar.norm('J.A.X.') == 'J_A_X'

    with tempfile.TemporaryDirectory() as name:
        tmp = Path(name)
        out = run_pipeline(FIXTURES, tmp)
        meta = out['meta']
        assert meta['runs_read'] == 14, meta
        assert meta['runs_used'] == 3, meta
        assert meta['rejected'] == {'is_daily': 1, 'is_endless': 1, 'chose_seed': 1, 'other_character': 1, 'abandoned_early': 1, 'impossible_victory': 1, 'is_beta': 1, 'quit_run': 1, 'path_mismatch': 1, 'damage_sentinel': 1, 'modded_content': 1}, meta
        assert 'MYSTERY_CARD' in meta['unmatched']['cards'], meta

        everyone = out['segments']['all|all']
        assert (everyone['runs'], everyone['wins']) == (3, 1)
        assert everyone['metrics']['deck_size']['win']['median'] == 6

        ironclad = out['segments']['ironclad|all']
        assert (ironclad['runs'], ironclad['wins'], ironclad['win_rate']) == (2, 1, 0.5)
        assert 'silent|a20' not in out['segments']
        assert out['segments']['ironclad|a20']['runs'] == 1

        worm = row(ironclad['encounters'], 'Jaw Worm')
        assert (worm['fights'], worm['avg_turns'], worm['damage_per_turn']) == (2, 3.0, 3.0), worm
        assert worm['est_damage_needed_per_turn'] == round(worm['est_enemy_hp'] / 3, 2), worm
        assert row(ironclad['encounters'], 'Lagavulin')['fights'] == 1
        guardian = row(ironclad['encounters'], 'The Guardian')
        assert guardian['est_enemy_hp'] is not None, guardian

        boss = next(a for a in ironclad['acts'] if a['type'] == 'boss')
        assert (boss['act'], boss['fights'], boss['avg_damage']) == (1, 1, 30.0), boss
        assert next(a for a in ironclad['acts'] if a['type'] == 'elite')['fights'] == 1

        inflame = row(ironclad['cards'], 'Inflame')
        assert (inflame['offered'], inflame['pick_rate'], inflame['decks'], inflame['win_rate']) == (1, 1.0, 1, 1.0), inflame
        assert inflame['win_delta'] == 0.5, inflame
        bash = row(ironclad['cards'], 'Bash')
        assert bash['upgrade_rate'] == 0.5, bash

        assert row(ironclad['relics'], 'Anchor')['win_rate'] == 1.0
        assert row(ironclad['killed_by'], 'Lagavulin')['death_rate'] == 1.0
        assert ironclad['survival'][0] == [1, 1.0]
        assert ironclad['survival'][-1] == [51, 0.5]

        assert [p['id'] for p in meta['periods']] == ['all', '2020', '2020-Q3', '2020-Q1', '2019', '2019-Q1'], meta['periods']
        assert out['periods']['2019']['all|all']['runs'] == 1
        assert out['periods']['2020']['all|all']['runs'] == 2
        assert out['periods']['2020-Q3']['ironclad|a20']['wins'] == 1
        assert (tmp / 'stats-periods' / '2020-Q1.json').exists()
        assert ar.build_period({'build_version': '2019-01-03v3'}) == '2019-Q1'
        assert ar.build_period({'build_version': 'nope'}) == 'unknown'

        # Culling removes exactly what aggregation rejects, and the clean copy gives the same stats.
        culled = tmp / 'culled'
        result = cull_runs.main([str(FIXTURES), str(culled), '--workers', '1'])
        assert result['totals'] == {'files': 1, 'bad_files': 0, 'read': 14, 'kept': 3}, result
        assert result['rejected'] == meta['rejected'], result
        assert (culled / 'cull_report.txt').exists()
        assert cull_runs.main([str(FIXTURES), str(culled), '--workers', '1'])['totals'] == result['totals']
        from_culled = run_pipeline(culled, tmp / 'second')
        assert from_culled['segments'] == out['segments'] and from_culled['periods'] == out['periods']
        assert from_culled['meta']['rejected'] == {}

        try:
            cull_runs.main([str(FIXTURES), str(FIXTURES / 'inside'), '--workers', '1'])
            raise AssertionError('output inside input should be refused')
        except SystemExit:
            pass

        # Gzipped input and a re-run served from cache give the same answer.
        gz_dir = tmp / 'gz'
        gz_dir.mkdir()
        for source in FIXTURES.glob('*.json'):
            with source.open('rb') as plain, gzip.open(gz_dir / f'{source.name}.gz', 'wb') as packed:
                shutil.copyfileobj(plain, packed)
        for _ in range(2):
            again = run_pipeline(gz_dir, tmp)
            assert again['segments'] == out['segments']

    print('aggregate_runs self-check passed')


if __name__ == '__main__':
    main()
