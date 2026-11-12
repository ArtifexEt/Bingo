# Muzyczne Bingo

Losuj kategorie muzycznych zagadek i przygotuj plansze dla graczy. Samodzielna aplikacja webowa wydzielona z [Hiciarza](https://github.com/ArtifexEt/Hiciarz).

**[Otwórz Bingo](https://artifexet.github.io/Bingo/)** · **[Plansze do druku](https://artifexet.github.io/Bingo/?sheet=print&level=beginner&lang=pl)**

## Korzystanie

1. Wybierz poziom: **Na dobry początek** lub **Dla znawców**.
2. Otwórz **Plansze do pobrania**. Ustaw liczbę plansz od 1 do 24 oraz układ 1, 2 lub 4 plansz na stronie A4.
3. Pobierz PDF albo otwórz podgląd do drukowania. Drukuj jednostronnie w skali 100%; układy z kilkoma planszami zawierają linie cięcia.
4. Losuj kategorie, słuchaj muzyki i zaznaczaj trafienia na wydrukach. Pełny rząd, kolumna lub przekątna daje Bingo.

Aplikacja ma polską i angielską wersję interfejsu i wydruków. Losowanie jest niezależne w każdej turze. Każda plansza ma siatkę 5 × 5 i pięć kategorii odpowiadających wybranemu poziomowi.

Talie muzyczne i karty QR przygotujesz w [kreatorze Hiciarza](https://artifexet.github.io/Hiciarz/?view=editor). Do uruchamiania muzyki z kart służy [skaner Hiciarza](https://artifexet.github.io/Hiciarz/?view=scanner) lub [aplikacja Android](https://github.com/ArtifexEt/Hiciarz/releases). Bingo działa jako osobne narzędzie prowadzącego i generator plansz.

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
