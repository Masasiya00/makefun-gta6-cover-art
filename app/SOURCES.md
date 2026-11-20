# Sources — VICE HEAT: Leonida Cover Studio

Sample photos bundled under `app/samples/`. All of them are free-licensed.
No Rockstar Games artwork, logo, or font is used anywhere in this project.

| File | Subject | Source | License |
| --- | --- | --- | --- |
| `beach.jpg` | Surfer in a turquoise wave barrel | Unsplash, photo-1502680390469-be75c86b636f | Unsplash License |
| `duo.jpg` | Couple embracing at sunset | Unsplash, photo-1494774157365-9e04c6720e47 | Unsplash License |
| `skyline.jpg` | Ocean Drive, South Beach at night — art deco, palms, neon, taxi | Wikimedia Commons, by chensiyuan | CC BY-SA 4.0 |
| `car.jpg` | Man driving at dusk, city-light bokeh | Unsplash, photo-1449965408869-eaa3f722e40d | Unsplash License |
| `heli.jpg` | Yellow rescue helicopter + red coast-guard boat, winch rescue | Wikimedia Commons, by Letartean | CC BY 3.0 |
| `pool.jpg` | Butterfly swimmer mid-stroke | Unsplash, photo-1530549387789-4c1017266635 | Unsplash License |
| `gator.jpg` | Man pointing at a young alligator, Florida | Flickr, by NathanF | CC BY 2.0 |
| `boulevard.jpg` | Boulevard scene | Not recorded | — |
| `pier.jpg` | Pier scene | Not recorded | — |

About `boulevard.jpg` and `pier.jpg`: their original source URLs were not
recorded — if a source URL is needed, it still has to be traced; nothing was
invented here.

## Font

The display font is **Anton** (SIL Open Font License 1.1), vendored at
`app/fonts/Anton-Regular.ttf` and loaded locally via `@font-face`. No webfont
is fetched at runtime.

## Privacy

Photos a user uploads in the editor are read with `FileReader` and drawn
straight onto the canvas. The app makes no network requests at all, so an
uploaded photo never leaves the user's machine.
