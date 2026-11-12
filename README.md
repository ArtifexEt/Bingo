# Muzyczne Bingo

Graj na cyfrowych planszach, prowadź rundy muzycznego Bingo i przygotuj plansze do druku. Samodzielna aplikacja webowa wydzielona z [Hiciarza](https://github.com/ArtifexEt/Hiciarz).

**[Otwórz Bingo](https://artifexet.github.io/Bingo/)** · **[Plansze do druku](https://artifexet.github.io/Bingo/?sheet=print&level=beginner&lang=pl)**

## Korzystanie

1. Wybierz poziom: **Na dobry początek** lub **Dla znawców**. Każdy poziom zachowuje osobny stan gry.
2. W **Nowej grze** ustaw od 1 do 12 graczy lub drużyn oraz ich nazwy.
3. **Wspólna gra**: wylosuj kategorię, uruchom muzykę skanerem i dopiero wtedy naciśnij **Start 25 s**. Każdy może zapisać odpowiedź na swojej planszy. Timer można wstrzymać; powrót z aplikacji muzycznej lub odświeżenie strony nie dodaje czasu.
4. Po odsłonięciu karty sprawdźcie odpowiedzi. Każda poprawna odpowiedź pozwala wybrać jedno wolne pole wylosowanej kategorii. **Cofnij** i **Korekta** służą do naprawienia pomyłek. Dokładny rok w początkujących kategoriach ±2 i ±4 odblokowuje ręczny bonus usunięcia krzyżyka przeciwnika, również gdy wszystkie własne pola kategorii są już zajęte.
5. Pięć pól w rzędzie, kolumnie lub na przekątnej daje Bingo. Najpierw rozliczcie wszystkie odpowiedzi i bonusy rundy, potem potwierdźcie zwycięzcę. Przy remisie aplikacja prowadzi dogrywkę tylko między remisującymi.

**Moja plansza** to widok gracza na własnym telefonie lub tablecie: dotknięcie pola stawia lub usuwa krzyżyk, a kategorię i czas podaje prowadzący. Plansze na różnych urządzeniach nie są synchronizowane. Wspólna gra zarządza wieloma planszami na jednym urządzeniu. Układ tabletu pokazuje sterowanie rundą i planszę obok siebie; telefon oferuje widok samej planszy.

Układy, zaznaczenia, odpowiedzi i rozgrywka są zapisywane lokalnie w przeglądarce. Zmiana języka, obrót ekranu i odświeżenie zachowują plansze. Zapis nie jest kopią zapasową: wyczyszczenie danych witryny usuwa postępy. Po pierwszym załadowaniu aplikacja działa również offline; odtwarzanie muzyki pozostaje w osobnym skanerze.

**Drukuj plansze**: wybierz od 1 do 24 plansz oraz 1, 2 lub 4 plansze na stronie A4. Pobierz PDF albo otwórz podgląd do drukowania. Drukuj jednostronnie w skali 100%; układy z kilkoma planszami zawierają linie cięcia. Cyfrowe i drukowane plansze mają siatkę 5 × 5, bez darmowego środkowego pola. Generator PDF przygotowuje nowe układy, a nie kopię aktualnej cyfrowej rozgrywki.

Aplikacja ma polską i angielską wersję interfejsu i wydruków. Losowanie jest niezależne w każdej turze. [Zasady Hitster Bingo u wydawcy](https://hitstergame.com/pl-pl/pages/zasady-gry-bingo) są punktem odniesienia; odpowiedzi oceniają gracze na podstawie karty, nie automatyczne porównywanie tekstu.

Talie muzyczne i karty QR przygotujesz w [kreatorze Hiciarza](https://artifexet.github.io/Hiciarz/?view=editor). Do uruchamiania muzyki z kart służy [skaner Hiciarza](https://artifexet.github.io/Hiciarz/?view=scanner) lub [aplikacja Android](https://github.com/ArtifexEt/Hiciarz/releases).

## Linki do plansz

| Parametr | Wartości |
| --- | --- |
| `sheet` | `print` otwiera generator PDF, `help` otwiera zasady. |
| `level` | `beginner` lub `expert`. |
| `lang` | `pl` lub `en`. |

Przykłady: [podstawowy PL](https://artifexet.github.io/Bingo/?sheet=print&level=beginner&lang=pl), [zaawansowany PL](https://artifexet.github.io/Bingo/?sheet=print&level=expert&lang=pl), [beginner EN](https://artifexet.github.io/Bingo/?sheet=print&level=beginner&lang=en).

Dotychczasowe adresy Hiciarza z `?view=bingo` przekierowują do nowej aplikacji z zachowaniem prawidłowego poziomu, języka i okna druku lub pomocy.

## Uruchomienie lokalne

Wymagane: Node.js 22+ i pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Otwórz adres wypisany przez Vite z końcówką `/Bingo/`.

```sh
pnpm test
pnpm build
pnpm preview
```

Domyślny katalog publikacji to `/Bingo/`. Dla innej lokalizacji ustaw `BASE_PATH` podczas budowania. Czcionki są serwowane z tej samej aplikacji; Noto Sans używany w PDF oraz Barlow Condensed mają licencje w `public/fonts/`.

## Publikacja na GitHub Pages

Workflow [Test and publish Bingo](.github/workflows/pages.yml) uruchamia testy i build dla pull requestów oraz zmian na `main`. Po poprawnym buildzie `main` publikuje `dist/` na GitHub Pages. Można też uruchomić workflow ręcznie.

Źródło publikacji w **Settings → Pages → Build and deployment** to **GitHub Actions**. Strona jest dostępna pod [artifexet.github.io/Bingo](https://artifexet.github.io/Bingo/).
