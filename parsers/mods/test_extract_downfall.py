import unittest
from pathlib import Path

from extract_downfall import _card_is_in_scope, clean_text, parse_card_source, site_id



class SourceParsingTests(unittest.TestCase):
    def test_extracts_card_constructor_stats_and_upgrade_deltas(self):
        source = '''
        public class Example extends AbstractCard {
          public static final String ID = makeID("Example");
          private static final int COST = 2;
          private static final int BASE = 7;
          private static final int BONUS = 3;
          public Example() {
            super(ID, COST, CardType.ATTACK, CardRarity.UNCOMMON, CardTarget.ENEMY);
            baseDamage = BASE;
            baseBlock = 4;
            baseMagicNumber = magicNumber = 2;
            this.exhaust = true;
            this.isEthereal = true;
            this.isInnate = true;
            this.selfRetain = true;
          }
          public void upgrade() {
            upgradeDamage(BONUS);
            upgradeBlock(2);
            upgradeMagicNumber(1);
            upgradeBaseCost(1);
          }
        }
        '''
        card = parse_card_source(source)
        self.assertEqual((card['cost'], card['type'], card['rarity'], card['target']), (2, 'ATTACK', 'UNCOMMON', 'ENEMY'))
        self.assertEqual((card['damage'], card['block'], card['magic']), (7, 4, 2))
        self.assertEqual(card['upgrade'], {'cost': 1, 'damage': 3, 'block': 2, 'magic_number': 1})
        self.assertTrue(all(card['booleans'][name] for name in ('exhaust', 'ethereal', 'innate', 'self_retain')))

    def test_parses_custom_card_fields_and_upgraded_description_change(self):
        source = '''
        public class Special extends AbstractCard {
          static final int MAGIC = 3;
          Special() {
            super(ID, 1, CardType.SKILL, CardRarity.SPECIAL, CardTarget.SELF);
            baseBurn = burn = MAGIC;
            baseSecondMagic = secondMagic = 4;
            this.retain = true;
          }
          public void upp() { upgradeBurn(2); upgradeSecondMagic(1); }
        }
        '''
        card = parse_card_source(source)
        self.assertEqual(card['custom'], {'burn': 3, 'secondMagic': 4})
        self.assertEqual(card['custom_upgrade'], {'burn': 2, 'secondMagic': 1})
        self.assertTrue(card['booleans']['retain'])

    def test_reads_mutable_upgrade_constants_from_constructor(self):
        source = '''
        public class VariableUpgrade extends AbstractCard {
          private static int upgradeDamage;
          VariableUpgrade() {
            super(ID, 1, CardType.ATTACK, CardRarity.UNCOMMON, CardTarget.ENEMY);
            baseDamage = 8;
            upgradeDamage = 2;
            baseDownfallMagic = downfallMagic = 1;
          }
          void upgrade() { upgradeDamage(upgradeDamage); upgradeDownfall(1); }
        }
        '''
        card = parse_card_source(source)
        self.assertEqual(card['upgrade']['damage'], 2)
        self.assertEqual(card['custom_upgrade']['downfallMagic'], 1)

    def test_excludes_card_ignore_classes(self):
        allowed, reason = _card_is_in_scope('@CardIgnore public class FunctionCard {}', {
            'rarity': 'SPECIAL', 'type': 'SKILL', 'cost': 1
        }, Path('FunctionCard.java'))
        self.assertFalse(allowed)
        self.assertIn('ignored', reason)
        status_allowed, _ = _card_is_in_scope('@CardIgnore public class Daze { CardType.STATUS; }', {
            'rarity': 'SPECIAL', 'type': 'STATUS', 'cost': -2
        }, Path('goodstatus/Daze.java'))
        self.assertTrue(status_allowed)

    def test_excludes_snecko_unknown_templates_with_explicit_reason(self):
        allowed, reason = _card_is_in_scope('class Unknown {}', {
            'rarity': 'SPECIAL', 'type': 'SKILL', 'cost': -2
        }, Path('sneckomod/cards/unknowns/Unknown.java'))
        self.assertFalse(allowed)
        self.assertEqual(reason, 'snecko unknown template')

    def test_clean_text_removes_markup_and_preserves_energy_marker(self):
        self.assertEqual(clean_text('#yDeal !D! damage NL Gain [R] [REMOVE_SPACE]Block'), 'Deal !D! damage\nGain [E]Block')
        self.assertEqual(clean_text('collector:geplagt. [#ffaa00]Text[/]'), 'geplagt. Text')
        self.assertEqual(site_id('hermit:Black_Wind'), 'DOWNFALL_HERMIT_BLACK_WIND')

    def test_auto_and_cool_values_are_not_guessed_as_hit_counts(self):
        source = '''class Example extends AbstractCard {
          Example() { super(ID, 1, CardType.ATTACK, CardRarity.COMMON, CardTarget.ENEMY);
            baseCool = cool = 2; baseAuto = auto = 7; }
        }'''
        self.assertIsNone(parse_card_source(source)['hit_count'])

    def test_resolves_inherited_rarity_cost_and_flags(self):
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'AbstractSpellCard.java').write_text('''
              abstract class AbstractSpellCard extends AbstractAwakenedCard {
                AbstractSpellCard(String id, int cost, CardType type, CardTarget target) {
                  super(id, cost, type, CardRarity.SPECIAL, target, CardColor.COLORLESS);
                  this.selfRetain = true; exhaust = true;
                }
              }''')
            child = '''class Thunderbolt extends AbstractSpellCard {
              Thunderbolt() { super(ID, 1, CardType.ATTACK, CardTarget.ENEMY); baseDamage = 12; }
            }'''
            stats = parse_card_source(child, source_root=root)
            self.assertEqual((stats['cost'], stats['type'], stats['rarity'], stats['target']), (1, 'ATTACK', 'SPECIAL', 'ENEMY'))
            self.assertEqual(stats['booleans']['self_retain'], True)
            self.assertEqual(stats['booleans']['exhaust'], True)

    def test_japanese_thunderbolt_text_cleans_tags_and_substitutes_damage(self):
        from extract_downfall import _localized_card_text
        stats = {'damage': 12, 'block': None, 'magic': None, 'custom': {}, 'upgrade': {'damage': 6, 'block': None, 'magic_number': None},
                 'custom_upgrade': {}, 'booleans': {}, 'upgrade_booleans': {}}
        result = _localized_card_text({'NAME': '雷撃', 'DESCRIPTION': '#y!D! ダメージを与える。 NL [#ffaa00]効果[/]',
                                       'UPGRADE_DESCRIPTION': '!D! ダメージを与える。'}, stats, 'awakened', 'Thunderbolt')
        self.assertEqual(result['name'], '雷撃')
        self.assertEqual(result['description'], '12 ダメージを与える。\n効果')
        self.assertEqual(result['upgrade_description'], '18 ダメージを与える。')

    def test_german_karma_text_keeps_only_substituted_translation(self):
        from extract_downfall import _localized_card_text
        stats = {'damage': None, 'block': None, 'magic': 2, 'custom': {'secondMagic': 2}, 'upgrade': {'damage': None, 'block': None, 'magic_number': 1},
                 'custom_upgrade': {'secondMagic': 1}, 'booleans': {}, 'upgrade_booleans': {}}
        result = _localized_card_text({'NAME': 'Karma', 'DESCRIPTION': 'Am Zugende !M! Block erhalten. NL Wenn ein Gegner betroffen ist, !clm2! mehr.',
                                       'UPGRADE_DESCRIPTION': 'Angeboren. NL Am Zugende !M! Block erhalten. NL Wenn ein Gegner betroffen ist, !clm2! mehr.'},
                                      stats, 'collector', 'Karma')
        self.assertEqual(result['description'], 'Am Zugende 2 Block erhalten.\nWenn ein Gegner betroffen ist, 2 mehr.')
        self.assertEqual(result['upgrade_description'], 'Angeboren.\nAm Zugende 3 Block erhalten.\nWenn ein Gegner betroffen ist, 3 mehr.')

        from extract_downfall import _upgrade_keyword_changes
        self.assertEqual(_upgrade_keyword_changes('At end of turn, gain Block.', 'Innate. NL At end of turn, gain Block.', {}, {}),
                         {'add_keywords': ['Innate'], 'remove_keywords': []})
        self.assertEqual(_upgrade_keyword_changes('Gain Block. Exhaust.', 'Gain Block.', {'exhaust': True}, {'exhaust': False}),
                         {'add_keywords': [], 'remove_keywords': ['Exhaust']})


if __name__ == '__main__':
    unittest.main()
