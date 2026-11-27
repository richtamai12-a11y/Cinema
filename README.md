# Kino

Kino è la mia app personale sul cinema per iPhone: notizie, film in sala in Italia, prossime uscite, dove vederlo in streaming e la lista "Da vedere / Visti".

- `docs/` è l'app (pubblicata con GitHub Pages)
- `worker/` è il piccolo servizio Cloudflare che parla con TMDB e legge i feed RSS

La chiave TMDB non è nel codice: sta solo su Cloudflare, come secret `TMDB_KEY`.

Dati e immagini da [TMDB](https://www.themoviedb.org). Questa app usa l'API di TMDB ma non è approvata né certificata da TMDB. Disponibilità in streaming da JustWatch.
