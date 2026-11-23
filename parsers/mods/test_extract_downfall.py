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

    def test_clean_text_removes_markup_and_preserves_energy_marker(self):
        self.assertEqual(clean_text('#yDeal !D! damage NL Gain [R] [REMOVE_SPACE]Block'), 'Deal !D! damage\nGain [E]Block')
        self.assertEqual(site_id('hermit:Black_Wind'), 'DOWNFALL_HERMIT_BLACK_WIND')


if __name__ == '__main__':
    unittest.main()
