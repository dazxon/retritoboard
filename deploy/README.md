# Autodeploy en hanna

| Archivo | Qué es |
| --- | --- |
| `autodeploy.sh` | El ciclo entero (ver su cabecera): gate, `merge --ff-only`, build con la key de Giphy, posterga si hay retro en curso, reglas, publica `dist/` en `gh-pages` y espera la URL pública |
| `retro-activa.mjs` | ¿Hay una sala con 2+ personas en los últimos 5 min? (firebase-admin del checkout + la service account de `~/.config/retritoboard/`) |
| `retritoboard-autodeploy.service` / `.timer` | Cada 10 min, ejecuta `autodeploy.sh` desde `~/apps/retritoboard` |

Hasta el 2026-10-28 los tres vivían en `server-setup`, copiados a `/usr/local/bin` (SDD-2026-067).
Log: `~/apps/retritoboard-deploys.log`.

Instalar o actualizar (en hanna, como agustin):

```bash
cd ~/apps/retritoboard && git pull --ff-only
sudo install -m 644 deploy/retritoboard-autodeploy.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now retritoboard-autodeploy.timer
sudo rm -f /usr/local/bin/retritoboard-autodeploy /usr/local/bin/retritoboard-retro-activa
sudo systemctl start retritoboard-autodeploy && journalctl -u retritoboard-autodeploy -n 20
```
