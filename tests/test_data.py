import json
import unittest
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from sync_riksdagen import aggregate,csv_rows,source_url

class TestDataset(unittest.TestCase):
    def test_elections_are_complete(self):
        p=json.loads((ROOT/'data/parties.json').read_text())['parties']
        self.assertEqual(len(p),8)
        self.assertEqual(sum(q['elections']['2026']['seats'] for q in p),349)
        self.assertEqual(sum(q['elections']['2022']['seats'] for q in p),349)
        self.assertEqual(len({q['id'] for q in p}),8)
        for q in p:
            self.assertTrue(q['website'].startswith('https://'))
    def test_issue_sources(self):
        data=json.loads((ROOT/'data/issues.json').read_text())['issues']
        ids={p['id'] for p in json.loads((ROOT/'data/parties.json').read_text())['parties']}
        self.assertEqual(len(data),len({t['id'] for t in data}))
        for topic in data:
            self.assertTrue(set(topic['positions']).issubset(ids))
            for entry in topic['positions'].values():
                self.assertEqual(entry['status'],'sourced')
                self.assertTrue(entry['summary'])
                self.assertTrue(entry['sources'])
                self.assertTrue(all(s['url'].startswith('https://') for s in entry['sources']))
    def test_no_fake_voting_data(self):
        r=json.loads((ROOT/'data/riksdag.json').read_text())
        if r['status']=='not_synced':
            self.assertFalse(r['votes'])
    def test_parse_delimiter_and_aggregate(self):
        text='votering_id;parti;rost;datum;beteckning;punkt\nA;S;Ja;2026-11-18;FiU1;1\nA;S;Nej;2026-11-18;FiU1;1\nA;M;Ja;2026-11-18;FiU1;1\nB;C;Avstår;2026-11-19;AU2;4\n'
        rows=csv_rows(text.encode())
        votes=aggregate(rows,'2026/27')
        self.assertEqual(len(votes),2)
        a=next(v for v in votes if v['id']=='A')
        self.assertEqual(a['party_votes']['S']['Ja'],1)
        self.assertEqual(a['party_votes']['S']['Nej'],1)
        self.assertIn('FiU1',a['source_url'])
        self.assertEqual(votes[0]['date'],'2026-11-19')

if __name__=='__main__': unittest.main()
