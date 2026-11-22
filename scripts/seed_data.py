#!/usr/bin/env python3
"""Create carefully sourced, manually curated initial content. Run only intentionally."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data'
STAMP='2026-11-22'
VAL2026='https://www.val.se/valresultat-och-statistik/riksdags--region--och-kommunval/valresultat-2026?view=final'
VAL2022='https://www.val.se/valresultat-och-statistik/riksdags--region--och-kommunval/valresultat-2022'
party_rows=[
('C','Centerpartiet','#148b50','https://www.centerpartiet.se',6.71,24,7.03,25),
('KD','Kristdemokraterna','#174783','https://kristdemokraterna.se',5.34,19,6.17,22),
('L','Liberalerna','#247db3','https://www.liberalerna.se',4.61,16,5.34,19),
('MP','Miljöpartiet','#61a44a','https://www.mp.se',5.08,18,6.12,22),
('M','Moderaterna','#46a7d9','https://moderaterna.se',19.10,68,19.85,70),
('S','Socialdemokraterna','#df3945','https://www.socialdemokraterna.se',30.33,107,28.02,99),
('SD','Sverigedemokraterna','#caa52a','https://www.sd.se',20.54,73,17.48,62),
('V','Vänsterpartiet','#b72d37','https://www.vansterpartiet.se',6.75,24,8.40,30),
]
parties=[]
for id,name,color,url,p22,m22,p26,m26 in party_rows:
    parties.append({'id':id,'name':name,'color':color,'website':url,
                    'elections':{'2022':{'share':p22,'seats':m22},'2026':{'share':p26,'seats':m26}}})
positions={
'new-nuclear':{
'S': ('Vill tillåta ny kärnkraft på de platser där det redan finns kärnkraftsproduktion och samtidigt förlänga driften av befintliga reaktorer.', 'https://www.socialdemokraterna.se/varpolitik/atillo/karnkraft.4.6231cb3619d9a495beb7a11.html'),
'M': ('Vill bygga ut kärnkraften, även med små modulära reaktorer, och utveckla förutsättningarna för nya investeringar.', 'https://moderaterna.se/var-politik/karnkraft-2/'),
'SD': ('Vill möjliggöra utbyggnad av ny kärnkraft, bland annat genom statlig riskdelning för investeringar.', 'https://www.sd.se/a-till-o/karnkraft/'),
'V': ('Avvisar en utbyggnad av kärnkraften och förespråkar i stället en utbyggnad av förnybar elproduktion.', 'https://www.vansterpartiet.se/var-politik/politik-a-o/karnkraft/'),
'C': ('Accepterar utveckling av nya reaktortyper på marknadsmässiga villkor, utan särskilda statliga stöd till kärnkraft.', 'https://www.centerpartiet.se/centerpartiets-politik/centerpartiets-politik-a-o/energi/karnkraft'),
'KD': ('Vill bygga ny kärnkraft som en del av sin politik för energi och samhällsbyggande.', 'https://kristdemokraterna.se/var-politik/val-2026/varfor-rosta-kd'),
'MP': ('Motsätter sig ny kärnkraft men vill inte genomföra en politiskt beslutad snabbavveckling av befintliga reaktorer.', 'https://www.mp.se/politik/karnkraft/'),
'L': ('Vill att kärnkraften ska ha en central roll i framtidens elsystem och stödjer möjligheten att bygga nya reaktorer.', 'https://www.liberalerna.se/politik/karnkraft'),
},
'nuclear-subsidy':{
'M': ('Stödjer en finansieringsmodell med statliga lån, riskdelning och långsiktiga elprisavtal för ny kärnkraft.', 'https://moderaterna.se/var-politik/karnkraft-2/'),
'SD': ('Stödjer statlig riskdelning för investeringar i ny kärnkraft.', 'https://www.sd.se/a-till-o/karnkraft/'),
'C': ('Vill att kärnkraftsinvesteringar ska ske på marknadsmässiga villkor, utan särskilda statliga subventioner.', 'https://www.centerpartiet.se/centerpartiets-politik/centerpartiets-politik-a-o/energi/karnkraft'),
'MP': ('Motsätter sig statliga subventioner till ny kärnkraft och vill prioritera förnybara alternativ.', 'https://www.mp.se/politik/karnkraft/'),
}}
def source(entry):
    return {'summary':entry[0], 'sources':[{'url':entry[1], 'label':'Officiell partisida', 'publisher':'Partiets riksorganisation', 'type':'party_policy', 'checked':STAMP}], 'status':'sourced', 'reviewed_on':STAMP}

topics=[
{'id':'new-nuclear','category':'Energi','title':'Ny kärnkraft i Sverige','question':'Vilken hållning redovisar partiet till att bygga nya kärnkraftsreaktorer i Sverige?', 'scope':'Partiets officiella rikspolitik om utbyggnad, inte en specifik votering.'},
{'id':'nuclear-subsidy','category':'Energi','title':'Statligt stöd till ny kärnkraft','question':'Vilken hållning har partiet till statliga lån, stöd eller riskdelning för ny kärnkraft?', 'scope':'Skilj stöd till nybyggnation från inställning till befintliga reaktorer.'},
{'id':'offshore-wind','category':'Energi','title':'Havsbaserad vindkraft','question':'Vilka politiska förslag har partiet om utbyggnad av havsbaserad vindkraft?', 'scope':'Ekonomiska stöd och tillstånd ska redovisas var för sig.'},
{'id':'income-tax','category':'Ekonomi','title':'Statlig inkomstskatt','question':'Hur vill partiet förändra den statliga inkomstskatten?', 'scope':'Redovisa nivåer, brytpunkter och eventuella tidsvillkor.'},
{'id':'school-profits','category':'Skola','title':'Vinstuttag i fristående skolor','question':'Vilka begränsningar eller regler för vinstuttag föreslår partiet?', 'scope':'Blanda inte samman ägarformer, kvalitetskrav och vinstuttag.'},
{'id':'grades','category':'Skola','title':'Betyg och bedömning','question':'Vilka förändringar av betygssystemet vill partiet genomföra?', 'scope':'Ange vilket skolstadium respektive förslag gäller.'},
{'id':'asylum','category':'Migration','title':'Asylregler','question':'Vilken förändring av asylreglerna föreslår partiet?', 'scope':'Skilj EU-regler, svensk lagstiftning och partimål.'},
{'id':'defence-budget','category':'Försvar','title':'Försvarsutgifter','question':'Vilka mål och förslag har partiet om försvarsanslag?', 'scope':'Ange vilket år och vilka mått som används.'},
{'id':'healthcare','category':'Vård','title':'Ansvar för sjukvården','question':'Hur vill partiet fördela ansvaret för sjukvården?', 'scope':'Skilj ansvarsfördelning från finansiering.'},
{'id':'climate','category':'Klimat','title':'Klimatmål','question':'Vilka klimatmål och styrmedel föreslår partiet?', 'scope':'Ange målår och jämför samma utsläppsdefinition.'},
{'id':'justice','category':'Rättspolitik','title':'Straffrättsliga förslag','question':'Vilka dokumenterade lagändringar på straffrättens område föreslår partiet?', 'scope':'Jämför specifika lagförslag i stället för breda värdeord.'},
{'id':'eu','category':'EU','title':'Sveriges roll i EU','question':'Vilka dokumenterade förändringar av EU-samarbetet vill partiet se?', 'scope':'Ange om källan avser nationell politik eller Europaparlamentet.'},
]
for t in topics:
    t['positions']={p:source(entry) for p,entry in positions.get(t['id'],{}).items()}

def dump(name,data):
    (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

dump('parties.json', {'updated':STAMP,'source':VAL2026,'parties':parties})
dump('issues.json', {'updated':STAMP, 'editorial_rule':'Avsaknad av granskad uppgift betyder inte att ett parti saknar ståndpunkt.','issues':topics})
dump('elections.json', {'updated':STAMP, 'source':{'2022':VAL2022,'2026':VAL2026}, 'scope':'Slutliga riksdagsval. Andel giltiga röster i procent. Mandat enligt valmyndighetens slutresultat.', 'years':[2022,2026], 'turnout':{'2022':84.21,'2026':84.9}, 'electorate':{'2022':7775390,'2026':8051355}, 'seats_total':349})
dump('riksdag.json', {'updated':None,'status':'not_synced','session':None,'votes':[],'note':'Ingen lokal voteringsdata har hämtats. Kör GitHub Actions-flödet Synka riksdagsdata.'})
print('Created',len(parties),'parties,',len(topics),'issues and',sum(map(lambda t: len(t['positions']),topics)),'sourced stances')
