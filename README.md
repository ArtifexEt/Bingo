# Muzyczne Bingo

Graj na cyfrowych planszach, prowadź rundy muzycznego Bingo i przygotuj plansze do druku. Samodzielna aplikacja webowa wydzielona z [Hiciarza](https://github.com/ArtifexEt/Hiciarz).

**[Otwórz Bingo](https://artifexet.github.io/Bingo/)** · **[Plansze do druku](https://artifexet.github.io/Bingo/?sheet=print&level=beginner&lang=pl)**

## Korzystanie

1. Każdy otwiera Bingo na własnym telefonie. Wybierz poziom: **Na dobry początek** lub **Dla znawców**. W **Nowej grze** wybierz rozmiar **3 × 3, 4 × 4 lub 5 × 5**. Każdy poziom zachowuje osobną planszę wraz z jej rozmiarem.
2. Dotknij pola, aby je **wyszarzyć i przekreślić dużym iksem**; ponowne dotknięcie usuwa zaznaczenie. **Cofnij** odwraca ostatni ruch. **Nowa gra** tworzy nowy układ po potwierdzeniu.
3. Przycisk **Twoja odpowiedź** otwiera modal na cały ekran. Wybierz typ odpowiedzi i wpisz lub wybierz wartość. Po zatwierdzeniu odpowiedź jest zakryta; dotknij osłony, aby ją odsłonić. Możesz ponownie ją ukryć albo przygotować nową odpowiedź.
4. Dolne zakładki **Graj** i **Prowadzenie rundy** przełączają między własną planszą a sterowaniem rundą. Prowadzący losuje kategorię, przez **Zmień czas** ustawia **Czas rundy (s)** od 1 do 300 sekund i uruchamia odliczanie, gdy zacznie grać muzyka. Wybrany czas obowiązuje także w kolejnych rundach i nowej grze. Otwarcie edycji czasu wstrzymuje timer; po jej zamknięciu uruchom odliczanie przyciskiem pod zegarem. Zapis czasu przed sprawdzeniem odpowiedzi ustawia czas bieżącej rundy, a podczas sprawdzania dotyczy następnej rundy. Powrót z aplikacji muzycznej lub odświeżenie strony nie dodaje czasu.
5. Po odsłonięciu karty sprawdźcie odpowiedzi. Poprawna odpowiedź pozwala zaznaczyć jedno wolne pole wylosowanej kategorii. Bonusy i dogrywki rozliczacie wspólnie, a każdy zmienia zaznaczenia na własnym telefonie.
6. Pełny rząd, kolumna lub przekątna daje **Bingo** i uruchamia konfetti oraz fajerwerki: potrzeba odpowiednio 3, 4 lub 5 zaznaczonych pól. Efekt trwa 7 sekund, nie blokuje planszy i respektuje systemową opcję ograniczenia ruchu.

Każde urządzenie ma jedną własną planszę, bez nazw i wyboru gracza. Postępy nie są synchronizowane między urządzeniami. Aktualizacja starej gry zachowuje aktywną planszę i jej zaznaczenia.

Układy, zaznaczenia, odpowiedzi i timer są zapisywane lokalnie w przeglądarce. Zmiana języka, obrót ekranu i odświeżenie zachowują planszę. Zapis nie jest kopią zapasową: wyczyszczenie danych witryny usuwa postępy. Po pierwszym załadowaniu aplikacja działa również offline; odtwarzanie muzyki pozostaje w osobnym skanerze.

**Drukuj plansze**: wybierz rozmiar **3 × 3, 4 × 4 lub 5 × 5**, od 1 do 24 plansz oraz 1, 2 lub 4 plansze na stronie A4. Pobierz PDF albo otwórz podgląd do drukowania. Drukuj jednostronnie w skali 100%; układy z kilkoma planszami zawierają linie cięcia. Cyfrowe i drukowane plansze nie mają darmowego środkowego pola. Mniejsze siatki zachowują równomierny podział pięciu kategorii; stare plansze 5 × 5 zachowują swój układ i zaznaczenia. Generator PDF przygotowuje nowe układy, a nie kopię aktualnej cyfrowej rozgrywki.

Aplikacja ma polską i angielską wersję interfejsu i wydruków. Losowanie jest niezależne w każdej turze. [Zasady Hitster Bingo u wydawcy](https://hitstergame.com/pl-pl/pages/zasady-gry-bingo) są punktem odniesienia; odpowiedzi oceniają gracze na podstawie karty, nie automatyczne porównywanie tekstu.

Talie muzyczne i karty QR przygotujesz w [kreatorze Hiciarza](https://artifexet.github.io/Hiciarz/?view=editor). Do uruchamiania muzyki z kart służy [skaner Hiciarza](https://artifexet.github.io/Hiciarz/?view=scanner) lub [aplikacja Android](https://github.com/ArtifexEt/Hiciarz/releases).

## Instalacja i aktualizacje PWA

Bingo można dodać do ekranu początkowego i otwierać jako osobną aplikację. W obsługiwanej przeglądarce użyj przycisku **Zainstaluj Bingo** w stopce. Na iPhonie lub iPadzie otwórz stronę w Safari; przycisk pokaże instrukcję **Udostępnij → Do ekranu początkowego → Dodaj**. Po instalacji przycisk znika.

Po pierwszym pełnym załadowaniu interfejs, plansza i zapisane odpowiedzi działają offline. Ikony mają osobne wersje dla Androida, iOS i przeglądarki, w tym bezpieczny wariant maskable. Zainstalowana aplikacja oferuje skróty do obu poziomów, jeśli system je obsługuje.

Aplikacja sprawdza nowe wersje po uruchomieniu, po powrocie na ekran i po odzyskaniu połączenia, a także co 10 minut. Możesz też wybrać **Sprawdź aktualizacje** w stopce. Gdy nowa wersja jest gotowa, **Aktualizuj** stosuje ją i odświeża stronę; **Później** pozwala dokończyć rundę. Samo wykrycie aktualizacji nie przeładowuje gry. Plansza i zatwierdzone odpowiedzi zostają na urządzeniu. Wersja widoczna w stopce aplikacji odpowiada opublikowanemu commitowi. W tym samym miejscu znajdziesz zmianę języka i link do kreatora kart Hiciarza.

Źródłem ikon jest `public/icon.svg`. PNG można odtworzyć poleceniem `node scripts/generate-icons.mjs`; generator korzysta z biblioteki `sharp` dostępnej jako narzędzie robocze. Dla zewnętrznej instalacji biblioteki podaj `--modules "ścieżka/do/node_modules"`. Zwykły build aplikacji korzysta z gotowych PNG i nie wymaga tej biblioteki.

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
