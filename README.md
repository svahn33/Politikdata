# Politikdata – första publicerbara versionen

**En statisk, mobilanpassad och källbelagd grund till en svensk politisk faktaplattform.** Projektet innehåller ingen partipoängsättning, inga partiråd, inga spårningsskript och inga simulerade voteringsresultat.

## Vad som fungerar nu

- **Översikt:** valresultat 2026 och ingångar till alla sektioner.
- **Jämför:** välj 2–4 partier; jämför dokumenterade ståndpunkter **eller** slutliga valresultat.
- **Sakfrågor:** sök/filter för 12 ämnen och källspårade politiksammanfattningar. **Ny kärnkraft** har underlag för alla åtta partier; **statligt stöd till ny kärnkraft** är delvis kartlagt. Övriga frågor är ärligt markerade som ännu inte kartlagda.
- **Riksdagen:** sök- och filtreringsgränssnitt för riktiga, importerade riksdagsvoteringar. Ingen voteringsdata medföljer initialt. Det finns ett körbart importskript och ett GitHub Actions-flöde för att hämta officiella CSV-filer.
- **Historik:** interaktiva diagram och jämförelser mellan 2022 och 2026 års slutliga riksdagsval. Länk till arkiv för historiska partiprogram.
- **Partier:** individuella partiprofiler med valdata och källor.
- **Källor och metodik:** transparens om källor, redaktionell kontroll och gränserna för tolkningen.

## Publicera utan programmering via GitHub

1. Packa upp ZIP-filen **så att `index.html` ligger direkt i projektets rot** (inte i en undermapp).
2. Skapa ett nytt **publikt** GitHub-repository, exempelvis `politikdata`.
3. På repositorysidan välj **Add file → Upload files**. Ladda upp **alla** filer och mappar (inklusive `data`, `assets`, `scripts`, `.github` och `tests`). GitHubs webbgränssnitt kan dölja punktmappar; kontrollera att `.github/workflows/synka-riksdagsdata.yml` verkligen finns efter uppladdning.
4. Klicka **Commit changes**.
5. Öppna **Settings → Pages** och välj **Deploy from a branch → main → / (root)**. Spara.
6. Webbplatsen blir normalt tillgänglig via `https://DITT-KONTO.github.io/politikdata/`. Kontrollera det exakta URL:et på fliken Pages.
7. Öppna **Actions → Synka riksdagsdata → Run workflow** för att försöka hämta officiella voteringsresultat. Detta arbetsflöde körs sedan dagligen. För att det ska kunna spara data behöver Actions ha behörighet att skriva till repot: **Settings → Actions → General → Workflow permissions → Read and write permissions**.

> **Viktigt:** Den schemalagda importen har **inte provkörts mot Riksdagens server här** (arbetsmiljön saknar extern internetåtkomst). Importskriptet har lokala tester, validerar kolumner och bevarar befintlig data vid fel. Kontrollera första körningen på GitHub. Om Riksdagen ändrar format på sina CSV-filer behöver importkoden anpassas. Tjänsten visar då ingen påhittad data.

## Köra lokalt på Mac

Öppna mappen i VS Code eller Terminal. Kör:

```bash
cd politikdata-webbplats
python3 -m http.server 8000
```

Öppna `http://localhost:8000` i webbläsaren. **Dubbelklicka inte** på `index.html` direkt, eftersom webbläsare normalt blockerar läsning av JSON-filer med `file://`.

Stoppa servern med `Control + C`.

## Källor

- Valmyndigheten, [slutligt riksdagsval 2026](https://www.val.se/valresultat-och-statistik/riksdags--region--och-kommunval/valresultat-2026?view=final)
- Valmyndigheten, [slutligt riksdagsval 2022](https://www.val.se/valresultat-och-statistik/riksdags--region--och-kommunval/valresultat-2022)
- Sveriges riksdag, [öppna data](https://www.riksdagen.se/sv/dokument-och-lagar/riksdagens-oppna-data/)
- SND, [Svenska partiprogram och valmanifest](https://snd.se/sv/vivill)
- Partiernas egna rikstäckande sidor: varje redaktionellt inlagd ståndpunkt har sin **egen direkta käll-URL** i `data/issues.json`.

## Datamodell

`data/parties.json`: parti-ID, visningsnamn, färg, officiell webbplats och valdata. Partiernas namn/ID står i bokstavsordning och rangordnas inte.

`data/elections.json`: officiella källor, valår, valdeltagande och mandatantal.

`data/issues.json`: en lista av konkret avgränsade sakfrågor. Varje `positions`-objekt kan innehålla en verifierad sammanfattning per parti, en eller flera primärkällor, källkontrolldatum och status `sourced`. Ett parti som saknar post är **ännu inte kartlagt**, inte ett nej.

`data/riksdag.json`: importerade **faktiska individuella röster aggregerade per parti och votering**. Innehåller `Ja`, `Nej`, `Avstår`, `Frånvarande`, datum, riksmöte, betänkande, förslagspunkt och länk till Riksdagens sökbara originalunderlag. Voteringsresultat får inte automatiskt användas som redaktionell ståndpunkt.

## Mer sakfrågeinnehåll

För en ny ståndpunkt i `data/issues.json`:

1. Sök en **aktuell primärkälla** för exakt den fråga som ska jämföras.
2. Skriv en **kort, neutral sammanfattning** av vad partiet uttryckligen säger. Tillskriv inte politiska effekter utan separat grund.
3. Lägg till käll-URL, källtyp och datum för kontroll.
4. Lägg till under det partiets ID i den valda frågans `positions`.
5. Testa: `python3 -m unittest discover -s tests -v`.

Publicera inte en automatiskt AI-genererad politiksammanfattning utan att kontrollera originaldokumentet. Förvara gärna ändringsförslag i ett separat granskningsflöde.

## Integritet och drift

Projektet saknar annonser, användarkonton, statistikcookies och spårningsskript. Inget formulär sparar användarens jämförelseval. Alla data i grundversionen är statiska JSON-filer. Källor öppnas på sina ursprungliga webbplatser.

## Begränsningar

Det här är en **första fungerande version, inte en fullständig politisk databas**. Särskilt sakfrågebiblioteket är i uppbyggnadsfas. Statligt verifierade valresultat är kompletta för de åtta riksdagspartierna 2022 och 2026. Det externa CSV-importflödet är förberett och lokalt testat men måste först köras från GitHub för att visa riksdagsvoteringar.
