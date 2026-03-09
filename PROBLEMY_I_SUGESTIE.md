# PDF Annotator - Zgloszone problemy i sugestie

Data aktualizacji: 2026-02-18

## Priorytet - funkcjonalne (otwarte)

- [ ] **Przesuwanie obiektu `drawing` (kreska)**
  - Obecnie: jest lepiej, ale ramka przesuwania bywa znacznie obok samego obiektu (kreski).
  - Oczekiwane: ramka i obiekt poruszaja sie spojnie, bez rozjazdu.

- [ ] **Gruba kreska (szczegolnie krzywa)**
  - Obecnie: wizualnie zbyt "pusta", niewystarczajaco wypelniona.
  - Oczekiwane: bardziej pelna, jednolita, lepiej wypelniona kolorem.

- [ ] **Nieplanowane zaznaczanie tekstu PDF**
  - Obecnie: zdarza sie przypadkowe uruchamianie selection tekstu.
  - Oczekiwane: zaznaczanie tylko gdy uzytkownik faktycznie pracuje narzedziem zaznaczania.

- [ ] **Rozjazd zaznaczen `highlight` i `strikeout`**
  - Obecnie: marker i strikeout potrafia zaznaczac obok tekstu.
  - Oczekiwane: zaznaczenie idealnie pokrywa tekst.

## UX / UI (otwarte)

- [ ] **Menu / toolbar**
  - Obecnie: przyciski sa za male.
  - Oczekiwane: bardziej intuicyjne i nowoczesne menu, latwiejsze w uzyciu, wygodniejsze trafianie.

- [ ] **Komentarze KK dla obiektow bez komentarza**
  - Obecnie: obiekty/adnotacje, ktore z zalozenia nie maja komentarza, moga uruchamiac KK.
  - Oczekiwane: takie obiekty nie otwieraja KK i nie generuja zadnych "pseudo-komentarzy" typu:
    - "to jest obiekt/adnotacja, ktora nie uzywa komentarza"
    - ani podobnych placeholderow.

## Kontekst (potwierdzone obserwacje)

- [x] Wersja bazowa: `v91_drag_sync_point_textbox_area_drawing` (backup: 4 OK).
- [x] Palety kolorow w fullscreen: widoczne poprawnie.
- [x] Przesuwanie point/textbox/area: poprawione wzgledem stanu poczatkowego, ale powyzsze problemy nadal do domkniecia.

